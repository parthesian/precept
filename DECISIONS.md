# Decisions

One-sentence reasons for choices where the brief is silent or the old stack is blocked.

| Decision | Choice | Reason |
|---|---|---|
| Leave `main` untouched | Work only on agent branch; archive in-repo under `legacy/` | Owner will relocate old main contents separately; rebuild must not rewrite history of main. |
| Frontend framework | Next.js App Router (`apps/web`) | Stable server-rendered entity URLs are a hard requirement; the Vite SPA cannot satisfy them. |
| API runtime | Hono on Node (`@hono/node-server`) | Keeps the existing Hono style while leaving Cloudflare Workers/D1, which block Postgres and the new auth model. |
| Database | Postgres + Drizzle ORM | Brief mandates Postgres with SQL/`edges`-style tables and CTEs; Drizzle gives typed schema and migrations without a heavyweight ORM. |
| No graph database | Postgres only | Explicit brief constraint; 1–2 hop traversal is enough at this scale. |
| Auth | Better Auth (email/password + session cookies) | Self-hostable for local/admin bootstrap without a SaaS dependency for Milestones 1–7. |
| IDs | ULID strings | Matches the prior pipeline habit and sorts by time. |
| Client state | Zustand | Named in the brief; already intended in the old web package. |
| Graph renderer | sigma.js + graphology | WebGL canvas with good 150-node interactivity and styling hooks; stronger fit than SVG or raw d3-force alone. |
| Map | MapLibre GL JS + OSM raster tiles | Supports clustered markers and doubling lines without requiring a Mapbox token for local demos. |
| Baseline importer | TMDB API v3 | Schema already centers on `tmdb_id` / `tmdb_person_id`; free developer key with documented rate limits. |
| Poster/backdrop storage | External TMDB CDN URLs only | Hotlinking metadata images is not “hosting frames”; frame/still upload remains closed. |
| Pipeline shared types | Vendored into `packages/pipeline/src/shared-types` | Lets `@precept/shared` become the community-graph domain package without breaking the demoted pipeline. |
| Trusted auto-approve threshold | `TRUSTED_APPROVALS_THRESHOLD=10` (configurable) | Hook required now; tune later without schema changes. |
| API envelope | `{ data, meta, errors }` | Spec consistency for all HTTP responses. |
| Read caching | ETag + `Cache-Control` with `stale-while-revalidate` | Spec requirement for all read endpoints. |
| Local Postgres | `docker-compose` preferred; apt PostgreSQL fallback | VM may lack Docker; both paths documented. |
| AI milestone | Optional; stub acceptable | Product must be complete via hand-authoring if M8 never ships. |
| Frame references | Nullable `frame_ref` on anchors only | Schema room for a future legal path without opening upload in v1. |
