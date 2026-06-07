# Veyanix: Autonomous Intelligence Platform - Technical Report

Veyanix is a production-grade personal cloud operating system (Web OS) that showcases advanced Computer Science Engineering principles across distributed systems, networking, database management, sandbox isolation, data analytics, cybersecurity, and artificial intelligence.

---

## 1. Architectural Architecture & Design Justifications

```
                       [ USER BROWSER ]
                              │
                    HTTPS/WSS │ (API Gateway / WS Channels)
                              ▼
                   [ FASTAPI BACKEND MICROSERVICE ]
                              │
    ┌─────────────────────────┼─────────────────────────┐
    ▼                         ▼                         ▼
 [SQLITE/POSTGRES]    [VIRTUAL STORAGE]       [CUSTOM VECTOR STORE]
 (ACID Metadata)      (Encrypted Blocks)      (NumPy Similarity Search)
                              │
                              ▼
                   [ ASYNC TASK TELEMETRY ]
                   (Queue Worker Daemon)
```

### Key Technical Decisions & Patterns:
1. **Separation of Virtual Structure & Physical Blocks (Cloud Storage)**:
   - *Design Decision*: The metadata (hierarchy, ownership, encryption salts) is stored in the database. The actual file bytes are saved under unique UUID names in physical storage.
   - *CS Principle*: Mimics distributed object storage (like AWS S3). Prevents file path traversal vulnerabilities, eliminates file-name collision risks, and enables versioning logs without duplicating physical block storage space.
2. **Double-Ended WebSocket Multiplexing (Computer Networks)**:
   - *Design Decision*: We use WebSocket channels multiplexed via a stateful `ConnectionManager`. It splits connections into localized collaboration rooms (General, IDE, Design) while broadcasting system telemetry globally.
   - *CS Principle*: Utilizes full-duplex TCP socket connections, minimizing overhead relative to HTTP polling loops.
3. **Subprocess isolation with OS Resource Constraints (Operating Systems)**:
   - *Design Decision*: Program scripts run in separate sub-processes under soft/hard limits enforced through UNIX `resource.setrlimit`.
   - *CS Principle*: Process containment. Ensures that execution infinite-loops (`while True: pass`) or memory-bombs do not starve the host system resources, demonstrating operating system process scheduling controls.
4. **NumPy Flat Vector Cosine Indexes (Information Retrieval)**:
   - *Design Decision*: Vector indexing uses dense embeddings when online, and custom-written tokenizers + TF-IDF matrix multiplications in NumPy when offline.
   - *CS Principle*: Math-driven cosine similarity. Rather than black-boxing vector similarity searches, we compute dot products and Euclidean norms manually, demonstrating vector space modeling from scratch.

---

## 2. Core Modules & Computer Science Mapping

| Module Name | Computer Science Concept | Technical Execution |
| :--- | :--- | :--- |
| **Cloud Storage** | Virtual Filesystems & Crypto | Cryptographic key derivation (PBKDF2HMAC + Fernet AES-256) using owner password hash and random salts. Git-like version tree indexes. |
| **Sandbox IDE** | Process & Resource Control | Subprocess forks and OS-level limits (`RLIMIT_AS` memory capping, `RLIMIT_CPU` timing limits). captures millisecond execution times. |
| **AI Assistant (RAG)** | Data Science & Information Retrieval | Cosine similarity calculations ($A \cdot B / \|A\|\|B\|$) on token indices. Dense/Sparse index mappings and Knowledge Graph nodes construction. |
| **Task Queue** | Concurrency & Queueing | Asynchronous worker loops (`asyncio.Queue`) utilizing Producer-Consumer patterns. Background thread workers and database synchronization. |
| **Telemetry Board** | Web Systems & Analytics | Pub-sub WebSocket messaging streams, telemetry state aggregation, and linear regression trend forecasting. |
| **Security Center** | Cybersecurity & Auditing | Regular expression Static Application Security Testing (SAST) scanning for code vulnerabilities. Role-Based Access Control (RBAC) and Audit Trails. |

---

## 3. API Guidebook

All API endpoints are prefixed with `/api/v1`.

### Authentication
- `POST /auth/register`: Receives registration schema, hashes passwords using bcrypt, and creates a user entry.
- `POST /auth/login`: Validates credentials and returns JWT token carrying user role.
- `GET /auth/me`: Decodes active JWT to return owner details.

### Virtual Files
- `GET /files`: Lists files owned by user filtered by current virtual path directory.
- `POST /files/create`: Adds directory markers or blank text file snapshots.
- `POST /files/upload`: Uploads a physical file. Runs AES encryption if active, and increments version indexes.
- `GET /files/download/{file_id}`: Downloads file, performing on-the-fly Fernet decryption.
- `DELETE /files/{file_id}`: Deletes file metadata and physical block arrays.
- `GET /files/{file_id}/versions`: Lists commits logs.
- `POST /files/{file_id}/restore/{version_id}`: Performs version rollback checkpoints.

### Code Execution
- `POST /ide/run`: Run code scripts in restricted sandbox sub-processes.

### AI & Knowledge Graph
- `POST /ai/chat`: Queries the LLM, attaching document context nodes retrieved from vector search.
- `POST /ai/review`: Automated code review.
- `GET /ai/semantic-graph`: Returns nodes and edge maps of document relations.

### Background Tasks
- `POST /tasks/dispatch`: Enqueues worker task jobs.
- `GET /tasks`: Lists historical queue records.

### System Audits
- `POST /security/scan/{file_id}`: Runs regex SAST scanner over code.
- `GET /security/audits`: Fetches audit trail write-ahead logs (Admin only).

---

## 4. Resume-Worthy Project Template

Here is a highly professional, engineering-dense layout ready for resumes:

```markdown
**Veyanix: Autonomous Intelligence Cloud Platform (Web OS)**  
*Advanced Web OS & Distributed Tasks Engine* | Tech Stack: React, TypeScript, Tailwind CSS, Redux, FastAPI, SQLite, NumPy, WebSockets, Docker
- Engineered a modular personal cloud operating system (Web OS) in React and TypeScript featuring window drag-and-resize controllers, virtual file systems, sandboxed IDE, and real-time collaboration.
- Built a secure Sandboxed Code Execution Engine using FastAPI subprocesses, constraining CPU execution times and memory boundaries (64MB) via UNIX-level resource limits to prevent host starvation.
- Developed a custom Vector Database and Retrieval-Augmented Generation (RAG) engine from scratch, utilizing NumPy to compute cosine similarity values across TF-IDF document chunk indexes.
- Programmed a stateful WebSocket multiplexer supporting room isolation for real-time multiplayer code typing, cursor coordinate tracking, and a live host performance telemetry monitor.
- Implemented a secure cryptography block storage manager derived from PBKDF2 key derivations and AES-256 Fernet encryptions, securing cloud documents at rest.
- Designed a static code analysis scanner (SAST) to audit security risk patterns (eval runs, SQL injections, API keys) alongside Role-Based Access Control (RBAC) and Audit log tables.
```
