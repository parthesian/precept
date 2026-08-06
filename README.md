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

- Next.js (App Router) — `apps/web`
- Hono on Node — `apps/api`
- Postgres + Drizzle — `packages/db`
- Shared domain types — `packages/shared`
- TMDB importer — `packages/importer`
- Legacy shot pipeline archived under `legacy/` (and demoted pipeline still in `packages/pipeline` + `services/vision-pipeline`)

See `INVENTORY.md`, `MIGRATION.md`, and `DECISIONS.md`.

## Quick start

Requirements: Node 22+, npm 10+, Postgres 16.

```bash
cp .env.example .env
# If using Docker: docker compose up -d postgres
# Or local apt Postgres with user/db `precept` / password `precept`

npm install
npm run db:migrate
npm run db:seed
npm run dev:api
# other terminal
npm run dev:web
```

Open http://localhost:3000

Create an admin:

```bash
npm run admin:create -- --email=you@example.com --password='choose-a-password' --handle=you
```

## Docs

- `HANDOFF.md` — owner setup walkthrough (written at end of rebuild)
- `seed/README.md` — fixture schema
- `legacy/docs/` — previous Cloudflare/shot-pipeline ops docs
