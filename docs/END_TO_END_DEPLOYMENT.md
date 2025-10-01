# Legend AI - End-to-End Deployment Guide

**Status**: ✅ **PRODUCTION READY** (as of October 1, 2025)

This document provides a complete guide to the deployed Legend AI system, including all components, endpoints, credentials, and operational procedures.

---

## 🌐 System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌───────────────┐
│   Vercel        │         │   Render API     │         │  TimescaleDB  │
│   Dashboard     │◄────────┤   (FastAPI)      │◄────────┤   Postgres    │
│   (Frontend)    │  HTTPS  │                  │  Internal│   (Data)      │
└─────────────────┘         └──────────────────┘         └───────────────┘
                                     │
                                     │ Finnhub API
                                     ▼
                            ┌────────────────────┐
                            │  Stock Data Source │
                            └────────────────────┘
```

---

## 📡 Deployed Services

### 1. Backend API (Render Web Service)
- **URL**: https://legend-api.onrender.com
- **Service ID**: `srv-d33kus6mcj7s73afodng`
- **Repository**: https://github.com/Stockmasterflex/legend-ai-dashboard
- **Branch**: main
- **Auto-Deploy**: YES
- **Region**: Oregon
- **Plan**: Starter

**Health Status**:
```bash
curl https://legend-api.onrender.com/healthz
# {"ok":true,"version":"0.1.0"}

curl https://legend-api.onrender.com/readyz
# {"ok":true}
```

### 2. Database (Render Postgres)
- **Name**: legend-db
- **ID**: `dpg-d3e91vali9vc739eqll0-a`
- **Plan**: Free
- **Region**: Oregon
- **Version**: PostgreSQL 16
- **Dashboard**: https://dashboard.render.com/d/dpg-d3e91vali9vc739eqll0-a

**Alternative (TimescaleDB Cloud)**:
```
postgres://tsdbadmin:svcse15kzcdre6e8@ok2ig4hlfo.qajnoj2za7.tsdb.cloud.timescale.com:39031/tsdb?sslmode=require
```

### 3. Frontend (Vercel)
- **URL**: https://legend-ai-dashboard.vercel.app
- **Project ID**: `prj_NfYIISFWIoC5dvcXfoUTAoT6SaE3`
- **Deploy Hook**: https://api.vercel.com/v1/integrations/deploy/prj_NfYIISFWIoC5dvcXfoUTAoT6SaE3/I33AHQYbHI

---

## 🔑 Credentials & Environment Variables

### Render Service Environment Variables
```bash
DATABASE_URL=<internal_postgres_connection>
FINNHUB_API_KEY=cursa71r01qt2nch077gcursa71r01qt2nch0780
ALLOWED_ORIGINS=https://legend-ai-dashboard.vercel.app
REDIS_URL=<optional>
SENTRY_DSN=<optional>
```

### Vercel Environment Variables
```bash
NEXT_PUBLIC_API_BASE=https://legend-api.onrender.com
```

### API Keys
- **Render API Key**: `rnd_tVR56mzCQ2JwtW5JVWYzPaGUYNKW`
- **Finnhub API Key**: `cursa71r01qt2nch077gcursa71r01qt2nch0780`

---

## 📊 API Endpoints

### Public Endpoints

#### Health & Readiness
```bash
GET /healthz
# Fast health check (no DB)

GET /readyz
# Ready check (includes DB ping)
```

#### Patterns API (v1)
```bash
GET /v1/patterns/all?limit=100&cursor=<base64>
# Returns:
# {
#   "items": [
#     {
#       "ticker": "NVDA",
#       "pattern": "VCP",
#       "as_of": "2025-10-01T03:11:31.969024+00:00",
#       "confidence": 91.0,
#       "rs": 95.1,
#       "price": 495.22,
#       "meta": {"contractions": 3, "base_depth": 0.15, "pivot": 495.22}
#     }
#   ],
#   "next": "eyJhc19vZl9pc28iOi4uLn0="  # Cursor for next page
# }
```

```bash
GET /v1/meta/status
# Returns:
# {
#   "last_scan_time": "2025-10-01T03:11:31.969024+00:00",
#   "rows_total": 3,
#   "patterns_daily_span_days": 2,
#   "version": "0.1.0"
# }
```

### Admin Endpoints (No Auth - Restrict in Production!)

```bash
POST /admin/init-db
# Initialize database schema (one-time)

