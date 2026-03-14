# Vision Pipeline Service

Local FastAPI service used by the TypeScript orchestrator for:

- Shot detection (`/shots/detect`)
- Adaptive keyframe selection (`/keyframes/select`)
- Local embedding extraction (`/embeddings/clip`)

## Run

```bash
cd services/vision-pipeline
python -m venv .venv
. .venv/Scripts/activate
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload
```

Set `ENABLE_PYTHON_VISION_SERVICE=true` and `VISION_SERVICE_URL=http://localhost:8010` in `packages/pipeline/.env`.
