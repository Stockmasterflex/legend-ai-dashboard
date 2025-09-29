# Deploy on Render

Set the following environment variables on the Render service (Web → Environment):

ALLOWED_ORIGINS=${VERCEL_APP_URL},${FRAMER_SITE_URL}
DATABASE_URL=${TIMESCALE_DATABASE_URL}
SENTRY_DSN=${SENTRY_DSN}

Start Command:

uvicorn app.legend_ai_backend:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"


