# Local Pipeline Testing and Verification

This guide is optimized for **Windows PowerShell** and validates the hybrid intelligent pipeline:

- Python local vision service (`services/vision-pipeline`)
- TypeScript orchestrator (`packages/pipeline`)
- Cloudflare Worker API + D1 + R2 + Vectorize

## 1) Prerequisites

- Node.js + npm installed
- Python 3.11+ installed
- Dependencies installed from repo root:
  - `npm install`
- Test video available locally (example: `C:\movies\inception-trailer.mp4`)

## 2) Configure Local Environment

Create `packages/pipeline/.env`:

```env
PRECEPT_API_URL=http://localhost:8787
PRECEPT_API_KEY=dev-local-key

ENABLE_PYTHON_VISION_SERVICE=true
VISION_SERVICE_URL=http://localhost:8010
ENABLE_ADAPTIVE_KEYFRAMES=true

PIPELINE_TIER1_PROVIDER=gemini
PIPELINE_TIER1_MODEL=gemini-2.5-flash-lite
PIPELINE_TIER2_PROVIDER=anthropic
PIPELINE_TIER2_MODEL=claude-sonnet-4-6
PIPELINE_DEFAULT_TIER=tier_1
PIPELINE_SUMMARY_COMPRESS_EVERY=15

GEMINI_API_KEY=<optional-if-tier1-gemini>
ANTHROPIC_API_KEY=<optional-if-tier2-anthropic>
QWEN_BASE_URL=http://localhost:8000
```

Set Worker secret:

```powershell
npx wrangler secret put API_KEY --config apps/api/wrangler.toml
```

Use the same value as `PRECEPT_API_KEY`.

## 3) Start Local Services

Apply local migrations:

```powershell
npx wrangler d1 migrations apply precept --local --config apps/api/wrangler.toml
```

Start API:

```powershell
npm run dev:api
```

In another terminal, start the Python vision service:

```powershell
cd services/vision-pipeline
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

## 4) Run End-to-End Process

From repo root:

```powershell
npx turbo build --filter=@precept/pipeline
node packages/pipeline/dist/cli.js process `
  --input "C:\Movies\TheOdyssey.webm" `
  --title "Odyssey Trailer Test" `
  --year 2026 `
  --director "Christopher Nolan" `
  --cinematographer "Hoyte van Hoytema" `
  --runtime 2 `
  --max-shots 40 `
  --scene-threshold 0.3
```

## 5) Verify Intelligent Metadata

Query a sample shot:

```powershell
Invoke-RestMethod "http://localhost:8787/api/search/tags?limit=1" | ConvertTo-Json -Depth 8
```

Expect additional fields:

- `analysis_tier` (`tier_0|tier_1|tier_2`)
- `analysis_provider`
- `analysis_model`
- `analysis_confidence`
- `keyframe_diagnostics` (JSON string in DB, object in pipeline payload)

## 6) Verify Media Endpoints

```powershell
Invoke-RestMethod "http://localhost:8787/api/shots/<SHOT_ID>/frames" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:8787/api/shots/<SHOT_ID>/audio" | ConvertTo-Json -Depth 6
```

## 7) Verify D1 and Vectorize

```powershell
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT COUNT(*) AS films FROM films;"
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT COUNT(*) AS shots FROM shots;"
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT shot_index, analysis_tier, analysis_provider, analysis_model, analysis_confidence FROM shots LIMIT 5;"
```

Similarity endpoint smoke test:

```powershell
$body = @{ embedding = @(0.01, 0.02, 0.03) } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8787/api/search/similar" -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 6
```

## 8) Troubleshooting

- `401 Unauthorized` on ingest:
  - `PRECEPT_API_KEY` and Worker `API_KEY` mismatch.
- Vision service connection errors:
  - ensure `VISION_SERVICE_URL` is reachable and `/health` returns `ok`.
- Missing model key:
  - verify `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` for configured tier provider.
- Too many uploaded frames:
  - lower `PIPELINE_MAX_CANDIDATE_FRAMES` and `PIPELINE_MAX_FRAMES_PER_SHOT`.
