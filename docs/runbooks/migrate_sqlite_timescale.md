# Run locally
export SQLITE_PATH=~/Desktop/legend-ai-mvp/legendai.db
export DATABASE_URL="<TIMESCALE_DATABASE_URL>"
python scripts/migrate_sqlite_to_timescale.py


