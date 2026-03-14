from pydantic_settings import BaseSettings, SettingsConfigDict


class VisionSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    pipeline_default_tier: str = "tier_1"
    pipeline_tier1_provider: str = "gemini"
    pipeline_tier1_model: str = "gemini-2.5-flash-lite"
    pipeline_tier2_provider: str = "anthropic"
    pipeline_tier2_model: str = "claude-sonnet-4-6"
    pipeline_image_max_dim: int = 768
    pipeline_max_frames_per_shot: int = 7
    pipeline_shot_detector: str = "ffmpeg_scdet"
    pipeline_scene_threshold: float = 0.3
    pipeline_max_candidate_frames: int = 24


settings = VisionSettings()
