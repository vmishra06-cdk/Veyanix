import os
import json
import logging
import base64
import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File as FastAPIFile, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import cryptography
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

from app.config import settings
from app.database import engine, Base, get_db
from app.models import User, File as DBFile, FileVersion, Task, AuditLog
from app.schemas import (
    Token, UserCreate, UserLogin, UserResponse, FileResponse, 
    FileVersionResponse, CodeRunRequest, CodeRunResponse, 
    TaskCreate, TaskResponse, AuditLogResponse, AIChatRequest, AIChatResponse, AnalyticsResponse
)
from app import crud
from app import auth
from app import sandbox
from app import security_scanner
from app import ai
from app import websockets
from app.vector_db import vector_store
from app.task_engine import task_engine

# 1. App Initialization
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Autonomous Intelligence Platform powering a virtual Web OS environment",
    version="1.0.0"
)

# 2. CORS Configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Cryptographic Key Derivation Helpers
def get_encryption_key(password_hash: str, salt_hex: str) -> bytes:
    """Derives a safe 32-byte Fernet key from password hash and a unique file salt."""
    salt_bytes = bytes.fromhex(salt_hex)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt_bytes,
        iterations=1000
    )
    # Ensure URL safe base64 encoding for Fernet
    return base64.urlsafe_b64encode(kdf.derive(password_hash.encode()))

# 4. FastAPI Startup Hooks
@app.on_event("startup")
async def startup_event():
    # A. Build Database Metadata Tables
    Base.metadata.create_all(bind=engine)
    
    # B. Bind Task Engine WebSocket callback and run daemon
    task_engine.set_broadcast_callback(websockets.manager.broadcast)
    await task_engine.start()
    
    # C. Run System Telemetry WebSocket broadcast daemon
    import asyncio
    asyncio.create_task(websockets.start_telemetry_broadcast())
    
    # D. Seed Initial System Roles in Database
    db: Session = next(get_db())
    try:
        # Check and seed admin
        admin_user = crud.get_user_by_username(db, "admin")
        if not admin_user:
            crud.create_user(
                db, 
                UserCreate(username="admin", email="admin@veyanix.io", password="admin123"), 
                role="admin"
            )
            
        # Check and seed developer
        dev_user = crud.get_user_by_username(db, "developer")
        if not dev_user:
            crud.create_user(
                db, 
                UserCreate(username="developer", email="dev@veyanix.io", password="dev123"), 
                role="developer"
            )
            
        # Write generic workspace templates if they do not exist
        os.makedirs(settings.WORKSPACE_DIR, exist_ok=True)
    finally:
        db.close()

@app.on_event("shutdown")
async def shutdown_event():
    await task_engine.stop()

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.post(f"{settings.API_V1_STR}/auth/register", response_model=UserResponse)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, user_in.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    db_email = crud.get_user_by_email(db, user_in.email)
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = crud.create_user(db, user_in, role="developer")
    crud.create_audit_log(db, new_user.id, "USER_REGISTER", {"username": new_user.username})
    return new_user

