# Decisions

One-sentence reasons for choices where the brief is silent or the old stack is blocked.

| Decision | Choice | Reason |
|---|---|---|
| Leave `main` untouched | Work only on agent branch; archive in-repo under `legacy/` | Owner will relocate old main contents separately; rebuild must not rewrite history of main. |
| **Deploy runtime (2026 cutover)** | **Cloudflare Workers + D1** | Single origin for SSR UI + `/api`; native D1/KV/Queues; retire Postgres for the live app. |
| Frontend framework | **React Router v7 + Vite + `@cloudflare/vite-plugin`** | Official CF SSR path; same-origin cookies; no OpenNext/Next on Workers. |
| API runtime | **Hono on Workers** (`apps/api` → `createApp`) | Keep route shape; drop `@hono/node-server` for the default path. |
| Database | **D1 + Drizzle sqlite-core** | Native CF binding; typed schema; integer ms timestamps; JSON as text. |
| Search | **SQLite LIKE + FTS5** | Replaces unused `pg_trgm`; good through early/mid scale. |
| Auth | **Cookie sessions in D1** (opaque tokens) | Already custom; avoid Better Auth CF friction. Passwords: Web Crypto PBKDF2. |
| Rate limits | **Workers KV** | Replace in-memory Map (useless on edge). |
| ETags / hashing | **Web Crypto** | Drop `node:crypto`. |
| Secrets / env | **Wrangler secrets + `.dev.vars`** | Replace root `.env` for runtime; keep `.env` only for optional Node CLIs. |
| Async / heavy import | **Cloudflare Queues (`tmdb-import`)** | TMDB full import must not run inline in a request. |
| Static assets | **Workers Assets via Vite plugin** | Ships RR7 client bundles with the Worker. |
| Object storage | None for v1 | Frames remain closed; TMDB CDN URLs only. |
| Vision pipeline | Stay Node + Python locally/containers | ffmpeg/sharp/transformers cannot run on Workers. |
| Local Postgres | **Removed for app path** | Local = `wrangler dev` + local D1. |
| No graph database | SQL only (D1) | 1–2 hop traversal is enough at this scale. |
| IDs | ULID strings | Matches prior pipeline habit and sorts by time. |
| Client state | Zustand | Named in the brief. |
| Graph renderer | sigma.js + graphology | Client-only (WebGL); gated with `ClientOnly`. |
| Map | MapLibre GL JS + OSM raster tiles | Client-only; same gate. |
| Baseline importer | TMDB API v3 | Schema centers on `tmdb_id` / `tmdb_person_id`. |
| Poster/backdrop storage | External TMDB CDN URLs only | Frame/still upload remains closed. |
| Pipeline shared types | Vendored into `packages/pipeline/src/shared-types` | Domain package stays community-graph focused. |
| Trusted auto-approve threshold | `TRUSTED_APPROVALS_THRESHOLD=10` | Configurable without schema changes. |
| API envelope | `{ data, meta, errors }` | Spec consistency. |
| Read caching | ETag + `stale-while-revalidate` | Spec requirement. |
| AI milestone | Optional; stub acceptable | Hand-authoring remains complete without M8. |
| Frame references | Nullable `frame_ref` on anchors only | Future legal path without opening upload in v1. |
| Approve atomicity | **D1 `db.batch()`** for revision + suggestion + contribution | D1 has no interactive transactions; highest-risk correctness path tested on Miniflare/D1. |

## Superseded (community-graph rebuild era)

| Decision | Former choice | Superseded by |
|---|---|---|
| Frontend | Next.js App Router | React Router v7 on Workers |
| API | Hono on Node | Hono on Workers |
| Database | Postgres + Drizzle | D1 + Drizzle sqlite-core |
| Auth product | Better Auth (planned) | Custom cookie sessions (kept) |
| Local DB | docker-compose Postgres | Wrangler local D1 |
