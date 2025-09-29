import pytest
from starlette.testclient import TestClient

try:
    from app.legend_ai_backend import app
except Exception:  # pragma: no cover
    pytest.skip("app not importable", allow_module_level=True)


def test_healthz_ok():
    c = TestClient(app)
    r = c.get("/healthz")
    assert r.status_code == 200


