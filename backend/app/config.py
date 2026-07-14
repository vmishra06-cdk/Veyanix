import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Veyanix Platform API"
    API_V1_STR: str = "/api/v1"
    
    # Security Configs
    SECRET_KEY: str = Field(default="veyanix_super_secret_signing_key_for_development_jwt_auth_12345", env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # DB Configs
    DATABASE_URL: str = Field(default="sqlite:///./veyanix.db", env="DATABASE_URL")
    
    # Gemini AI Configs
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    USE_MOCK_AI: bool = True  # Automatically set to True if GEMINI_API_KEY is not set
    
    # File Storage & Sandbox Directory
    WORKSPACE_DIR: str = Field(default="./veyanix_workspace", env="WORKSPACE_DIR")
    SANDBOX_DIR: str = Field(default="./veyanix_sandbox", env="SANDBOX_DIR")
    
    # Sandbox Restrictions
    SANDBOX_TIMEOUT_SECONDS: int = 5
    SANDBOX_MAX_MEMORY_MB: int = 64
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Post-processing to toggle mock mode if key is missing
if settings.GEMINI_API_KEY:
    settings.USE_MOCK_AI = False
else:
    settings.USE_MOCK_AI = True

# Ensure workspace and sandbox directories exist with local fallbacks if permission denied
try:
    os.makedirs(settings.WORKSPACE_DIR, exist_ok=True)
except Exception:
    settings.WORKSPACE_DIR = "./veyanix_workspace"
    os.makedirs(settings.WORKSPACE_DIR, exist_ok=True)

try:
    os.makedirs(settings.SANDBOX_DIR, exist_ok=True)
except Exception:
    settings.SANDBOX_DIR = "./veyanix_sandbox"
    os.makedirs(settings.SANDBOX_DIR, exist_ok=True)

