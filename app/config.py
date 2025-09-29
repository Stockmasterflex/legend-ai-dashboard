import os
import logging
from typing import List


def get_database_url() -> str:
    db = os.getenv("DATABASE_URL")
    if not db:
        legacy = os.getenv("SERVICE_DATABASE_URL")
        if legacy:
            logging.warning("Using legacy SERVICE_DATABASE_URL; please rename to DATABASE_URL.")
            db = legacy
    if not db:
        raise RuntimeError("DATABASE_URL is required")
    return db


def allowed_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    return [o.strip() for o in raw.split(",") if o.strip()]


def mock_enabled() -> bool:
    return os.getenv("LEGEND_MOCK_MODE", "0") == "1" or os.getenv("LEGEND_MOCK", "0") == "1"


