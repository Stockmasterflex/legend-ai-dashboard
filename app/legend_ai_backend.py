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
from pydantic import BaseModel, Field
from starlette.middleware.base import BaseHTTPMiddleware
import logging
from .config import allowed_origins, mock_enabled
from .flags import get_flags
from .cache import cache_get, cache_set
from .db_queries import fetch_patterns, get_status

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


class PatternItem(BaseModel):
    ticker: str
    pattern: str
    as_of: str
    confidence: float | None = Field(default=None)
    rs: float | None = Field(default=None)
    price: float | None = Field(default=None)
    meta: dict | None = Field(default=None)


class PaginatedPatterns(BaseModel):
    items: list[PatternItem]
    next: str | None


@v1.get("/patterns/all", response_model=PaginatedPatterns)
def patterns_all_v1(
    response: Response,
    limit: int = Query(100, ge=1, le=500),
    cursor: str | None = None,
):
    """Return latest patterns with cursor pagination.

    Ordered by (as_of DESC, ticker ASC). Cursor encodes last (as_of, ticker).
    """
    response.headers["Cache-Control"] = "public, max-age=30"

    flags = get_flags()
    cache_key = f"v1:patterns:all:{limit}:{cursor or ''}"
    if "cache" in flags:
        cached = cache_get(cache_key)
        if cached:
            return cached

    try:
        from .db import engine  # type: ignore
        items, next_cursor = fetch_patterns(engine, limit=limit, cursor=cursor)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail={"code": "db_error", "message": str(exc)})

    payload = {"items": items, "next": next_cursor}
    if "cache" in flags:
        cache_set(cache_key, payload, ttl=60)
    return payload


class StatusModel(BaseModel):
    last_scan_time: str | None
    rows_total: int
    patterns_daily_span_days: int | None
    version: str


@v1.get("/meta/status", response_model=StatusModel)
def meta_status_v1() -> StatusModel:
    try:
        from .db import engine  # type: ignore
        status = get_status(engine)
    except Exception:
        # graceful when DB unavailable
        status = {"last_scan_time": None, "rows_total": 0, "patterns_daily_span_days": None, "version": "0.1.0"}
    return StatusModel(**status)


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

