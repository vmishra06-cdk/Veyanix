import os
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models import User, File, FileVersion, Task, AuditLog, AnalyticsTelemetry
from app.schemas import UserCreate, FileCreate
from app.auth import get_password_hash
from app.config import settings

# User CRUD
def get_user_by_id(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate, role: str = "developer"):
    hashed_pwd = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_pwd,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

# File & Directory CRUD
def get_file_by_id(db: Session, file_id: str):
    return db.query(File).filter(File.id == file_id).first()

def get_file_by_path(db: Session, owner_id: str, virtual_path: str):
    return db.query(File).filter(File.owner_id == owner_id, File.path == virtual_path).first()

def get_user_files(db: Session, owner_id: str):
    return db.query(File).filter(File.owner_id == owner_id).all()

def create_file(db: Session, file_in: FileCreate, owner_id: str, size: int = 0):
    db_file = File(
        name=file_in.name,
        path=file_in.path,
        is_directory=file_in.is_directory,
        is_encrypted=file_in.is_encrypted,
        owner_id=owner_id,
        size=size
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file

def delete_file(db: Session, file_id: str):
    db_file = db.query(File).filter(File.id == file_id).first()
    if db_file:
        db.delete(db_file)
        db.commit()
        return True
    return False

# File Version CRUD
def create_file_version(db: Session, file_id: str, version_number: int, commit_message: str, content_path: str, created_by: str):
    db_version = FileVersion(
        file_id=file_id,
        version_number=version_number,
        commit_message=commit_message,
        content_path=content_path,
        created_by=created_by
    )
    db.add(db_version)
    
    # Update File size and updated timestamp
    db_file = db.query(File).filter(File.id == file_id).first()
    if db_file and os.path.exists(content_path):
        db_file.size = os.path.getsize(content_path)
    
    db.commit()
    db.refresh(db_version)
    return db_version

def get_file_versions(db: Session, file_id: str):
    return db.query(FileVersion).filter(FileVersion.file_id == file_id).order_by(desc(FileVersion.version_number)).all()

# Task CRUD
def create_task(db: Session, name: str, input_data: dict = None):
    db_task = Task(
        name=name,
        status="pending",
        progress=0,
        input_data=input_data
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def get_task(db: Session, task_id: str):
    return db.query(Task).filter(Task.id == task_id).first()

def get_all_tasks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Task).order_by(desc(Task.created_at)).offset(skip).limit(limit).all()

def update_task(db: Session, task_id: str, status: str = None, progress: int = None, result_data: dict = None, error: str = None):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if db_task:
        if status:
            db_task.status = status
        if progress is not None:
            db_task.progress = progress
        if result_data is not None:
            db_task.result_data = result_data
        if error is not None:
            db_task.error = error
        db.commit()
        db.refresh(db_task)
    return db_task

# Audit Logs
def create_audit_log(db: Session, user_id: str, action: str, details: dict = None, ip_address: str = None):
    db_log = AuditLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip_address
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_audit_logs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(AuditLog).order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

# Telemetry
def record_telemetry(db: Session, metric_name: str, metric_value: float):
    db_tel = AnalyticsTelemetry(
        metric_name=metric_name,
        metric_value=metric_value
    )
    db.add(db_tel)
    db.commit()
    db.refresh(db_tel)
    return db_tel

def get_recent_telemetry(db: Session, metric_name: str, limit: int = 30):
    return db.query(AnalyticsTelemetry)\
        .filter(AnalyticsTelemetry.metric_name == metric_name)\
        .order_by(desc(AnalyticsTelemetry.timestamp))\
        .limit(limit)\
        .all()
