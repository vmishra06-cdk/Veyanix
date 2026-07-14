# Vercel entrypoint for backend-only deployment
import sys
import os

# Ensure the parent folder is in the python search path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from app.main import app

