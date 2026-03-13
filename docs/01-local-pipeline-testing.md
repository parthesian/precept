# Local Pipeline Testing and Verification

This guide walks you through running the Precept pipeline locally, uploading a small test film segment, and verifying data in API, D1, R2, and Vectorize.

## 1) Prerequisites

- Node.js + npm installed
- Dependencies installed from repo root:
  - `npm install`
- A test video file available locally (for example: `C:\movies\inception-trailer.mp4`)
- API key values for local ingest auth

## 2) Configure Local Environment

Create `packages/pipeline/.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-placeholder
PRECEPT_API_URL=http://localhost:8787
PRECEPT_API_KEY=dev-local-key
```

Set Worker secret (local + remote-safe pattern):

```bash
npx wrangler secret put API_KEY --config apps/api/wrangler.toml
```

When prompted, use the same value as `PRECEPT_API_KEY` (example: `dev-local-key`).

## 3) Prepare Local Cloudflare Resources (dev mode)

Run local D1 migration:

```bash
npx wrangler d1 migrations apply precept --local --config apps/api/wrangler.toml
```

Start API:

```bash
npm run dev:api
```

Keep this terminal running.

## 4) Run the End-to-End Pipeline Upload (small batch first)

In a second terminal from repo root:

```bash
npx turbo build --filter=@precept/pipeline
```

Then run:

```bash
node packages/pipeline/dist/cli.js process \
  --input "C:\movies\inception-trailer.mp4" \
  --title "Inception Trailer Test" \
  --year 2010 \
  --director "Christopher Nolan" \
  --cinematographer "Wally Pfister" \
  --runtime 3 \
  --max-shots 20 \
  --scene-threshold 0.3
```

Notes:
- `--max-shots` keeps payload size manageable for local verification.
- Media is now uploaded as base64 payload and stored in R2 via `/api/ingest/shots`.

## 5) Verify API Responses

List films:

```bash
curl "http://localhost:8787/api/films"
```

Tag search with joined film metadata:

```bash
curl "http://localhost:8787/api/search/tags?shot_scale=medium_shot&limit=5"
```

You should see rows containing:
- `film_title`, `film_year`, `film_director`
- `thumbnail_url` (served from `/api/assets?key=...`)

## 6) Verify Shot Media Is Accessible

Get one shot id from `/api/search/tags`, then:

```bash
curl "http://localhost:8787/api/shots/<SHOT_ID>/frames"
curl "http://localhost:8787/api/shots/<SHOT_ID>/audio"
```

Open returned `thumbnail_url` / `frame_urls` / `audio_url` in a browser.

## 7) Verify D1 Data

Check counts:

```bash
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT COUNT(*) AS films FROM films;"
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT COUNT(*) AS shots FROM shots;"
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT COUNT(*) AS connections FROM connections;"
```

Inspect sample shot row:

```bash
npx wrangler d1 execute precept --local --config apps/api/wrangler.toml --command "SELECT id, film_id, shot_index, thumbnail, audio_clip FROM shots LIMIT 5;"
```

## 8) Verify Vectorize Write Path

Ingest now upserts vectors during `/api/ingest/shots`. A simple runtime validation is:
- no ingest error from API
- vector search endpoint responds:

```bash
curl -X POST "http://localhost:8787/api/search/similar" -H "content-type: application/json" -d "{\"embedding\": [0.01,0.02,0.03]}"
```

For realistic results, use a real 512-d vector from generated embeddings JSON.

## 9) Optional UI Verification

Start web app:

```bash
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
