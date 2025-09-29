"""
Runs batch scans over a symbol universe and upserts results into Timescale.
Idempotent by (ticker, pattern, as_of).
"""

import os
import sqlalchemy as sa
from typing import List, Dict
from .utils import upsert_patterns, load_universe


PG_URL = os.getenv("DATABASE_URL")
if not PG_URL:
    raise SystemExit("DATABASE_URL required")

engine = sa.create_engine(PG_URL, future=True, pool_pre_ping=True)


def universe() -> List[str]:
    return load_universe()


def run_one(ticker: str) -> List[Dict]:
    # TODO: call real detectors; return dicts matching 'patterns' schema
    return []


def upsert(rows: List[Dict]) -> None:
    upsert_patterns(engine, rows)


def main() -> None:
    for t in universe():
        rows = run_one(t)
        upsert(rows)


if __name__ == "__main__":
    main()


