# Cloudflare and Repo Setup

This document is optimized for **Windows PowerShell** and covers full setup for D1, R2, Vectorize, Worker API, Pages web app, and repo configuration.

## 1) Clone and Install

```powershell
git clone <your-repo-url> precept
cd precept
npm install
```

## 2) Cloudflare Auth

```powershell
npx wrangler login
```

Confirm account:

```powershell
npx wrangler whoami
```

## 3) Create Cloudflare Data Resources

### D1

```powershell
npx wrangler d1 create precept
```

Copy the returned `database_id` into `apps/api/wrangler.toml`:
- `database_name = "precept"`
- `database_id = "<your-d1-id>"`

### R2

```powershell
npx wrangler r2 bucket create precept-frames
```

Ensure in `apps/api/wrangler.toml`:
- `binding = "FRAMES"`
- `bucket_name = "precept-frames"`

### Vectorize

Create a 512-d cosine index (for CLIP vectors):

```powershell
npx wrangler vectorize create precept-shots --dimensions=512 --metric=cosine
```

Ensure in `apps/api/wrangler.toml`:
- `binding = "VECTORS"`
- `index_name = "precept-shots"`

## 4) Apply D1 Migrations

Local:

```powershell
npx wrangler d1 migrations apply precept --local --config apps/api/wrangler.toml
```

Remote:

```powershell
npx wrangler d1 migrations apply precept --remote --config apps/api/wrangler.toml
```

## 5) Configure Secrets

Set ingest API key in Worker:

```powershell
npx wrangler secret put API_KEY --config apps/api/wrangler.toml
```

Use a strong value and keep it consistent with pipeline env.

## 6) Configure Repo Env Files

### `packages/pipeline/.env`

```env
PRECEPT_API_URL=https://precept-api.<your-subdomain>.workers.dev
PRECEPT_API_KEY=<same-value-as-worker-secret>

ENABLE_PYTHON_VISION_SERVICE=true
VISION_SERVICE_URL=http://localhost:8010
ENABLE_ADAPTIVE_KEYFRAMES=true

PIPELINE_SHOT_DETECTOR=ffmpeg_scdet
PIPELINE_SCENE_THRESHOLD=0.3
PIPELINE_MAX_CANDIDATE_FRAMES=24
PIPELINE_MAX_FRAMES_PER_SHOT=7

PIPELINE_DEFAULT_TIER=tier_1
PIPELINE_TIER1_PROVIDER=gemini
PIPELINE_TIER1_MODEL=gemini-2.5-flash-lite
PIPELINE_TIER2_PROVIDER=anthropic
PIPELINE_TIER2_MODEL=claude-sonnet-4-6
PIPELINE_SUMMARY_COMPRESS_EVERY=15

GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
QWEN_BASE_URL=http://localhost:8000
```

### `apps/web/.env`

```env
VITE_API_URL=https://precept-api.<your-subdomain>.workers.dev
```

## 7) Run and Validate Locally

API:

```powershell
npm run dev:api
```

Web:

```powershell
npm run dev:web
```

Type safety:

```powershell
npm run typecheck
```

## 8) Deploy API (Worker)

```powershell
npx wrangler deploy --config apps/api/wrangler.toml
```

Validate:

```powershell
Invoke-RestMethod "https://precept-api.<your-subdomain>.workers.dev/" | ConvertTo-Json -Depth 6
Invoke-RestMethod "https://precept-api.<your-subdomain>.workers.dev/api/films" | ConvertTo-Json -Depth 6
```

## 9) Deploy Web (Pages)

Build web:

```powershell
npm --workspace @precept/web run build
```

Deploy:

```powershell
npx wrangler pages deploy apps/web/dist
```

In Cloudflare Pages project settings:
- add `VITE_API_URL` environment variable for production
- point custom domain if needed

## 10) Run First Real Ingest to Cloud

Use pipeline against a short test clip first:

```powershell
node packages/pipeline/dist/cli.js process `
  --input "C:\path\to\test-clip.mp4" `
  --title "Inception Test Clip" `
  --year 2010 `
  --director "Christopher Nolan" `
  --runtime 5 `
  --max-shots 20
```

Verify:
- `/api/films` contains new film
- `/api/search/tags` returns rows with `thumbnail_url`
- opening `thumbnail_url` returns image data
- rows include `analysis_tier`, `analysis_provider`, and `analysis_model`

## 11) Recommended Deploy Order

1. Create D1/R2/Vectorize resources
2. Update `apps/api/wrangler.toml` with actual IDs/names
3. Apply local migration
4. Start API locally and run local ingest smoke test
5. Apply remote migration
6. Deploy Worker API
7. Build and deploy Pages web app
8. Run first short cloud ingest (`--max-shots 20`)
9. Verify `/api/films`, `/api/search/tags`, and media URLs

## 12) Recommended Repo Conventions

- Keep migrations append-only in `packages/db/migrations`
- Keep shared enums/types in `packages/shared` as single source of truth
- Keep provider/model routing in `packages/pipeline/src/config/pipeline-config.ts` as single source of truth
- Keep Python local analysis logic isolated in `services/vision-pipeline`
- Run `npm run typecheck` before every push
- Ingest short clips first, then full films once pipeline confidence is high
- Track ingest runs under `workspace/` and clean old runs regularly
