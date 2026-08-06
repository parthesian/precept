# HANDOFF — Precept community graph

For you (Parth), not another agent. Order of operations to get from a clean checkout to authoring content.

## 1. Setup

**Install first**

- Node.js 22+
- npm 10+
- PostgreSQL 16 (Docker or local)

**From a clean checkout**

```bash
cp .env.example .env
# edit DATABASE_URL / AUTH_SECRET if needed

# Postgres via Docker:
docker compose up -d postgres

# Or apt/local Postgres with user/db `precept` / password `precept`

npm install
npm run db:migrate
npm run db:seed
npm run dev:api    # http://localhost:8787
npm run dev:web    # http://localhost:3000
```

Seed loads ~40 films, ~150 connections, places, precepts, pending suggestions, and a Spotlight on *The Dark Knight*.

## 2. Configuration

| Variable | Required? | Purpose | Where to get it |
|---|---|---|---|
| `DATABASE_URL` | **Required** | Postgres connection | Local compose default: `postgres://precept:precept@localhost:5432/precept` |
| `AUTH_SECRET` | **Required** | Session signing material (any long random string) | Generate yourself (`openssl rand -hex 32`) |
| `API_PORT` | Optional | API port (default `8787`) | — |
| `CORS_ORIGIN` / `WEB_ORIGIN` | Optional | Browser origin for cookies (default `http://localhost:3000`) | — |
| `NEXT_PUBLIC_API_URL` | **Required for web** | Browser → API base URL | Usually `http://localhost:8787` |
| `TRUSTED_APPROVALS_THRESHOLD` | Optional | Approved suggestions before `trusted` auto-approve hook (default `10`) | — |
| `RATE_LIMIT_SUGGESTIONS_PER_HOUR` | Optional | Default `60` | — |
| `RATE_LIMIT_VOTES_PER_HOUR` | Optional | Default `120` | — |
| `TMDB_API_KEY` | Optional until import | TMDB v3 API key for film/person importer | https://www.themoviedb.org/settings/api (free developer key) |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `VISION_SERVICE_URL` | **Milestone 8 only** | Vision/VLM proposal feeder | Provider consoles; not needed for hand-authoring |

## 3. Getting film data in

**Source:** TMDB API v3  
**Key page:** https://www.themoviedb.org/settings/api  
**Terms / rate limits:** Free developer keys are fine for personal/import use; stay around **~40 requests / 10 seconds** (the importer sleeps ~260ms between calls). Do not redistribute TMDB image binaries; we store **CDN URLs only**.

```bash
export TMDB_API_KEY=...
npm run import:tmdb -- --tmdb-ids=155,27205,389
# or
npm run import:tmdb -- --titles="The Dark Knight,Inception,12 Angry Men"
```

**Sensible first import:** a dozen titles in one influence neighborhood (e.g. Nolan + Hitchcock + Kurosawa). Expect **~1–2 minutes** for ~10 films with credits because of rate pacing.

After import, search in the UI should find the film immediately (Postgres `pg_trgm` + ILIKE).

## 4. Becoming an admin

```bash
npm run admin:create -- --email=you@example.com --password='choose-a-strong-password' --handle=you
```

This creates the user (or upgrades an existing one) to `role=admin`.

Then open http://localhost:3000/login and sign in. Seed also includes `admin@example.com` — set its password with the same command.

## 5. My first hour (hand-authoring loop)

1. Open `/` — Spotlight on *The Dark Knight* should link into Homage in one click; a featured connection link is the second click.
2. `/homage/film/the-dark-knight` — graph + keyboardable side list. `[` / `]` switch Vista / Homage / Focus; selection carries across panes.
3. Turn **Suggest** on (after login). Use **Propose connection** in the Homage sidebar: pick target film id (from seed, e.g. `film_heat`), type, tier, rationale, evidence. Check **Self-approve** as admin — one click applies + writes a revision.
4. `/vista/film/the-dark-knight` — markers for Chicago / Wacker / doubling toward Gotham.
5. `/focus` — open *Dutch Angle* (or any precept); chronological spine of exemplars.
6. `/moderate` — `j`/`k` move, `a` approve, `r` reject pending AI/user suggestions.
7. There is **no** `POST /api/connections`. Everything live goes through suggestions → approve (enforced in `@precept/db` + missing HTTP route).

## 6. What’s stubbed / deferred

| Item | State | To finish |
|---|---|---|
| Visual aesthetic | Neutral CSS tokens only (`apps/web/src/styles/tokens.css`) | Reskin tokens; no scattered hex |
| AI vision proposals | `/api/ai/propose` queues a **stub** AI suggestion with metadata; never auto-approves | Wire `packages/pipeline` + `services/vision-pipeline` to emit real payloads into `createSuggestion({ source: "ai" })` |
| Merge suggestions | Rejected at apply time | Implement merge apply path |
| Place/precept create forms | Connection form present; other entity forms are API-ready via `POST /api/suggestions` | Add matching Suggest-mode forms (same payload shapes as seed) |
| Spotlight authoring UI | Records + landing work; create via suggestion API / seed | Admin form for spotlight create/publish |
| Map clustering | Distinct markers + doubling lines | Add MapLibre cluster layer if pin density grows |
| Frame hosting | Explicitly closed; `frame_ref` reserved on anchors | Keep closed unless legal review changes |

Legacy shot product (Cloudflare Workers, D1, R2 frames, Vite explore UI) lives under `legacy/` untouched on purpose.

## 7. Known limits

- Graph renderer (sigma.js) caps ~**150** visible nodes; extras collapse to “+N more”. Comfortable at seed scale; revisit layout cost above a few hundred neighbors.
- `/api/graph` derived/computed edges can combinatorial-expand in dense collections — keep those toggles off by default in the UI.
- Read endpoints use ETag + `stale-while-revalidate`; fine for editorial traffic, not a CDN strategy yet.
- Votes never promote `confidence_tier`; they only move `community_score` / mod-queue sort.
- `confirmed` tier **requires** interview/commentary/book/article evidence — enforced in the approval path (see `@precept/db` tests).
- Search is trigram/ILIKE — good through thousands of rows; add dedicated FTS if you pass tens of thousands of entities.
- OSM raster tiles are for local/demo; for production pick a tile policy that matches your traffic.

## Docs map

- `INVENTORY.md` — what the old repo was  
- `MIGRATION.md` — what moved where  
- `DECISIONS.md` — stack choices  
- `seed/README.md` — fixture schema  
- `legacy/` — archived shot-centric product  
