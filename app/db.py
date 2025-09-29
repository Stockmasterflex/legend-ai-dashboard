"""
Database engine factory for Legend AI API.

Provides a minimal SQLAlchemy engine using `DATABASE_URL`. This is used by
readiness probes and other modules that only need a lightweight connection.
"""

import os
from sqlalchemy import create_engine


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL env var is required")

# Use pool_pre_ping to avoid stale connections in serverless/pooled envs.
engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)