@app.post(f"{settings.API_V1_STR}/auth/login", response_model=Token)
def login_user(user_in: UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, user_in.username)
    if not db_user or not auth.verify_password(user_in.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    access_token = auth.create_access_token(
        data={"sub": db_user.username, "role": db_user.role, "user_id": db_user.id}
    )
    crud.create_audit_log(db, db_user.id, "USER_LOGIN", {"username": db_user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user.role,
        "username": db_user.username,
        "user_id": db_user.id
    }

@app.get(f"{settings.API_V1_STR}/auth/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(auth.get_current_user)):
    return current_user

# ==================== VIRTUAL FILE SYSTEM ENDPOINTS ====================

@app.get(f"{settings.API_V1_STR}/files", response_model=List[FileResponse])
def list_files(
    path: str = "/", 
    db: Session = Depends(get_db), 
    current_user: User = Depends(auth.get_current_user)
):
    """Lists files owned by user within a specific folder path."""
    all_files = crud.get_user_files(db, owner_id=current_user.id)
    # Filter files belonging directly to the requested folder path
    # e.g., if path is "/", files should be like "/readme.txt" or "/docs" but not "/docs/data.csv"
    filtered = []
    normalized_path = path if path.endswith("/") else path + "/"
    
    for f in all_files:
        if path == "/":
            # Files at root shouldn't contain other slashes after the first character
            rel_path = f.path[1:]
            if "/" not in rel_path or (f.is_directory and rel_path.count("/") == 1 and rel_path.endswith("/")):
                filtered.append(f)
        else:
            if f.path.startswith(normalized_path) and f.path != normalized_path:
                rel_path = f.path[len(normalized_path):]
                if "/" not in rel_path or (f.is_directory and rel_path.count("/") == 1 and rel_path.endswith("/")):
                    filtered.append(f)
    return filtered

@app.post(f"{settings.API_V1_STR}/files/create", response_model=FileResponse)
def create_virtual_file(
    name: str = Form(...),
    path: str = Form(...), # virtual path
    is_directory: bool = Form(False),
    is_encrypted: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Creates a virtual directory folder or an empty text file placeholder."""
    # Check if duplicate exists
    existing = crud.get_file_by_path(db, owner_id=current_user.id, virtual_path=path)
    if existing:
        raise HTTPException(status_code=400, detail="Path already exists in workspace")
        
    db_file = DBFile(
        name=name,
        path=path,
        is_directory=is_directory,
        is_encrypted=is_encrypted,
        owner_id=current_user.id,
        size=0
    )
    
    if is_encrypted:
        import uuid
        db_file.encryption_key_salt = os.urandom(16).hex()
        
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    # If file, create initial version empty snapshot
    if not is_directory:
        content_id = str(uuid.uuid4())
        content_path = os.path.join(settings.WORKSPACE_DIR, content_id)
        
        # Write blank content
        empty_data = b""
        if is_encrypted:
            key = get_encryption_key(current_user.password_hash, db_file.encryption_key_salt)
            fernet = Fernet(key)
            empty_data = fernet.encrypt(empty_data)
            
        with open(content_path, "wb") as f:
            f.write(empty_data)
            
        crud.create_file_version(
            db, 
            file_id=db_file.id, 
            version_number=1, 
            commit_message="Initial empty file created", 
            content_path=content_path, 
            created_by=current_user.id
        )
        # Add index record for RAG
        vector_store.add_document(
            doc_id=db_file.id,
            title=db_file.name,
            content="",
            metadata={"path": db_file.path, "owner_id": current_user.id}
        )
        
    crud.create_audit_log(db, current_user.id, "FILE_CREATE", {"name": name, "path": path, "is_dir": is_directory})
    return db_file

@app.post(f"{settings.API_V1_STR}/files/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    path: str = Form(...),
    is_encrypted: bool = Form(False),
    commit_message: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Uploads a physical file, executes AES-256 encrypt protocols if toggled, and updates versions."""
    import uuid
    file_bytes = await file.read()
    
    # Check if virtual file metadata already exists
    db_file = crud.get_file_by_path(db, owner_id=current_user.id, virtual_path=path)
    is_new = False
    
    if not db_file:
        is_new = True
        db_file = DBFile(
            name=file.filename,
            path=path,
            is_directory=False,
            is_encrypted=is_encrypted,
            owner_id=current_user.id
        )
        if is_encrypted:
            db_file.encryption_key_salt = os.urandom(16).hex()
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
    # Calculate version index
    version_num = 1
    if not is_new:
        versions = crud.get_file_versions(db, file_id=db_file.id)
        if versions:
            version_num = versions[0].version_number + 1
            
    # Process physical storage encryption protocols
    content_id = str(uuid.uuid4())
    content_path = os.path.join(settings.WORKSPACE_DIR, content_id)
    
    raw_content_to_index = ""
    try:
        raw_content_to_index = file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        pass
        
    if db_file.is_encrypted:
        key = get_encryption_key(current_user.password_hash, db_file.encryption_key_salt)
        fernet = Fernet(key)
        file_bytes = fernet.encrypt(file_bytes)
        
    # Write encrypted/plaintext payload to physical disk
    with open(content_path, "wb") as f:
        f.write(file_bytes)
        
    # Save FileVersion relation
    commit_msg = commit_message or f"Uploaded version {version_num}"
    crud.create_file_version(
        db,
        file_id=db_file.id,
        version_number=version_num,
        commit_message=commit_msg,
        content_path=content_path,
        created_by=current_user.id
    )
    
    # Index text files into our Custom Vector DB for RAG processing
    # Skip if file size is massive or binary
    if len(file_bytes) < 1024 * 1024 and not file.filename.endswith((".png", ".jpg", ".zip", ".pdf")):
        vector_store.add_document(
            doc_id=db_file.id,
            title=db_file.name,
            content=raw_content_to_index,
            metadata={"path": db_file.path, "owner_id": current_user.id}
        )
        
    crud.create_audit_log(
        db, 
        current_user.id, 
        "FILE_UPLOAD", 
        {"name": db_file.name, "path": db_file.path, "version": version_num, "encrypted": db_file.is_encrypted}
    )
    return db_file

@app.get(f"{settings.API_V1_STR}/files/download/{{file_id}}")
def download_file(
    file_id: str,
    version_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Downloads a file, automatically decrypting on-the-fly if owner keys are verified."""
    db_file = crud.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File metadata not found")
        
    if db_file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied. File owner credentials required.")
        
    # Get physical path of file version
    versions = crud.get_file_versions(db, file_id=file_id)
    if not versions:
        raise HTTPException(status_code=404, detail="No versions available for this file")
        
    target_version = versions[0] # Default to latest version
    if version_id:
        match = [v for v in versions if v.id == version_id]
        if not match:
            raise HTTPException(status_code=404, detail="Specific file version not found")
        target_version = match[0]
        
    if not os.path.exists(target_version.content_path):
        raise HTTPException(status_code=404, detail="Physical file storage block not found on disk")
        
    with open(target_version.content_path, "rb") as f:
        file_bytes = f.read()
        
    # Decrypt cipher block if file encryption is set
    if db_file.is_encrypted:
        try:
            key = get_encryption_key(current_user.password_hash, db_file.encryption_key_salt)
            fernet = Fernet(key)
            file_bytes = fernet.decrypt(file_bytes)
        except cryptography.fernet.InvalidToken:
            raise HTTPException(status_code=400, detail="Decryption failure. Cryptographic verification keys mismatch.")
            
    # Return raw text file contents or structured media payload
    # Let's decode if text for simpler client reading, else return base64 / streaming
    try:
        decoded_text = file_bytes.decode("utf-8")
        return {"id": db_file.id, "name": db_file.name, "path": db_file.path, "is_text": True, "content": decoded_text}
    except UnicodeDecodeError:
        # Binary encoded fallback
        encoded_b64 = base64.b64encode(file_bytes).decode("utf-8")
        return {"id": db_file.id, "name": db_file.name, "path": db_file.path, "is_text": False, "content": encoded_b64}

@app.delete(f"{settings.API_V1_STR}/files/{{file_id}}")
def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    db_file = crud.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    if db_file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Remove from physical disk version paths
    versions = crud.get_file_versions(db, file_id=file_id)
    for v in versions:
        if os.path.exists(v.content_path):
            try:
                os.remove(v.content_path)
            except OSError:
                pass
                
    crud.delete_file(db, file_id)
    # Remove from vector store
    vector_store.chunks = [c for c in vector_store.chunks if c["doc_id"] != file_id]
    vector_store.documents.pop(file_id, None)
    vector_store.save()
    
    crud.create_audit_log(db, current_user.id, "FILE_DELETE", {"name": db_file.name, "path": db_file.path})
    return {"status": "success", "message": f"Deleted file '{db_file.name}'"}

@app.get(f"{settings.API_V1_STR}/files/{{file_id}}/versions", response_model=List[FileVersionResponse])
def get_file_version_history(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    db_file = crud.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
    if db_file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    return crud.get_file_versions(db, file_id=file_id)

@app.post(f"{settings.API_V1_STR}/files/{{file_id}}/restore/{{version_id}}")
def restore_file_version(
    file_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Restores/Rolls back file to target version by creating a new latest version pointing to that snapshot."""
    db_file = crud.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    if db_file.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
        
    versions = crud.get_file_versions(db, file_id=file_id)
    match = [v for v in versions if v.id == version_id]
    if not match:
        raise HTTPException(status_code=404, detail="Version not found")
        
    target_v = match[0]
    latest_v_num = versions[0].version_number + 1
    
    # Create duplicate version entry pointing to same storage block
    # (Avoids duplicating storage block on disk!)
    new_v = crud.create_file_version(
        db,
        file_id=file_id,
        version_number=latest_v_num,
        commit_message=f"Rollback to version {target_v.version_number}",
        content_path=target_v.content_path,
        created_by=current_user.id
    )
    
    crud.create_audit_log(db, current_user.id, "FILE_RESTORE", {"name": db_file.name, "version": target_v.version_number})
    return {"status": "success", "restored_version": new_v.version_number}

# ==================== ONLINE IDE ENDPOINTS ====================

@app.post(f"{settings.API_V1_STR}/ide/run", response_model=CodeRunResponse)
def execute_sandbox_code(
    req: CodeRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Runs input script code inside sandboxed subprocess, capturing exit states and telemetry."""
    result = sandbox.run_in_sandbox(req.language, req.code, req.input_data)
    
    crud.create_audit_log(
        db, 
        current_user.id, 
        "CODE_EXECUTE", 
        {"language": req.language, "success": result["success"], "time_ms": result["execution_time_ms"]}
    )
    return result

# ==================== AI CORE & KNOWLEDGE GRAPH ENDPOINTS ====================

@app.post(f"{settings.API_V1_STR}/ai/chat", response_model=AIChatResponse)
def chat_assistant(
    req: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    return ai.generate_ai_chat_response(req.message, req.rag_files, db)

@app.post(f"{settings.API_V1_STR}/ai/review")
def review_workspace_code(
    file_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    db_file = crud.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    versions = crud.get_file_versions(db, file_id=file_id)
    if not versions:
        raise HTTPException(status_code=404, detail="File is empty")
        
    # Download content bytes
    with open(versions[0].content_path, "rb") as f:
        file_bytes = f.read()
        
    if db_file.is_encrypted:
        key = get_encryption_key(current_user.password_hash, db_file.encryption_key_salt)
        fernet = Fernet(key)
        file_bytes = fernet.decrypt(file_bytes)
        
    code_text = file_bytes.decode("utf-8", errors="ignore")
    review = ai.generate_code_review(db_file.name, code_text)
    
    crud.create_audit_log(db, current_user.id, "AI_CODE_REVIEW", {"file": db_file.name})
    return review

@app.get(f"{settings.API_V1_STR}/ai/semantic-graph")
def get_semantic_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Constructs a semantic graph representation of user files for Knowledge Graph visualization."""
    files = crud.get_user_files(db, owner_id=current_user.id)
    file_ids = [f.id for f in files if not f.is_directory]
    
    nodes = [{"id": f.id, "label": f.name, "type": "directory" if f.is_directory else "file", "path": f.path} for f in files]
    edges = ai.get_semantic_edges(file_ids)
    
    return {"nodes": nodes, "edges": edges}

# ==================== DISTRIBUTED TASK QUEUE ENDPOINTS ====================

@app.post(f"{settings.API_V1_STR}/tasks/dispatch", response_model=TaskResponse)
async def dispatch_background_task(
    req: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Creates a background task, inserts status to db, and dispatches to asyncio queue worker."""
    db_task = crud.create_task(db, name=req.name, input_data=req.input_data)
    await task_engine.dispatch(db_task.id, req.name, req.input_data)
    
    crud.create_audit_log(db, current_user.id, "TASK_DISPATCH", {"task_name": req.name, "task_id": db_task.id})
    return db_task

@app.get(f"{settings.API_V1_STR}/tasks", response_model=List[TaskResponse])
def get_task_history(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    return crud.get_all_tasks(db, skip, limit)

# ==================== SECURITY & AUDITING ENDPOINTS ====================

post_scan_url = f"{settings.API_V1_STR}/security/scan/{{file_id}}"
@app.post(post_scan_url)
def scan_file_security(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Statically scans a workspace code file for vulnerable lines, credentials, and coding flaws."""
    db_file = crud.get_file_by_id(db, file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    versions = crud.get_file_versions(db, file_id=file_id)
    if not versions:
        raise HTTPException(status_code=404, detail="File version not found")
        
    with open(versions[0].content_path, "rb") as f:
        file_bytes = f.read()
        
    if db_file.is_encrypted:
        key = get_encryption_key(current_user.password_hash, db_file.encryption_key_salt)
        fernet = Fernet(key)
        file_bytes = fernet.decrypt(file_bytes)
        
    code_text = file_bytes.decode("utf-8", errors="ignore")
    
    # Execute static regex SAST scan
    scan_results = security_scanner.scan_code_content(db_file.name, code_text)
    
    # Log audit
    crud.create_audit_log(
        db, 
        current_user.id, 
        "SECURITY_SCAN", 
        {"file": db_file.name, "score": scan_results["health_score"], "threats": scan_results["threat_count"]}
    )
    return scan_results

@app.get(f"{settings.API_V1_STR}/security/audits", response_model=List[AuditLogResponse])
def get_audit_trail_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Returns absolute logs audit history trail (Admin only access verification)."""
    # Enforce Admin Role checking
    checker = auth.RoleChecker(allowed_roles=["admin"])
    checker(current_user) # Raises 403 if check fails
    
    return crud.get_audit_logs(db, skip, limit)

# ==================== WEBSOCKET MULTIPLEXER ENDPOINT ====================

@app.websocket("/api/v1/ws/{client_id}/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
    room_id: str,
    username: str = "Anonymous"
):
    """Multiplexes WebSocket channels for chat assistant, collaboration typing, cursor syncs, and telemetry."""
    await websockets.manager.connect(websocket, client_id, room_id, username)
    try:
        while True:
            # Blocks waiting for client payloads
            data_str = await websocket.receive_text()
            message = json.loads(data_str)
            
            m_type = message.get("type")
            m_data = message.get("data", {})
            
            if m_type == "CURSOR_MOVE":
                # Broadcast mouse coordinate pointers
                await websockets.manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "CURSOR_UPDATE",
                        "data": {
                            "client_id": client_id,
                            "username": username,
                            "x": m_data.get("x", 0),
                            "y": m_data.get("y", 0)
                        }
                    },
                    exclude_socket=websocket
                )
                
            elif m_type == "CODE_CHANGE":
                # Broadcast dynamic key press synchronization
                await websockets.manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "CODE_SYNC",
                        "data": {
                            "client_id": client_id,
                            "username": username,
                            "code": m_data.get("code", ""),
                            "cursor": m_data.get("cursor", 0)
                        }
                    },
                    exclude_socket=websocket
                )
                
            elif m_type == "CHAT_MESSAGE":
                # Broadcast chat message to members of collaborative workspace
                await websockets.manager.broadcast_to_room(
                    room_id,
                    {
                        "type": "CHAT_RECEIVE",
                        "data": {
                            "client_id": client_id,
                            "username": username,
                            "message": m_data.get("message", "")
                        }
                    }
                )
                
    except WebSocketDisconnect:
        await websockets.manager.disconnect(websocket)
    except Exception as e:
        logger = logging.getLogger("main_websocket")
        logger.error(f"WebSocket processing exception: {str(e)}")
        await websockets.manager.disconnect(websocket)
