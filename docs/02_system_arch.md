# System Architecture

- Backend: FastAPI service exposing REST endpoints and websockets.
- Storage: Local SQLite for dev; TimescaleDB on Render for prod.
- Jobs: Daily scanners populate `patterns` and related tables.
- Frontend: Vercel-hosted dashboard consuming API via `NEXT_PUBLIC_API_BASE`.


