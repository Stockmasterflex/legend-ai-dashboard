#!/bin/bash
set -e

API_BASE="${API_BASE:-https://legend-api.onrender.com}"
FRONTEND_BASE="${FRONTEND_BASE:-https://legend-ai-dashboard.vercel.app}"

echo "[verify] API base: $API_BASE"
echo "[verify] Frontend base: $FRONTEND_BASE"
echo ""

# API endpoints
echo "[verify] Testing API endpoints..."
curl -fsSL "$API_BASE/healthz" | jq -c . || (echo "FAIL: /healthz" && exit 1)
echo "✓ /healthz"

curl -fsSL "$API_BASE/readyz" | jq -c . || (echo "FAIL: /readyz" && exit 1)
echo "✓ /readyz"

curl -fsSL "$API_BASE/v1/patterns/all?limit=1" | jq -c '.items, .next' || (echo "FAIL: /v1/patterns/all" && exit 1)
echo "✓ /v1/patterns/all"

curl -fsSL "$API_BASE/v1/meta/status" | jq -c '.version, .rows_total' || (echo "FAIL: /v1/meta/status" && exit 1)
echo "✓ /v1/meta/status"

# Frontend smoke page
echo ""
echo "[verify] Testing frontend smoke page..."
curl -fsSL "$FRONTEND_BASE/health.html" | grep -q "healthz" || (echo "FAIL: /health.html" && exit 1)
echo "✓ /health.html"

# Frontend main page
echo ""
echo "[verify] Testing frontend main page..."
curl -fsSL "$FRONTEND_BASE/" | grep -q "Legend AI" || (echo "FAIL: main page" && exit 1)
echo "✓ main page"

echo ""
echo "[verify] ✅ All checks passed"
echo ""
echo "Manual verification:"
echo "  - Open $FRONTEND_BASE/health.html"
echo "  - Open $FRONTEND_BASE/ (check patterns load, 'Load more' works)"
echo "  - Check browser console for CORS errors (should be none)"

