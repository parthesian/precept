from typing import Literal

from pydantic import BaseModel, Field


TransitionType = Literal["cut", "dissolve", "fade_in", "fade_out", "wipe"]
DetectorType = Literal["ffmpeg_scdet", "pyscenedetect", "transnetv2"]


class ShotDetectRequest(BaseModel):
    input_path: str
    detector: DetectorType = "ffmpeg_scdet"
    threshold: float = 0.3


class ShotSegment(BaseModel):
    shot_index: int
    start: float
    end: float
    duration: float
    transition: TransitionType = "cut"


class KeyframeSelectRequest(BaseModel):
    input_path: str
    shot_index: int
    start: float
    end: float
    frame_paths: list[str]
    max_frames: int = Field(default=7, ge=1, le=12)


class KeyframeDiagnostics(BaseModel):
    candidate_count: int
    selected_count: int
    rejected_dedup: int
    rejected_blur: int
    avg_motion: float
    avg_entropy: float


class KeyframeSelectResponse(BaseModel):
    selected_indices: list[int]
    diagnostics: KeyframeDiagnostics


class EmbeddingRequest(BaseModel):
    image_path: str


class EmbeddingResponse(BaseModel):
    embedding: list[float]