POST /admin/seed-demo
# Populate with 3 mock VCP patterns for testing

POST /admin/run-scan?limit=10
# Trigger VCP detection on configured universe

GET /admin/test-data?ticker=AAPL
# Test data fetching for a specific ticker
```

---

## 🚀 Deployment Procedures

### Deploy Latest Code
```bash
# Auto-deploys on push to main
git push origin main

# Or use Render CLI/API
export RENDER_API_KEY=rnd_tVR56mzCQ2JwtW5JVWYzPaGUYNKW
make render-redeploy
```

### Check Deployment Status
```bash
export RENDER_API_KEY=rnd_tVR56mzCQ2JwtW5JVWYzPaGUYNKW
make render-report

# Or check directly
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/services/srv-d33kus6mcj7s73afodng | jq .
```

### Database Migrations
```bash
# Apply SQL migrations directly
psql "$DATABASE_URL" -f migrations/sql/0001_create_patterns_table.sql

# Or use the API endpoint
curl -X POST https://legend-api.onrender.com/admin/init-db
```

---

## 🔄 Running Scans

### Manual Scan (via API)
```bash
# Scan 7 tickers from universe
curl -X POST 'https://legend-api.onrender.com/admin/run-scan?limit=7'

# Returns:
# {
#   "ok": true,
#   "scanned": 7,
#   "results": [
#     "✓ NVDA: VCP (conf=85.5%)",
#     "✗ AAPL: no VCP",
#     ...
#   ]
# }
```

### Scheduled Scans (Background Worker)
**Setup**:
1. Create Background Worker on Render
2. Command: `python worker/scheduler.py`
3. Environment: Same as web service
4. Add: `LEGEND_SCAN_AT=13:30` (daily run time)

**Manual Run**:
```bash
export DATABASE_URL="<postgres_url>"
python worker/scan_batch.py
```

---

## 📁 Repository Structure

```
legend-ai-mvp/
├── app/
│   ├── __init__.py
│   ├── legend_ai_backend.py      # Main FastAPI app
│   ├── config.py                  # Environment config
│   ├── db.py                      # Database engine
│   ├── db_queries.py              # Query functions
│   ├── data_fetcher.py            # Multi-source data fetcher
│   ├── cache.py                   # Redis caching
│   ├── flags.py                   # Feature flags
│   └── observability.py           # Logging & Sentry
├── worker/
│   ├── scan_batch.py              # Batch VCP scanner
│   ├── scheduler.py               # Daily scheduler
│   └── utils.py                   # Upsert & universe helpers
├── migrations/sql/
│   ├── 0001_create_patterns_table.sql
│   └── 2025_09_patterns_constraints.sql
├── scripts/
│   ├── render_doctor.py           # Render service inspector
│   ├── verify_deploy.sh           # Deployment verification
│   └── monitor_service.py         # Service health monitor
├── tests/
│   ├── test_health.py
│   ├── test_readyz_smoke.py
│   └── fixtures/
├── data/
│   └── universe.csv               # List of tickers to scan
├── docs/
│   ├── runbooks/
│   │   ├── deploy_render.md
│   │   ├── render_doctor.md
│   │   └── apply_sql_migrations.md
│   └── END_TO_END_DEPLOYMENT.md  # This file
├── .github/workflows/
│   ├── ci.yml                     # CI pipeline
│   ├── release-tag.yaml           # Auto-tagging
│   └── monitor.yaml               # Service monitoring
├── Dockerfile                     # Container definition
├── Dockerfile.api                 # Render-specific (same)
├── requirements.txt               # Python dependencies
├── Makefile                       # Dev shortcuts
└── vcp_ultimate_algorithm.py     # VCP detector core
```

---

## 🛠️ Development Workflow

### Local Development
```bash
# Setup
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Run locally
make dev
# Or: uvicorn app.legend_ai_backend:app --reload

