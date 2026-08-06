# Precept

Community-curated, human-verified graph of cinematic influence — WhoSampled for film, with a Wikipedia-style contribution model.

Three explorable surfaces share selection state on one page:

| Pane | Job |
|---|---|
| **Vista** | Where films were filmed and where they are set |
| **Homage** | Influence graph — films, people, typed connections |
| **Focus** | Dictionary of cinematic language (precepts) |
| **Spotlight** | Editorial landing feature on one film |

Automated vision/tagging is a **proposal feeder** (optional Milestone 8), not the product.

## Stack

- **React Router v7 + Vite + `@cloudflare/vite-plugin`** — `apps/web`
- **Hono on Cloudflare Workers** — `apps/api` (mounted at `/api/*`)
- **D1 + Drizzle (sqlite-core)** — `packages/db`
- **KV rate limits · Queues for TMDB import · Workers Assets**
- Shared domain types — `packages/shared`
- TMDB importer — `packages/importer` (Node CLI → local/remote D1)
- Legacy shot product archived under `legacy/` (untouched)
- Vision pipeline remains Node/Python (`packages/pipeline` + `services/vision-pipeline`)

See `INVENTORY.md`, `MIGRATION.md`, and `DECISIONS.md`.

## Quick start

Requirements: Node 22+, npm 10+. **No Postgres.**

```bash
cp .dev.vars.example .dev.vars
cp .dev.vars apps/web/.dev.vars
# edit AUTH_SECRET / TMDB_API_KEY

npm install
npm run db:migrate   # wrangler d1 migrations apply --local
npm run db:seed
npm run dev          # Vite + Cloudflare plugin (UI + API, same origin)
```

Open the Vite URL (typically http://localhost:5173).

Create an admin:

```bash
npm run admin:create -- --email=you@example.com --password='choose-a-password' --handle=you
```

### Useful commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local Worker (RR7 SSR + Hono `/api`) |
| `npm run db:migrate` | Apply D1 migrations (local) |
| `npm run db:seed` | Seed local D1 from `seed/*.json` |
| `npm run db:reset` | Wipe local D1 state, migrate, seed |
| `npm run admin:create -- …` | Create/upgrade admin on local D1 |
| `npm run import:tmdb -- …` | TMDB import CLI against local D1 |
| `npm run deploy` | Build + `wrangler deploy` |

Remote D1: `npm run db:migrate -- --remote` after setting a real `database_id` in `apps/web/wrangler.jsonc`.

## Docs

- `HANDOFF.md` — owner setup walkthrough
- `seed/README.md` — fixture schema
- `legacy/docs/` — previous shot-pipeline ops docs
