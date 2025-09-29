"""
FastAPI app wrapper for Legend AI API.

This module imports the existing root-level FastAPI app from
`legend_ai_backend.py`, applies standardized observability (JSON logging,
optional Sentry), config-driven CORS, and exposes `/healthz` and `/readyz`.

Keeping this wrapper allows Render to run `uvicorn app.legend_ai_backend:app`
without duplicating business logic.
"""

import os
import uuid
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, APIRouter, Query, Response, HTTPException, Request
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
import logging
from .config import allowed_origins, mock_enabled

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
ALLOWED_ORIGINS = allowed_origins()

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


# ---------------------------
# API v1 router and middleware
# ---------------------------

class Error(BaseModel):
    code: str
    message: str


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        rid = request.headers.get("x-request-id") or str(uuid.uuid4())
        response = await call_next(request)
        response.headers["x-request-id"] = rid
        return response


try:
    app.add_middleware(RequestIdMiddleware)
except Exception:
    pass


v1 = APIRouter(prefix="/v1", tags=["v1"])


@v1.get("/patterns/all")
def patterns_all_v1(
    response: Response,
    limit: int = Query(100, ge=1, le=500),
    cursor: str | None = None,
):
    # Set short cache to reduce thrash
    response.headers["Cache-Control"] = "public, max-age=30"
    # Placeholder passthrough to avoid breaking: adapt to real service later
    return {"items": [], "next": None}


app.include_router(v1)


# Security headers (optional, no-op if lib missing)
try:
    from secure import Secure  # type: ignore

    secure = Secure()

    @app.middleware("http")
    async def set_secure_headers(request, call_next):
        resp = await call_next(request)
        # FastAPI integration helper
        secure.framework.fastapi(resp)  # type: ignore[attr-defined]
        return resp
except Exception:
    pass


# Boot log
try:
    logging.info("legend-api boot", extra={"module": "legend-api", "port_env": os.getenv("PORT"), "mock": mock_enabled()})
except Exception:
    pass

# Warn if DATABASE_URL missing (non-fatal for /healthz)
try:
    from .config import get_database_url  # lazy import

    try:
        _ = get_database_url()
    except Exception as db_exc:  # pragma: no cover
        logging.error("database url missing or invalid", extra={"error": str(db_exc)})
except Exception:
    pass

