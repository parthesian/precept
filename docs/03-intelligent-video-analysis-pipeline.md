# Intelligent Video Analysis Pipeline

This document defines the production architecture for Precept's intelligent cinematic analysis pipeline.

## Goals

- Reduce end-to-end analysis cost through local-first processing.
- Improve shot understanding via adaptive keyframes and contextual memory.
- Keep API and web contracts stable while evolving pipeline internals.
- Keep everything in a single monorepo.

## High-Level Architecture

1. **Local vision phase (Python service)**
   - Shot detection
   - Adaptive keyframe selection
   - Local embeddings fallback
2. **Orchestration phase (TypeScript pipeline package)**
   - Audio analysis + frame extraction + model routing
   - Tiered VLM classification
   - Narrative context memory compression
3. **Persistence and serving phase (API + DB + R2 + Vectorize)**
   - Ingest shot metadata/media
   - Serve search and shot assets

## Key Components

- `services/vision-pipeline/app/main.py`
  - `/shots/detect`
  - `/keyframes/select`
  - `/embeddings/clip`
- `packages/pipeline/src/frame-extract.ts`
  - Candidate frame extraction and adaptive selection
- `packages/pipeline/src/tagger.ts`
  - Tiered routing (`tier_0|tier_1|tier_2`) and running narrative memory
- `packages/pipeline/src/embedder.ts`
  - CLIP embeddings (local via transformers) with optional vision-service endpoint
- `packages/pipeline/src/config/pipeline-config.ts`
  - Single source for model/provider/config flags

## Centralized Configuration

All key routing knobs and feature flags are read from environment variables and normalized by `loadPipelineConfig()`.

Core variables:

- `PIPELINE_TIER1_PROVIDER`, `PIPELINE_TIER1_MODEL`
- `PIPELINE_TIER2_PROVIDER`, `PIPELINE_TIER2_MODEL`
- `PIPELINE_DEFAULT_TIER`
- `ENABLE_PYTHON_VISION_SERVICE`, `VISION_SERVICE_URL`
- `ENABLE_ADAPTIVE_KEYFRAMES`
- `PIPELINE_MAX_CANDIDATE_FRAMES`, `PIPELINE_MAX_FRAMES_PER_SHOT`
- `PIPELINE_SUMMARY_COMPRESS_EVERY`

## Data Contract Additions

Shot payload now supports optional intelligent-pipeline fields:

- `analysis_tier`
- `analysis_provider`
- `analysis_model`
- `analysis_confidence`
- `keyframe_diagnostics`

DB migration:

- `packages/db/migrations/0002_intelligent_pipeline_metadata.sql`

## Operational Playbook

1. Start API and vision service.
2. Run `process` command on a short clip first (`--max-shots 20-40`).
3. Validate:
   - shots are ingested
   - thumbnails and audio URLs resolve
   - analysis metadata fields are populated
4. Run a full film ingest.
5. Compare cost/performance:
   - frames selected per shot
   - tier escalation distribution
   - remote VLM call volume

## Next Improvements

- Replace heuristic local embedding endpoint with production CLIP/DreamSim service models.
- Add stronger confidence calibration for tier routing.
- Add evaluation harness for precision/recall and cost-per-film tracking.
