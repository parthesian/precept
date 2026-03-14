# Precept

Cinematic visual genealogy platform for shot-level analysis, similarity, and connection mapping.

## Intelligent Pipeline Architecture

Precept now supports a hybrid pipeline in one monorepo:

- **Python local analysis service** (`services/vision-pipeline`) for shot detection, adaptive keyframe selection, and local embeddings.
- **TypeScript orchestrator** (`packages/pipeline`) for extraction, tiered VLM routing, narrative memory, and ingest upload.
- **TypeScript API + Web** (`apps/api`, `apps/web`) remain the serving and exploration layers.

### Tiered routing model

- `tier_0`: local heuristic fallback (no remote VLM call).
- `tier_1`: routine shots routed to low-cost model (Gemini Flash-Lite or local Qwen).
- `tier_2`: complex shots routed to premium model (Gemini Pro or Anthropic).

Model/provider routing and feature flags are centralized in `packages/pipeline/src/config/pipeline-config.ts`.

## Documentation

- Local pipeline upload + verification:
  - `docs/01-local-pipeline-testing.md`
- Cloudflare + repo setup:
  - `docs/02-cloudflare-and-repo-setup.md`
- Intelligent cinematic pipeline architecture + operations:
  - `docs/03-intelligent-video-analysis-pipeline.md`

## Quick Start

```bash
npm install
npm run typecheck
npm run dev:api
```

In another terminal:

```bash
npm run dev:web
```

## Pipeline Quick Start (Hybrid)

1. Start the Python vision service:

```bash
cd services/vision-pipeline
python -m venv .venv
. .venv/Scripts/activate
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

2. Configure `packages/pipeline/.env` (example keys):

```env
PRECEPT_API_URL=http://localhost:8787
PRECEPT_API_KEY=dev-local-key

ENABLE_PYTHON_VISION_SERVICE=true
VISION_SERVICE_URL=http://localhost:8010
ENABLE_ADAPTIVE_KEYFRAMES=true

PIPELINE_TIER1_PROVIDER=gemini
PIPELINE_TIER1_MODEL=gemini-2.5-flash-lite
PIPELINE_TIER2_PROVIDER=anthropic
PIPELINE_TIER2_MODEL=claude-sonnet-4-6

GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
```

3. Run the end-to-end ingest pipeline:

```bash
npx turbo build --filter=@precept/pipeline
node packages/pipeline/dist/cli.js process --input "<video-path>" --title "<title>" --year <year> --director "<director>"
```
