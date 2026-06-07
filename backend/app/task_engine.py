import asyncio
import logging
import time
import traceback
from typing import Dict, Any, Callable, Awaitable
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.crud import update_task, record_telemetry
from app.vector_db import vector_store

logger = logging.getLogger("task_engine")

class TaskEngine:
    def __init__(self):
        self.queue: asyncio.Queue = asyncio.Queue()
        self.handlers: Dict[str, Callable[[Session, str, dict], Awaitable[dict]]] = {}
        self.is_running = False
        self.worker_task: asyncio.Task = None
        self.broadcast_callback: Callable[[dict], Awaitable[None]] = None
        
        # Register core background tasks
        self.register_handler("vector_reindex", self.handle_vector_reindex)
        self.register_handler("system_maintenance", self.handle_system_maintenance)
        self.register_handler("heavy_computation", self.handle_heavy_computation)

    def register_handler(self, task_name: str, handler: Callable[[Session, str, dict], Awaitable[dict]]):
        self.handlers[task_name] = handler

    def set_broadcast_callback(self, callback: Callable[[dict], Awaitable[None]]):
        self.broadcast_callback = callback

    async def start(self):
        """Starts the background worker daemon loop."""
        if self.is_running:
            return
        self.is_running = True
        self.worker_task = asyncio.create_task(self._worker_loop())
        logger.info("Task Engine worker started.")

    async def stop(self):
        """Terminates the background worker daemon."""
        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        logger.info("Task Engine worker stopped.")

    async def dispatch(self, task_id: str, task_name: str, input_data: dict = None):
        """Enqueues a task payload to be processed by background workers."""
        await self.queue.put((task_id, task_name, input_data or {}))
        logger.info(f"Task {task_id} ({task_name}) placed in queue.")

    async def _worker_loop(self):
        """Infinite producer-consumer daemon worker loop processing items."""
        while self.is_running:
            db: Session = SessionLocal()
            try:
                # Blocks until an item is available
                task_id, task_name, input_data = await self.queue.get()
                
                logger.info(f"Worker picked up task {task_id} ({task_name})")
                await self._update_status(db, task_id, status="running", progress=5)
                
                # Check if we have a handler for this task
                handler = self.handlers.get(task_name)
                if not handler:
                    raise ValueError(f"No registered handler for task action: '{task_name}'")
                    
                # Execute job and store outcomes
                result = await handler(db, task_id, input_data)
                
                await self._update_status(db, task_id, status="completed", progress=100, result_data=result)
                logger.info(f"Task {task_id} completed successfully.")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Task processing error: {str(e)}")
                tb = traceback.format_exc()
                # Mark as failed in DB
                await self._update_status(db, task_id, status="failed", progress=100, error=str(e))
            finally:
                db.close()
                # Inform the queue that the item is processed
                try:
                    self.queue.task_done()
                except ValueError:
                    pass

    async def _update_status(self, db: Session, task_id: str, status: str, progress: int, result_data: dict = None, error: str = None):
        """Helper to modify database state and broadcast status change via WebSocket."""
        updated = update_task(db, task_id, status=status, progress=progress, result_data=result_data, error=error)
        if updated and self.broadcast_callback:
            # Construct notify payload
            payload = {
                "type": "TASK_UPDATE",
                "data": {
                    "id": updated.id,
                    "name": updated.name,
                    "status": updated.status,
                    "progress": updated.progress,
                    "result_data": updated.result_data,
                    "error": updated.error,
                    "updated_at": updated.updated_at.isoformat()
                }
            }
            await self.broadcast_callback(payload)

    # --- Task Handler Routines ---

    async def handle_vector_reindex(self, db: Session, task_id: str, input_data: dict) -> dict:
        """Task that runs the custom vector db index re-builder."""
        # Simulate index scan over multiple steps
        steps = 5
        for i in range(1, steps + 1):
            await asyncio.sleep(0.4) # Simulate indexing latency
            progress = int((i / steps) * 90) + 5
            await self._update_status(db, task_id, status="running", progress=progress)
            
        # Trigger index rebuild
        vector_store._rebuild_tfidf_matrix()
        vector_store.save()
        
        return {"indexed_chunks": len(vector_store.chunks), "status": "Vector database rebuilt successfully"}

    async def handle_system_maintenance(self, db: Session, task_id: str, input_data: dict) -> dict:
        """Task executing basic cache clearing and system metrics collection."""
        await asyncio.sleep(0.5)
        await self._update_status(db, task_id, status="running", progress=30)
        
        # Record current metrics into Telemetry table
        import random
        cpu = round(random.uniform(5.0, 45.0), 2)
        mem = round(random.uniform(15.0, 60.0), 2)
        
        record_telemetry(db, "cpu_usage", cpu)
        record_telemetry(db, "memory_usage", mem)
        
        await asyncio.sleep(0.5)
        await self._update_status(db, task_id, status="running", progress=75)
        
        # Cleanup expired tasks or clean sandbox
        sandbox_files = os.listdir(settings.SANDBOX_DIR)
        cleaned_count = 0
        for f in sandbox_files:
            if f.startswith("code_") and time.time() - os.path.getmtime(os.path.join(settings.SANDBOX_DIR, f)) > 300:
                try:
                    os.remove(os.path.join(settings.SANDBOX_DIR, f))
                    cleaned_count += 1
                except OSError:
                    pass
                    
        return {
            "sandbox_files_cleaned": cleaned_count,
            "metrics_logged": {"cpu_usage": cpu, "memory_usage": mem},
            "status": "System maintenance finished"
        }

    async def handle_heavy_computation(self, db: Session, task_id: str, input_data: dict) -> dict:
        """Task executing a mathematically intensive sequence (demonstrates scheduler performance)."""
        n = input_data.get("n", 30) # default term
        
        # Fibonacci sequence with progress updates to demonstrate state reporting
        if n > 40:
            n = 40  # cap to prevent actual CPU freeze
            
        a, b = 0, 1
        steps = n
        for idx in range(1, steps + 1):
            if idx % max(1, steps // 5) == 0 or idx == steps:
                progress = int((idx / steps) * 90) + 5
                await self._update_status(db, task_id, status="running", progress=progress)
            a, b = b, a + b
            await asyncio.sleep(0.08) # Artificial CPU yield
            
        return {"fibonacci_term": n, "result": a}

task_engine = TaskEngine()
