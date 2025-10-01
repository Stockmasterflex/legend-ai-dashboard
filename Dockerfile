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
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directory for SQLite persistence
RUN mkdir -p $APP_HOME/data

ENV REDIS_URL=""

EXPOSE 10000

# Use shell form so $PORT expands on Render
CMD sh -c 'uvicorn app.legend_ai_backend:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"'

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=5 \
  CMD /bin/sh -c 'curl -fsS http://localhost:${PORT}/healthz || exit 1'
