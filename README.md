# Veyanix: Autonomous Intelligence Platform (Web OS)

Veyanix is a production-grade personal cloud operating system (Web OS) that showcases advanced Computer Science concepts across distributed systems, networking, databases, sandboxed code execution, cybersecurity, and artificial intelligence.

## Core Features
1. **Cloud operating system Workspace**: Sleek floating glassmorphism window manager in React, TypeScript, and Tailwind supporting drags, resizes, minimizes, and focus stacking.
2. **Online Sandboxed IDE**: Monaco Editor supporting Python and Node.js rurtimes, executing code in restricted subprocesses capped at 5s execution and 64MB memory bounds.
3. **AI Chat & Vector RAG**: Custom vector search database built using NumPy cosine similarity and TF-IDF chunk indexing, providing RAG context searches.
4. **Real-time Collaboration**: WebSocket multiplayer rooms syncing keypresses, cursor coordinate tracking, and room chats.
5. **Analytics Dashboard**: Performance telemetry charts showing live CPU/RAM metrics and predictive capacity trends.
6. **Task Workers Queue**: Asynchronous producer-consumer task queue dispatching maintenance tasks and calculations in background threads.
7. **Security Center**: Static Application Security Testing (SAST) scanning code blocks for vulnerability threats, RBAC controls, and secure Audit Trails.

---

## Technical Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Redux Toolkit, Recharts, Monaco Editor.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy (SQLite/PostgreSQL compatible), WebSockets, Cryptography, NumPy, Uvicorn.
- **DevOps**: Docker, Docker Compose, Docker Multi-stage builds.

---

## Quick Start Setup (Zero Configuration)

### Method 1: Docker Compose (Recommended)
Launch the complete application environment (both frontend and backend containers) with a single command:
```bash
docker-compose up --build
```
- Frontend will be hosted at: `http://localhost:5173`
- Backend API will be hosted at: `http://localhost:8000`

---

### Method 2: Manual Local Running (Separate Processes)

#### 1. Start the Backend API
Navigate to the `backend` directory, install requirements, and run the FastAPI server:
```bash
cd backend
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install requirements and boot
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Start the Frontend App
Open a separate terminal, navigate to the `frontend` directory, install node packages, and run the development compiler:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Pre-seeded Credentials
On database startup, Veyanix provisions default accounts:
- **Developer Account** (Standard file explorer and coding workspace):
  - **Username**: `developer`
  - **Password**: `dev123`
- **Administrator Account** (Unlocks the Security Center Audit logs trail):
  - **Username**: `admin`
  - **Password**: `admin123`

---

## Project Documentation Deep Dive
Check out [DOCUMENTATION.md](file:///Users/vedantmishra/Downloads/Veyanix/DOCUMENTATION.md) for:
- Mapping of all modules to computer science engineering concepts.
- Complete backend API listings and schema structures.
- Copy-paste ready resume templates for software engineering roles.