# Format & lint
make format
make type
make test
```

### Pre-commit Hooks
```bash
pre-commit install
# Now Black, Ruff, MyPy run automatically on commit
```

### CI Pipeline
- **Runs on**: Every push and PR
- **Checks**: Format (Black, Ruff), Type (MyPy), Tests (pytest), Docker guards
- **Location**: `.github/workflows/ci.yml`

---

## 🐛 Troubleshooting

### API Returns 404
```bash
# Check if service is live
make render-report

# Check specific endpoint
curl -v https://legend-api.onrender.com/healthz
```

### Database Connection Errors
```bash
# Check readyz endpoint
curl https://legend-api.onrender.com/readyz

# Verify DATABASE_URL is set on Render
# Dashboard → legend-api → Environment
```

### No Patterns Returned
```bash
# Check if table has data
curl https://legend-api.onrender.com/v1/meta/status

# Seed demo data
curl -X POST https://legend-api.onrender.com/admin/seed-demo

# Run a scan
curl -X POST 'https://legend-api.onrender.com/admin/run-scan?limit=5'
```

### Finnhub Rate Limits
- Free tier: 60 calls/minute
- If exceeded, falls back to yfinance or mock data
- Check logs in Render dashboard

---

## 📈 Monitoring & Observability

### Health Monitoring
```bash
# Run monitor script
python scripts/monitor_service.py

# GitHub Action runs hourly
# .github/workflows/monitor.yaml
```

### Logs
```bash
# View in Render Dashboard
https://dashboard.render.com/web/srv-d33kus6mcj7s73afodng/logs

# Or via API
curl -H "Authorization: Bearer $RENDER_API_KEY" \
  'https://api.render.com/v1/services/srv-d33kus6mcj7s73afodng/logs'
```

### Sentry (Optional)
Set `SENTRY_DSN` env var to enable error tracking.

---

## 🔒 Security Considerations

### Current State (MVP)
- ⚠️ **No authentication** on admin endpoints
- ✅ CORS configured for frontend origin
- ✅ Security headers enabled
- ✅ HTTPS enforced by Render

### Production Hardening (TODO)
- [ ] Add API key auth for admin endpoints
- [ ] Rate limiting (via Render or middleware)
- [ ] Input validation & sanitization
- [ ] Secrets rotation policy
- [ ] Regular dependency updates

---

## 📊 Current Status

### ✅ Working
- FastAPI backend deployed on Render
- PostgreSQL database connected
- Health & readiness probes
- v1 API with pagination
- Status/metadata endpoint
- VCP detector with Finnhub integration
- Admin endpoints for scanning & seeding
- CI/CD pipeline with doctor guards
- JSON logging & Request-ID middleware

### 🚧 Pending
- Background worker deployment (manual for now)
- TimescaleDB-specific features (hypertables, retention)
- Frontend full integration
- Additional pattern detectors (Cup & Handle, Flat Base, etc.)
- Authentication & authorization
- Rate limiting

---

## 🎯 Quick Start Checklist

### For New Deployments
1. ✅ Clone repo: `git clone https://github.com/Stockmasterflex/legend-ai-dashboard.git`
2. ✅ Create Render Postgres database
3. ✅ Create Render Web Service from Docker
4. ✅ Set environment variables (DATABASE_URL, FINNHUB_API_KEY)
5. ✅ Initialize schema: `curl -X POST .../admin/init-db`
6. ✅ Seed demo data: `curl -X POST .../admin/seed-demo`
7. ✅ Verify: `curl .../v1/patterns/all`
8. 🚧 (Optional) Deploy background worker
9. 🚧 (Optional) Update frontend NEXT_PUBLIC_API_BASE

### For Existing Deployment
1. ✅ Check health: `curl .../healthz && curl .../readyz`
2. ✅ Run scan: `curl -X POST '.../admin/run-scan?limit=10'`
3. ✅ Verify data: `curl .../v1/patterns/all`
4. ✅ Check status: `curl .../v1/meta/status`

---

## 📞 Support & Resources

- **Repository**: https://github.com/Stockmasterflex/legend-ai-dashboard
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Finnhub Docs**: https://finnhub.io/docs/api

---

**Last Updated**: October 1, 2025  
**Version**: 0.1.0  
**Deployment Status**: ✅ LIVE & OPERATIONAL

