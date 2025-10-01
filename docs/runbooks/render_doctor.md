# Render Doctor

Inspects the legend-api service on Render and can trigger a clear-cache redeploy.

## Required env

- `RENDER_API_KEY`: your Render API key (Account Settings → API Keys)
- Optional: `RENDER_SERVICE_ID` (if you have it) or `RENDER_SERVICE_NAME` (default: legend-api)

## Examples

```bash
# Report only
export RENDER_API_KEY=...
make render-report

# Trigger clear-cache redeploy
make render-redeploy
```

## Manual fallback (no API key)

If `RENDER_API_KEY` is not set, the script prints a manual operator checklist:
- Confirm Repository = Stockmasterflex/legend-ai-dashboard, Branch = main
- Turn ON Auto-Deploy
- Manual Deploy → "Clear build cache & deploy"
- Settings → Health Check → path=/healthz, timeout=200s
- Reopen Events; confirm probe has no :8000

