# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    APP_HOME=/app

WORKDIR $APP_HOME

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directory for SQLite persistence
RUN mkdir -p $APP_HOME/data

ENV DATABASE_URL="sqlite:////app/data/legendai.db" \
    REDIS_URL=""

EXPOSE 8000

CMD ["uvicorn", "legend_ai_backend:app", "--host", "0.0.0.0", "--port", "8000"]
