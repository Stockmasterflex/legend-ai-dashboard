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
from pathlib import Path


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


# Database initialization endpoint (one-time use, no auth for now)
@app.post("/admin/init-db")
def init_database_endpoint():
    """Initialize database schema by running SQL migrations. Use once after deploy."""
    try:
        from .db import engine  # type: ignore
        from sqlalchemy import text
        
        migrations_dir = Path(__file__).parent.parent / "migrations" / "sql"
        sql_files = sorted(migrations_dir.glob("*.sql"))
        
        results = []
        for sql_file in sql_files:
            with open(sql_file, "r") as f:
                sql = f.read()
            
            # Split and execute
            statements = [s.strip() for s in sql.split(";") if s.strip()]
            with engine.begin() as conn:
                for stmt in statements:
                    if stmt:
                        try:
                            conn.execute(text(stmt))
                            results.append(f"✓ {sql_file.name}")
                        except Exception as e:
                            results.append(f"⚠ {sql_file.name}: {str(e)[:100]}")
        
        return {"ok": True, "results": results}
    except Exception as e:
        logging.error(f"Database init failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Init failed: {str(e)}")


@app.post("/admin/seed-demo")
def seed_demo_data():
    """Seed the database with mock VCP patterns for testing."""
    try:
        from .db import engine  # type: ignore
        from sqlalchemy import text
        from datetime import datetime, timedelta
        
        # Create 3 mock VCP detections
        mock_patterns = [
            {
                "ticker": "NVDA",
                "pattern": "VCP",
                "as_of": datetime.now() - timedelta(days=2),
                "confidence": 85.5,
                "rs": 92.3,
                "price": 495.22,
                "meta": '{"contractions": 3, "base_depth": 0.18, "pivot": 495.22}'
            },
            {
                "ticker": "PLTR",
                "pattern": "VCP",
                "as_of": datetime.now() - timedelta(days=1),
                "confidence": 78.2,
                "rs": 88.5,
                "price": 28.45,
                "meta": '{"contractions": 4, "base_depth": 0.25, "pivot": 28.45}'
            },
            {
                "ticker": "CRWD",
                "pattern": "VCP",
                "as_of": datetime.now(),
                "confidence": 91.0,
                "rs": 95.1,
                "price": 285.67,
                "meta": '{"contractions": 3, "base_depth": 0.15, "pivot": 285.67}'
            }
        ]
        
        with engine.begin() as conn:
            for pattern in mock_patterns:
                conn.execute(
                    text("""
                        INSERT INTO patterns (ticker, pattern, as_of, confidence, rs, price, meta)
                        VALUES (:ticker, :pattern, :as_of, :confidence, :rs, :price, :meta)
                        ON CONFLICT (ticker, pattern, as_of) DO UPDATE
                        SET confidence=EXCLUDED.confidence, rs=EXCLUDED.rs, price=EXCLUDED.price, meta=EXCLUDED.meta
                    """),
                    pattern
                )
        
        return {"ok": True, "seeded": len(mock_patterns), "patterns": [p["ticker"] for p in mock_patterns]}
    except Exception as e:
        logging.error(f"Seed failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(e)}")


@app.get("/admin/test-data")
def test_data_fetch(ticker: str = Query(default="AAPL")):
    """Test endpoint to check what data we're getting from yfinance."""
    try:
        import yfinance as yf
        import pandas as pd
        
        stock = yf.Ticker(ticker)
        df = stock.history(period="1y")
        
        if df.empty:
            return {"error": "No data returned from yfinance"}
        
        df = df.reset_index()
        
        return {
            "ticker": ticker,
            "rows": len(df),
            "columns": list(df.columns),
            "first_row": df.iloc[0].to_dict() if len(df) > 0 else None,
            "last_row": df.iloc[-1].to_dict() if len(df) > 0 else None,
            "sample_close": float(df['Close'].iloc[-1]) if 'Close' in df.columns else None,
            "sample_volume": float(df['Volume'].iloc[-1]) if 'Volume' in df.columns else None,
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/admin/run-scan")
def run_scan_endpoint(limit: int = Query(default=7, ge=1, le=20)):
    """Trigger a scan for VCP patterns on a limited set of tickers."""
    try:
        import sys
        from pathlib import Path
        from datetime import datetime
        
        # Add parent to path
        sys.path.insert(0, str(Path(__file__).parent.parent))
        
        from vcp_ultimate_algorithm import VCPDetector  # type: ignore
        from .db import engine  # type: ignore
        from .data_fetcher import fetch_stock_data  # type: ignore
        from sqlalchemy import text
        
        # Load universe
        universe_path = Path(__file__).parent.parent / "data" / "universe.csv"
        if universe_path.exists():
            with open(universe_path) as f:
                tickers = [line.strip() for line in f if line.strip()][:limit]
        else:
            tickers = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN"][:limit]
        
        detector = VCPDetector(min_price=10.0, min_volume=500000, min_contractions=2, check_trend_template=False)
        
        results = []
        for ticker in tickers:
            try:
                # Fetch data using multi-source fetcher
                df = fetch_stock_data(ticker, days=365)
                if df is None or len(df) < 60:
                    results.append(f"⊘ {ticker}: insufficient data")
                    continue
                
                # Detect
                signal = detector.detect_vcp(df, ticker)
                
                if signal.detected:
                    # Upsert to database
                    record = {
                        "ticker": ticker,
                        "pattern": "VCP",
                        "as_of": datetime.now(),
                        "confidence": float(signal.confidence_score),
                        "rs": None,
                        "price": float(signal.pivot_price) if signal.pivot_price else None,
                        "meta": text(f"""'{{"contractions": {len(signal.contractions)}}}'::jsonb""")
                    }
                    
                    with engine.begin() as conn:
                        conn.execute(
                            text("""
                                INSERT INTO patterns (ticker, pattern, as_of, confidence, rs, price, meta)
                                VALUES (:ticker, :pattern, :as_of, :confidence, :rs, :price, :meta)
                                ON CONFLICT (ticker, pattern, as_of) DO UPDATE
                                SET confidence=EXCLUDED.confidence, price=EXCLUDED.price, meta=EXCLUDED.meta
                            """),
                            {
                                "ticker": ticker,
                                "pattern": "VCP",
                                "as_of": datetime.now(),
                                "confidence": float(signal.confidence_score),
                                "rs": None,
                                "price": float(signal.pivot_price) if signal.pivot_price else None,
                                "meta": f'{{"contractions": {len(signal.contractions)}}}'
                            }
                        )
                    
                    results.append(f"✓ {ticker}: VCP (conf={signal.confidence_score:.1f}%)")
                else:
                    results.append(f"✗ {ticker}: no VCP")
                    
            except Exception as e:
                results.append(f"⚠ {ticker}: {str(e)[:50]}")
        
        return {"ok": True, "scanned": len(tickers), "results": results}
        
    except Exception as e:
        logging.error(f"Scan failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


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

