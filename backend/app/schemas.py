import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any, List

# JWT Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    user_id: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[str] = None

# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: str
    role: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# File schemas
class FileBase(BaseModel):
    name: str
    path: str
    is_directory: bool = False
    is_encrypted: bool = False

class FileCreate(FileBase):
    pass

class FileResponse(FileBase):
    id: str
    size: int
    owner_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# File Version schemas
class FileVersionResponse(BaseModel):
    id: str
    file_id: str
    version_number: int
    commit_message: Optional[str] = None
    created_by: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Code Sandbox schemas
class CodeRunRequest(BaseModel):
    language: str
    code: str
    input_data: Optional[str] = ""

class CodeRunResponse(BaseModel):
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    execution_time_ms: float
    memory_usage_kb: float

# Task schemas
class TaskCreate(BaseModel):
    name: str
    input_data: Optional[dict[str, Any]] = None

class TaskResponse(BaseModel):
    id: str
    name: str
    status: str
    progress: int
    input_data: Optional[dict[str, Any]] = None
    result_data: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# Audit Log schema
class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    action: str
    ip_address: Optional[str]
    details: Optional[dict[str, Any]]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Analytics telemetry schema
class AnalyticsResponse(BaseModel):
    metric_name: str
    metric_value: float
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# AI Chat & RAG schemas
class AIChatRequest(BaseModel):
    message: str
    rag_files: Optional[List[str]] = Field(default_factory=list)

class AIChatResponse(BaseModel):
    response: str
    sources_used: List[str]
    semantic_links: List[dict[str, Any]]
