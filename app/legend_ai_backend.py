"""
FastAPI app wrapper for Legend AI API.

This module imports the existing root-level FastAPI app from
`legend_ai_backend.py`, applies standardized observability (JSON logging,
optional Sentry), config-driven CORS, and exposes `/healthz` and `/readyz`.

Keeping this wrapper allows Render to run `uvicorn app.legend_ai_backend:app`
without duplicating business logic.
"""

import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

from .observability import setup_json_logging, setup_sentry


# Import the existing FastAPI application defined at repository root
try:
    from legend_ai_backend import app as base_app  # type: ignore
except Exception as import_exc:  # pragma: no cover - defensive import guard
    # Fallback: create a minimal app if import fails so /healthz still works
    base_app = FastAPI(title="Legend AI API (fallback)")


# Observability
setup_json_logging()
app = setup_sentry(base_app)


# CORS middleware with env-driven allowlist
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"ok": True, "version": "0.1.0"}


# Readiness endpoint using a minimal SQLAlchemy engine if available
try:
    from .db import engine  # type: ignore
    from sqlalchemy import text

    @app.get("/readyz")
    def readyz():
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"ok": True}
except Exception:  # pragma: no cover - readiness degrades gracefully
    @app.get("/readyz")
    def readyz():
        return {"ok": False, "reason": "db engine unavailable"}


