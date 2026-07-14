import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# If using SQLite, allow multi-threading access safely for development and ensure the directory exists
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Extract file path from sqlite:///...
    db_path = settings.DATABASE_URL.split("sqlite:///")[-1]
    # If it is an absolute path (starts with /), ensure the directory exists
    if db_path.startswith("/"):
        db_dir = os.path.dirname(db_path)
    else:
        db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir:
        try:
            os.makedirs(db_dir, exist_ok=True)
        except Exception:
            pass

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

