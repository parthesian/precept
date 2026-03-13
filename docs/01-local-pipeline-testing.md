# Local Pipeline Testing and Verification

This guide is optimized for **Windows PowerShell**. It walks you through running the Precept pipeline locally, uploading a small test clip, and verifying API, D1, R2, and Vectorize results.

## 1) Prerequisites

- Node.js + npm installed
- Dependencies installed from repo root:
  - `npm install`
- A test video file available locally (for example: `C:\movies\inception-trailer.mp4`)
- API key values for local ingest auth

## 2) Configure Local Environment

Create `packages/pipeline/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-placeholder
PRECEPT_API_URL=http://localhost:8787
PRECEPT_API_KEY=dev-local-key
```

Set Worker secret (local + remote-safe pattern):

```powershell
npx wrangler secret put API_KEY --config apps/api/wrangler.toml
```

When prompted, use the same value as `PRECEPT_API_KEY` (example: `dev-local-key`).

## 3) Prepare Local Cloudflare Resources (dev mode)

Run local D1 migration:

```powershell
npx wrangler d1 migrations apply precept --local --config apps/api/wrangler.toml
```

Start API:

```powershell
npm run dev:api
```

Keep this terminal running.

## 4) Run the End-to-End Pipeline Upload (small batch first)

In a second terminal from repo root:

```powershell
npx turbo build --filter=@precept/pipeline
```

Then run:

```powershell
node packages/pipeline/dist/cli.js process `
  --input "C:\movies\inception-trailer.mp4" `
  --title "Inception Trailer Test" `
  --year 2010 `
  --director "Christopher Nolan" `
  --cinematographer "Wally Pfister" `
  --runtime 3 `
  --max-shots 20 `
  --scene-threshold 0.3
```

Notes:
- `--max-shots` keeps payload size manageable for local verification.
- Media is now uploaded as base64 payload and stored in R2 via `/api/ingest/shots`.

## 5) Verify API Responses

List films:

```powershell
Invoke-RestMethod "http://localhost:8787/api/films" | ConvertTo-Json -Depth 6
```

Tag search with joined film metadata:

```powershell
Invoke-RestMethod "http://localhost:8787/api/search/tags?shot_scale=medium_shot&limit=5" | ConvertTo-Json -Depth 6
```

You should see rows containing:
- `film_title`, `film_year`, `film_director`
- `thumbnail_url` (served from `/api/assets?key=...`)

## 6) Verify Shot Media Is Accessible

Get one shot id from `/api/search/tags`, then:

```powershell
Invoke-RestMethod "http://localhost:8787/api/shots/<SHOT_ID>/frames" | ConvertTo-Json -Depth 6
Invoke-RestMethod "http://localhost:8787/api/shots/<SHOT_ID>/audio" | ConvertTo-Json -Depth 6
```

Open returned `thumbnail_url` / `frame_urls` / `audio_url` in a browser.

Tip: in PowerShell, open URL directly:

```powershell
Start-Process "http://localhost:8787/api/assets?key=<R2_KEY>"
```

## 7) Verify D1 Data

Check counts:

```powershell
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT COUNT(*) AS films FROM films;"
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT COUNT(*) AS shots FROM shots;"
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT COUNT(*) AS connections FROM connections;"
```

Inspect sample shot row:

```powershell
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT id, film_id, shot_index, thumbnail, audio_clip FROM shots LIMIT 5;"
```

## 8) Verify Vectorize Write Path

Ingest now upserts vectors during `/api/ingest/shots`. A simple runtime validation is:
- no ingest error from API
- vector search endpoint responds:

```powershell
$body = @{ embedding = @(0.01, 0.02, 0.03) } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:8787/api/search/similar" -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 6
```

For realistic results, use a real 512-d vector from generated embeddings JSON.

## 9) Optional UI Verification

Start web app:

```powershell
npm run dev:web
```

Open the app, go to **Explore**, and confirm:
- cards render with thumbnails
- film title/year populate from joined query fields
- filters like `shot_scale` / `setting` work via query string input

## 10) Troubleshooting

- `401 Unauthorized` on ingest:
  - `PRECEPT_API_KEY` and Worker `API_KEY` secret do not match.
- Missing media URLs:
  - check `/api/shots/:id/frames` response keys and ensure `thumbnail` is non-empty.
- Large payload errors:
  - reduce `--max-shots` (start with `10-20`).
- Scene detection returns too few shots:
  - try lower threshold (for example `--scene-threshold 0.22`).

## 11) Quick Smoke Test (PowerShell)

After running the `process` command, run this exact sequence:

```powershell
$films = Invoke-RestMethod "http://localhost:8787/api/films"
if (-not $films.data -or $films.data.Count -eq 0) { throw "No films found after ingest." }

$shots = Invoke-RestMethod "http://localhost:8787/api/search/tags?limit=1"
if (-not $shots.data -or $shots.data.Count -eq 0) { throw "No shots found after ingest." }

$shotId = $shots.data[0].id
$frames = Invoke-RestMethod "http://localhost:8787/api/shots/$shotId/frames"
if (-not $frames.thumbnail_url) { throw "No thumbnail_url returned." }

Write-Host "Smoke test passed. Example shot:" $shotId
Write-Host "Thumbnail URL:" $frames.thumbnail_url
```
