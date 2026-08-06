# Migration Plan

How the shot-centric Precept product moves into the community-graph rebuild. Nothing is deleted without a row here.

## Keep (in place)

| Path | Reason |
|---|---|
| `packages/pipeline` | Solid ingest/VLM orchestrator; demoted to AI proposal feeder (M8). Taxonomy vendored under `src/shared-types/`. |
| `services/vision-pipeline` | Solid local vision service; same demotion. |
| Root turbo/npm workspace tooling | Preserved monorepo shape. |
| TypeScript + React language choice | Brief: preserve stack language unless blocked. |

## Archive → `legacy/`

| From | To | Reason |
|---|---|---|
| `apps/api` | `legacy/api` | Cloudflare Workers + D1/R2/Vectorize API; wrong runtime and write model |
| `apps/web` | `legacy/web` | Vite SPA shot explorer; no SSR deep links; fabricated graph |
| `packages/db` | `legacy/db` | D1 SQLite migrations/queries |
| `packages/shared` (shot product) | `legacy/shared` | Shot taxonomy/types retained for reference; pipeline no longer depends on it |
| `docs/*` | `legacy/docs` | Cloudflare/D1/R2 ops docs for the old product |
| `scripts/clear-local-db.ps1` | `legacy/scripts` | Windows D1 reset helper |

## Replace (new greenfield under original paths)

| Path | New role (2026 Workers cutover) |
|---|---|
| `apps/api` | Hono fetch app mounted on Workers at `/api/*` (D1) |
| `apps/web` | React Router v7 + Vite + `@cloudflare/vite-plugin` SSR |
| `packages/db` | Drizzle sqlite-core + D1 migrations/seed/suggestion batch path |
| `packages/shared` | Community-graph domain types, enums, Zod DTOs, API envelope |
| `packages/importer` | TMDB CLI/import logic against D1 (Queue for Worker imports) |
| `seed/` | Deterministic JSON fixtures + import schema docs |
| `docs/` | New product docs as needed (HANDOFF is root-level) |

> Historical note: the community-graph rebuild briefly used Next.js + Hono/Node + Postgres. That path is retired; see `DECISIONS.md`.

## Move behind the new API

| Capability | How |
|---|---|
| Vision/tagging pipeline output | M8: adapter calls `POST /api/ai/propose` / inserts `suggestion` rows with `source=ai` and `ai_metadata`; never auto-approves |
| Film metadata ideas (`tmdb_id`, posters as URLs) | Importer + film table; posters are external TMDB CDN URLs only |
| CSS token concept | Rewritten as `apps/web` `tokens.css` (neutral reskin surface) |

## Delete

| Item | Status |
|---|---|
| *(none in Milestone 1)* | Prefer archive over delete. If anything is removed later, add a dated row here before deleting. |
| `docker-compose.yml` Postgres service | **Deleted 2026-08-06** — local app path is Wrangler D1 only |
| `@hono/node-server` | **Removed 2026-08-06** — API is Workers-only |
| `postgres` driver in `@precept/db` | **Removed 2026-08-06** — D1 exclusively |
| Next.js app tree (`apps/web/src/app`, `next.config.ts`) | **Deleted 2026-08-06** — replaced by RR7 `apps/web/app` |
| `packages/db/drizzle/*.sql` (Postgres) | **Deleted 2026-08-06** — replaced by `packages/db/migrations` |

## Pipeline dependency change

- Removed `@precept/shared` from `packages/pipeline`.
- Vendored shot `taxonomy` / `types` / `schemas` into `packages/pipeline/src/shared-types/`.
- Pipeline still builds independently; legacy API under `legacy/api` remains the ingest target until M8 rewires it.

## Legal / product posture changes

- New product does **not** expose frame/audio upload or R2 asset serving.
- Anchor JSON may reserve nullable `frame_ref` for a future release; ingest path stays closed.
- AI output is never displayed as fact; enters suggestion queue only.
