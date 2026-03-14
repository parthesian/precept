from __future__ import annotations

import json
import subprocess
from collections.abc import Iterable

from fastapi import FastAPI, HTTPException

from .config import settings
from .heuristics import (
    ensure_paths_exist,
    embedding_from_image,
    frame_features,
    hamming_distance,
)
from .schemas import (
    EmbeddingRequest,
    EmbeddingResponse,
    KeyframeDiagnostics,
    KeyframeSelectRequest,
    KeyframeSelectResponse,
    ShotDetectRequest,
    ShotSegment,
)

app = FastAPI(title="Precept Vision Pipeline", version="0.1.0")


def run_command(args: list[str]) -> tuple[str, str]:
    proc = subprocess.run(args, check=False, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(args)}\n{proc.stderr}")
    return proc.stdout, proc.stderr


def parse_boundaries(stderr: str) -> list[float]:
    boundaries = [0.0]
    for part in stderr.split("pts_time:")[1:]:
        token = part.split()[0]
        try:
            boundaries.append(float(token))
        except ValueError:
            continue
    return sorted(set(boundaries))


def to_shots(boundaries: Iterable[float], duration: float) -> list[ShotSegment]:
    edges = sorted(set([*boundaries, duration]))
    shots: list[ShotSegment] = []
    for idx in range(len(edges) - 1):
        start = edges[idx]
        end = edges[idx + 1]
        if end - start <= 0.05:
            continue
        shots.append(
            ShotSegment(
                shot_index=len(shots),
                start=round(start, 3),
                end=round(end, 3),
                duration=round(end - start, 3),
                transition="cut",
            )
        )
    return shots


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/shots/detect", response_model=list[ShotSegment])
def detect_shots(request: ShotDetectRequest) -> list[ShotSegment]:
    # Current service implementation uses FFmpeg-based detection for all detectors.
    # We keep detector in the contract for future backend specialization.
    try:
        probe_out, _ = run_command(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                request.input_path,
            ]
        )
        duration = float(json.loads(probe_out).get("format", {}).get("duration", "0") or "0")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"ffprobe failed: {exc}") from exc

    if duration <= 0:
        duration = 120.0

    try:
        _, detect_stderr = run_command(
            [
                "ffmpeg",
                "-i",
                request.input_path,
                "-vf",
                f"select='gt(scene,{request.threshold})',showinfo",
                "-f",
                "null",
                "-",
            ]
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"ffmpeg detect failed: {exc}") from exc

    boundaries = parse_boundaries(detect_stderr)
    shots = to_shots(boundaries, duration)
    if shots:
        return shots
    return [
        ShotSegment(
            shot_index=0,
            start=0.0,
            end=round(duration, 3),
            duration=round(duration, 3),
            transition="cut",
        )
    ]


@app.post("/keyframes/select", response_model=KeyframeSelectResponse)
def select_keyframes(request: KeyframeSelectRequest) -> KeyframeSelectResponse:
    try:
        ensure_paths_exist(request.frame_paths)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    candidates = []
    rejected_blur = 0
    rejected_dedup = 0
    kept_hashes: list[int] = []
    blur_threshold = 24.0

    for idx, path in enumerate(request.frame_paths):
        features = frame_features(path)
        if float(features["sharpness"]) < blur_threshold:
            rejected_blur += 1
            continue
        is_dup = any(hamming_distance(int(features["hash"]), existing) <= 5 for existing in kept_hashes)
        if is_dup:
            rejected_dedup += 1
            continue
        kept_hashes.append(int(features["hash"]))
        candidates.append(
            {
                "index": idx,
                "entropy": float(features["entropy"]),
                "sharpness": float(features["sharpness"]),
                "hash": int(features["hash"]),
            }
        )

    pool = candidates if candidates else [{"index": 0, "entropy": 0.0, "sharpness": 0.0, "hash": 0}]
    avg_entropy = sum(item["entropy"] for item in pool) / max(1, len(pool))

    motion_samples = []
    for i in range(1, len(pool)):
        motion_samples.append(float(hamming_distance(pool[i - 1]["hash"], pool[i]["hash"])))
    avg_motion = sum(motion_samples) / len(motion_samples) if motion_samples else 0.0

    target = min(request.max_frames, len(pool))
    selected_indices = []
    for i in range(target):
        pick = min(len(pool) - 1, int((i + 0.5) * (len(pool) / target)))
        selected_indices.append(pool[pick]["index"])
    selected_indices = sorted(set(selected_indices))

    diagnostics = KeyframeDiagnostics(
        candidate_count=len(request.frame_paths),
        selected_count=len(selected_indices),
        rejected_dedup=rejected_dedup,
        rejected_blur=rejected_blur,
        avg_motion=round(avg_motion, 4),
        avg_entropy=round(avg_entropy, 4),
    )
    return KeyframeSelectResponse(selected_indices=selected_indices, diagnostics=diagnostics)


@app.post("/embeddings/clip", response_model=EmbeddingResponse)
def clip_embedding(request: EmbeddingRequest) -> EmbeddingResponse:
    try:
        embedding = embedding_from_image(request.image_path)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Embedding extraction failed: {exc}") from exc
    return EmbeddingResponse(embedding=embedding)
