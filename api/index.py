import sys
import os

# Add the backend folder to python search path
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.append(backend_path)

# Import the FastAPI app instance from backend
from app.main import app
