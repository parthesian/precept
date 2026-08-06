# HANDOFF — Precept community graph

For you (Parth), not another agent. Order of operations to get from a clean checkout to authoring content.

## 1. Setup

**Install first**

- Node.js 22+
- npm 10+
- Wrangler (installed with the repo) — **local D1 / KV / Queues; no Postgres**

**From a clean checkout**

```bash
cp .dev.vars.example .dev.vars
cp .dev.vars apps/web/.dev.vars
# edit AUTH_SECRET (required) and TMDB_API_KEY (when importing)

npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open the Vite URL printed in the terminal (typically http://localhost:5173). One origin serves React Router SSR and Hono `/api/*` — cookies work without CORS.

Seed loads ~40 films, ~150 connections, places, precepts, pending suggestions, and a Spotlight on *The Dark Knight*.

## 2. Configuration

| Variable / binding | Required? | Purpose | Where |
|---|---|---|---|
| `AUTH_SECRET` | **Required** | Session material | `.dev.vars` / `wrangler secret` |
| `TMDB_API_KEY` | Optional until import | TMDB v3 key | `.dev.vars` / secret |
| `DB` | Binding | D1 database | `apps/web/wrangler.jsonc` |
| `RATE_LIMIT` | Binding | KV hourly counters | wrangler |
| `TMDB_IMPORT_QUEUE` | Binding | Queue producer/consumer | wrangler |
| `TRUSTED_APPROVALS_THRESHOLD` | Optional (default `10`) | Trusted auto-approve | wrangler `vars` |
| `RATE_LIMIT_*_PER_HOUR` | Optional | Suggestion/vote/TMDB caps | wrangler `vars` |
| `ENVIRONMENT` | Optional | `production` → Secure cookies | wrangler `vars` |

Deprecated for the app path: `DATABASE_URL`, `NEXT_PUBLIC_API_URL`, split-origin `CORS_ORIGIN`.

## 3. Getting film data in

**Source:** TMDB API v3  
**Key page:** https://www.themoviedb.org/settings/api  

### Hybrid catalog strategy

1. **Bootstrap (metadata only)** — Node CLI against local/remote D1  
2. **Live TMDB search** — `GET /api/tmdb/search` (KV rate-limited)  
3. **Lazy full import** — `POST /api/films/import` **enqueues** `{ tmdbId }` on `tmdb-import` when the Queue binding is present; consumer imports one film (paced). Admins may still self-approve paths that run inline when Queue is unavailable.

```bash
export TMDB_API_KEY=...

npm run import:tmdb -- --bootstrap --top=100
npm run import:tmdb -- --tmdb-ids=155,27205,389
npm run import:bootstrap
```

Show TMDB attribution wherever TMDB data/images are displayed.

## 4. Becoming an admin

```bash
npm run admin:create -- --email=you@example.com --password='choose-a-strong-password' --handle=you
```

Then open `/login`. Seed includes `admin@example.com` — set its password with the same command.

## 5. My first hour (hand-authoring loop)

1. Open `/` — Spotlight on *The Dark Knight* → Homage in one click.  
2. `/homage/film/the-dark-knight` — graph + side list. `[` / `]` switch Vista / Homage / Focus.  
3. Turn **Suggest** on (after login). Propose connection; **Self-approve** as admin.  
4. `/vista/film/the-dark-knight` — locations; **Add location** in Suggest mode.  
5. `/focus` — precepts; create precept/example in Suggest mode.  
6. `/` Spotlight — **Publish Spotlight** in Suggest mode.  
7. Connection detail — edit/delete in Suggest mode.  
8. `/moderate` — `j`/`k` move, `a` approve, `r` reject.  
9. There is **no** `POST /api/connections`. Live writes go through suggestions → approve.

## 6. What’s stubbed / deferred

| Item | State | To finish |
|---|---|---|
| Visual aesthetic | Neutral CSS tokens | Reskin `tokens.css` |
| AI vision proposals | `/api/ai/propose` stub | Wire pipeline → suggestions with service token |
| Merge suggestions | Rejected at apply | Implement merge apply |
| Map clustering | Distinct markers | MapLibre clusters if needed |
| Frame hosting | Closed | Keep closed unless legal review changes |
| Production deploy | Config ready | Create remote D1, set secrets, `wrangler deploy`, custom domain |

Legacy shot product lives under `legacy/` untouched.

## 7. Known limits

- Graph (sigma.js) caps ~150 visible nodes.  
- `/api/graph` derived edges can expand — keep collection-derived toggles off by default.  
- Search: FTS5 + LIKE fallback.  
- D1 approve path uses `db.batch()` for revision/status/contribution bookkeeping (no interactive SQL transactions).  
- Worker CPU: keep heavy graph client-side; Queue TMDB imports.  
- Nested `wrangler` versions in workspaces can corrupt local D1 state (`_cf_ALARM`); keep a single wrangler version (repo override `4.119.0`) and wipe `apps/web/.wrangler` if you hit that error.

## Docs map

- `INVENTORY.md` — what the old repo was  
- `MIGRATION.md` — historical archive notes  
- `DECISIONS.md` — stack choices (Workers+D1 cutover)  
- `seed/README.md` — fixture schema  
- `legacy/` — archived shot-centric product  
