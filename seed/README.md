# Seed fixtures

Deterministic JSON fixtures for local development. Every record includes `"is_seed_data": true`.

## Files

| File | Contents |
|---|---|
| `users.json` | Roles: anon, contributor, trusted, moderator, admin |
| `films.json` | ~40 edge-dense films |
| `people.json` | Directors/DPs/composers linked via credits |
| `credits.json` | person↔film roles |
| `collections.json` | Franchise/trilogy/thematic groupings + ordered film ids |
| `connections.json` | ~150 film↔film edges across types/tiers |
| `evidence.json` | Evidence attached to connections/locations/examples |
| `places.json` | ~35 places |
| `film_locations.json` | ~60 locations including ≥5 doubling relationships |
| `precepts.json` | ~30 precepts |
| `precept_relations.json` | Ontology edges |
| `precept_examples.json` | Precept↔film examples |
| `suggestions.json` | ~20 pending (user + AI) |
| `spotlights.json` | Featured landing record(s) |

## Import schema

Records use **snake_case** field names matching the API/payload shape (not Drizzle camelCase). IDs are stable ULID-like strings prefixed for readability in fixtures (e.g. `film_dark_knight`).

Load with:

```bash
npm run db:seed
```

Replace wholesale by swapping JSON files and re-running seed (after `npm run db:reset && npm run db:migrate`).

## Regenerating

```bash
npx tsx packages/db/src/seed/generate.ts
```
