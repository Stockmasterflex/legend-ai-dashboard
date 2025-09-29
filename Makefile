PY=python
RUN=uvicorn app.legend_ai_backend:app --host 0.0.0.0 --port 8000 --reload

format:
	ruff --fix .
	black .

type:
	mypy app

test:
	pytest -q

dev:
	$(RUN)

migrate-sqlite:
	SQLITE_PATH=legendai.db DATABASE_URL="$${DATABASE_URL}" $(PY) scripts/migrate_sqlite_to_timescale.py


