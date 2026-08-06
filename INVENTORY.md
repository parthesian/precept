# Precept Inventory (pre-rebuild)

Snapshot of the repository before the community-graph rebuild. Status key: **live** = wired end-to-end against storage; **scaffold** = UI/API present but incomplete or fabricated; **docs** = operational notes only.

## Monorepo layout (before archive)

| Path | Role | Status |
|---|---|---|
| `apps/api` | Hono API on Cloudflare Workers (D1, R2, Vectorize) | live for films/shots/ingest; thin for connections |
| `apps/web` | Vite + React SPA (shot explore + graph page) | live-ish explore; scaffold graph |
| `packages/db` | D1 SQL migrations + query helpers | live schema for shots product |
| `packages/shared` | Zod schemas, shot taxonomy, TS types | live for pipeline/API |
| `packages/pipeline` | TS ingest orchestrator (ffmpeg, VLM tagging, upload) | solid |
| `services/vision-pipeline` | Python FastAPI: shot detect, keyframes, CLIP | solid |
| `docs/*` | Local pipeline + Cloudflare setup | docs |
| `scripts/clear-local-db.ps1` | Windows D1 reset helper | docs/tooling |

## API (`apps/api` → now `legacy/api`)

| Route area | File | Status | Notes |
|---|---|---|---|
| Health | `src/index.ts` | live | `{ name, status }` |
| Films CRUD list/get/post | `routes/films.ts` | live | Direct writes to `films` |
| Shots + assets | `routes/shots.ts` | live | Serves R2 frame/audio bytes |
| Tag / text search | `routes/search.ts` | live | SQL filters on shot tags/descriptions |
| Similar search | `routes/search.ts` | scaffold | Requires caller-supplied embedding; incomplete |
| Shot connections | `routes/connections.ts` | thin | Shot↔shot CRUD; no evidence/moderation |
| Graph | `routes/connections.ts` | thin | Returns raw connection rows |
| Ingest | `routes/ingest.ts` | live | Writes film+shots, R2 frames, Vectorize |
| Directors | `routes/directors.ts` | thin | Minimal |
| Auth | `middleware/auth.ts` | minimal | Ingest API key only |

## Web (`apps/web` → now `legacy/web`)

| Surface | File | Status | Notes |
|---|---|---|---|
| Shell / nav | `App.tsx` | scaffold routing | In-memory page state; no URL deep links |
| Home | `pages/Home.tsx` | live UI | Marketing-style landing |
| Explore | `pages/Explore.tsx` | live-ish | Filterable shot grid from API |
| Film timeline | `FilmTimeline.tsx` | live-ish | Latest film’s shots |
| Shot detail | `ShotDetail.tsx` | live-ish | Rich tag display |
| Connections graph | `ConnectionGraph.tsx` | **scaffold** | Fabricates ring layout + sequential fake edges from search hits |
| Comparison | `ComparisonView.tsx` | scaffold | Placeholder copy |
| Director | `pages/Director.tsx` | scaffold | Stub |
| Shared store | zustand in package.json | unused | Not wired |
| Design tokens | `styles/globals.css` | reusable pattern | Surfaces, connection colors, type scale |

## Data model (D1)

Tables: `films`, `shots` (+ analysis metadata), `connections` (shot↔shot), `directors`.  
No places, precepts, suggestions, revisions, votes, users, spotlights.  
Confidence/connection enums differ from the community-graph brief.

## Vision pipeline (retained in place)

| Piece | Status | Notes |
|---|---|---|
| `services/vision-pipeline` | solid | FastAPI: `/shots/detect`, `/keyframes/select`, `/embeddings/clip` |
| `packages/pipeline` | solid | Scene detect, adaptive frames, tiered VLM, narrative memory, upload CLI |
| Config | solid | Provider routing in `pipeline-config.ts` |

**Product role after rebuild:** demoted to *proposal generator* writing into the suggestion queue (Milestone 8). Not required for Milestones 1–7.

## Gaps vs community-graph brief

- Datastore is D1/SQLite, not Postgres
- No SSR / stable entity URLs
- Hosts copyrighted frames in R2 (disallowed in v1 product)
- Direct writes to live connection/film tables
- Influence graph is shot-centric and mostly fabricated in UI
- No contribution, moderation, provenance, places, precepts, or spotlight records
