import pytest
from starlette.testclient import TestClient

try:
    from app.legend_ai_backend import app
except Exception:  # pragma: no cover
    pytest.skip("app not importable", allow_module_level=True)


def test_status_meta_shape():
    c = TestClient(app)
    r = c.get("/v1/meta/status")
    assert r.status_code == 200
    body = r.json()
    assert set(["last_scan_time", "rows_total", "patterns_daily_span_days", "version"]).issubset(body.keys())


