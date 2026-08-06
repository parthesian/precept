# Vision Pipeline Service (demoted)

Local FastAPI service used by the TypeScript orchestrator for:

- Shot detection (`/shots/detect`)
- Adaptive keyframe selection (`/keyframes/select`)
- Local embedding extraction (`/embeddings/clip`)

**Product status:** retained as an optional *proposal generator* for Milestone 8. It must not write live facts — only suggestion-queue rows with `source=ai`. Milestones 1–7 do not require this service.

## Run

```bash
cd services/vision-pipeline
python -m venv .venv
. .venv/bin/activate
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

Set `ENABLE_PYTHON_VISION_SERVICE=true` and `VISION_SERVICE_URL=http://localhost:8010` in the pipeline env when wiring Milestone 8.
