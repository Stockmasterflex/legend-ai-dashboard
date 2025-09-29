"""
Runs batch scans over a symbol universe and upserts results into Timescale.
Idempotent by (ticker, pattern, as_of).
"""

import os
import sqlalchemy as sa
from sqlalchemy import text
from typing import List, Dict


PG_URL = os.getenv("DATABASE_URL")
if not PG_URL:
    raise SystemExit("DATABASE_URL required")

engine = sa.create_engine(PG_URL, future=True, pool_pre_ping=True)


def universe() -> List[str]:
    # TODO: read from watchlist table/file; seed if needed
    return ["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"]


def run_one(ticker: str) -> List[Dict]:
    # TODO: call real detectors; return dicts matching 'patterns' schema
    return []


def upsert(rows: List[Dict]) -> None:
    if not rows:
        return
    cols = list(rows[0].keys())
    keys = ",".join(cols)
    placeholders = ",".join([f":{c}" for c in cols])
    conflict = "(ticker, pattern, as_of)"
    set_expr = ", ".join([f"{c}=EXCLUDED.{c}" for c in cols if c not in ("ticker", "pattern", "as_of")])
    sql = text(
        f"INSERT INTO patterns ({keys}) VALUES ({placeholders}) ON CONFLICT {conflict} DO UPDATE SET {set_expr}"
    )
    with engine.begin() as conn:
        conn.execute(sql, rows)


def main() -> None:
    for t in universe():
        rows = run_one(t)
        upsert(rows)


if __name__ == "__main__":
    main()


