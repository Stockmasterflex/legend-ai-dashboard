"""
Observability helpers for Legend AI API.

Provides JSON logging setup and optional Sentry integration. Import and call
`setup_json_logging()` early in process startup, and wrap FastAPI app with
`setup_sentry(app)` to enable Sentry when SENTRY_DSN is provided.
"""

import os
import time
import json
import logging
from typing import Any, Dict


def setup_json_logging() -> None:
    """Configure root logger to emit JSON-formatted logs to stdout."""

    class JsonFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:  # type: ignore[override]
            payload: Dict[str, Any] = {
                "ts": time.time(),
                "level": record.levelname,
                "logger": record.name,
                "msg": record.getMessage(),
            }
            if record.exc_info:
                payload["exc_info"] = self.formatException(record.exc_info)
            return json.dumps(payload)

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


def setup_sentry(app):
    """Wrap ASGI app with Sentry middleware if SENTRY_DSN is set.

    Returns the original app if DSN is missing.
    """
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return app
    import sentry_sdk
    from sentry_sdk.integrations.asgi import SentryAsgiMiddleware

    sentry_sdk.init(dsn=dsn, traces_sample_rate=0.1)
    return SentryAsgiMiddleware(app)


