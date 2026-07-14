import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

logger = logging.getLogger("database")

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

# Attempt to initialize and test the database engine
try:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args
    )
    # Perform a quick connection test to verify write/read availability
    with engine.connect() as conn:
        pass
except Exception as e:
    logger.error(f"Database connection failed for URL: {settings.DATABASE_URL}. Error: {e}. Falling back to default local SQLite database.")
    fallback_url = "sqlite:///./veyanix.db"
    engine = create_engine(
        fallback_url,
        connect_args={"check_same_thread": True} if not fallback_url.startswith("sqlite") else {"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


