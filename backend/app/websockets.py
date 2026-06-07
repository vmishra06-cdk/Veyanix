import asyncio
import json
import logging
from typing import Dict, Set, List
from fastapi import WebSocket

logger = logging.getLogger("websockets")

class ConnectionManager:
    def __init__(self):
        # active_connections: global list of sockets
        self.active_connections: List[WebSocket] = []
        
        # room_connections: room_id -> set of sockets
        self.room_connections: Dict[str, Set[WebSocket]] = {}
        
        # client_details: socket -> client metadata (username, etc)
        self.client_details: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, client_id: str, room_id: str = None, username: str = "Anonymous"):
        """Accepts socket connection and adds it to appropriate channels."""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.client_details[websocket] = {"client_id": client_id, "username": username, "room_id": room_id}
        
        if room_id:
            if room_id not in self.room_connections:
                self.room_connections[room_id] = set()
            self.room_connections[room_id].add(websocket)
            
            # Broadcast join notification to room members
            await self.broadcast_to_room(
                room_id,
                {
                    "type": "USER_JOINED",
                    "data": {
                        "client_id": client_id,
                        "username": username,
                        "active_users": [self.client_details[ws]["username"] for ws in self.room_connections[room_id]]
                    }
                },
                exclude_socket=websocket
            )
        logger.info(f"Client {client_id} ({username}) connected to room '{room_id}'")

    async def disconnect(self, websocket: WebSocket):
        """Closes socket connection, cleans up pools, and notifies room members."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        details = self.client_details.pop(websocket, None)
        if details:
            client_id = details["client_id"]
            username = details["username"]
            room_id = details["room_id"]
            
            if room_id and room_id in self.room_connections:
                self.room_connections[room_id].discard(websocket)
                if not self.room_connections[room_id]:
                    del self.room_connections[room_id]
                else:
                    # Broadcast leave notification
                    await self.broadcast_to_room(
                        room_id,
                        {
                            "type": "USER_LEFT",
                            "data": {
                                "client_id": client_id,
                                "username": username,
                                "active_users": [self.client_details[ws]["username"] for ws in self.room_connections[room_id]]
                            }
                        }
                    )
            logger.info(f"Client {client_id} disconnected.")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Sends serialized payload to a specific socket connection."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending socket message: {str(e)}")

    async def broadcast(self, message: dict):
        """Sends serialized payload to all active connections globally."""
        payload = json.dumps(message)
        disconnected_sockets = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected_sockets.append(connection)
                
        # Clean up failed sockets
        for ws in disconnected_sockets:
            await self.disconnect(ws)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_socket: WebSocket = None):
        """Sends serialized payload to all sockets registered in a specific room."""
        if room_id not in self.room_connections:
            return
            
        payload = json.dumps(message)
        disconnected_sockets = []
        
        for connection in self.room_connections[room_id]:
            if connection == exclude_socket:
                continue
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected_sockets.append(connection)
                
        # Clean up failed sockets
        for ws in disconnected_sockets:
            await self.disconnect(ws)

manager = ConnectionManager()

# Background telemetry sender loop
async def start_telemetry_broadcast():
    """Periodically fetches and broadcasts simulated host system performance metrics."""
    import random
    while True:
        try:
            await asyncio.sleep(2.0) # Broadcast interval
            if not manager.active_connections:
                continue
                
            # Simulated System Resource Analytics
            cpu_usage = round(random.uniform(15.0, 48.0), 2)
            memory_usage = round(random.uniform(30.0, 72.0), 2)
            disk_usage = 42.4
            
            # Active tasks telemetry
            active_worker_tasks = 0
            from app.task_engine import task_engine
            if task_engine.is_running:
                active_worker_tasks = task_engine.queue.qsize()
                
            payload = {
                "type": "SYSTEM_TELEMETRY",
                "data": {
                    "cpu_usage": cpu_usage,
                    "memory_usage": memory_usage,
                    "disk_usage": disk_usage,
                    "active_tasks": active_worker_tasks,
                    "timestamp": asyncio.get_event_loop().time()
                }
            }
            await manager.broadcast(payload)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Telemetry broadcast exception: {str(e)}")
            await asyncio.sleep(5.0)
