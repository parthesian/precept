# Cloudflare and Repo Setup

This document covers full setup for D1, R2, Vectorize, Worker API, Pages web app, and required repo configuration.

## 1) Clone and Install

```bash
git clone <your-repo-url> precept
cd precept
npm install
```

## 2) Cloudflare Auth

```bash
npx wrangler login
```

Confirm account:

```bash
npx wrangler whoami
```

## 3) Create Cloudflare Data Resources

### D1

```bash
npx wrangler d1 create precept
```

Copy the returned `database_id` into `apps/api/wrangler.toml`:
- `database_name = "precept"`
- `database_id = "<your-d1-id>"`

### R2

```bash
npx wrangler r2 bucket create precept-frames
```

Ensure in `apps/api/wrangler.toml`:
- `binding = "FRAMES"`
- `bucket_name = "precept-frames"`

### Vectorize

Create a 512-d cosine index (for CLIP vectors):

```bash
npx wrangler vectorize create precept-shots --dimensions=512 --metric=cosine
```

Ensure in `apps/api/wrangler.toml`:
- `binding = "VECTORS"`
- `index_name = "precept-shots"`

## 4) Apply D1 Migrations

Local:

```bash
npx wrangler d1 migrations apply precept --local --config apps/api/wrangler.toml
```

Remote:

```bash
npx wrangler d1 migrations apply precept --remote --config apps/api/wrangler.toml
```

## 5) Configure Secrets

Set ingest API key in Worker:

```bash
npx wrangler secret put API_KEY --config apps/api/wrangler.toml
```

Use a strong value and keep it consistent with pipeline env.

## 6) Configure Repo Env Files

### `packages/pipeline/.env`

```bash
ANTHROPIC_API_KEY=sk-ant-...
PRECEPT_API_URL=https://precept-api.<your-subdomain>.workers.dev
PRECEPT_API_KEY=<same-value-as-worker-secret>
```

### `apps/web/.env`

```bash
VITE_API_URL=https://precept-api.<your-subdomain>.workers.dev
```

## 7) Run and Validate Locally

API:

```bash
npm run dev:api
```

Web:

```bash
npm run dev:web
```

Type safety:

```bash
npm run typecheck
```

## 8) Deploy API (Worker)

```bash
npx wrangler deploy --config apps/api/wrangler.toml
```

Validate:

```bash
curl "https://precept-api.<your-subdomain>.workers.dev/"
curl "https://precept-api.<your-subdomain>.workers.dev/api/films"
```

## 9) Deploy Web (Pages)

Build web:

```bash
npm --workspace @precept/web run build
```

Deploy:

```bash
npx wrangler pages deploy apps/web/dist
```

In Cloudflare Pages project settings:
- add `VITE_API_URL` environment variable for production
- point custom domain if needed

## 10) Run First Real Ingest to Cloud

Use pipeline against a short test clip first:

```bash
node packages/pipeline/dist/cli.js process \
  --input "/path/to/test-clip.mp4" \
  --title "Inception Test Clip" \
  --year 2010 \
  --director "Christopher Nolan" \
  --runtime 5 \
  --max-shots 20
```

Verify:
- `/api/films` contains new film
- `/api/search/tags` returns rows with `thumbnail_url`
- opening `thumbnail_url` returns image data

## 11) Recommended Repo Conventions

- Keep migrations append-only in `packages/db/migrations`
- Keep shared enums/types in `packages/shared` as single source of truth
- Run `npm run typecheck` before every push
- Ingest short clips first, then full films once pipeline confidence is high
- Track ingest runs under `workspace/` and clean old runs regularly
