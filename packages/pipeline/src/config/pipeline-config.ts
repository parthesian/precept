import { AnalysisTier } from "@precept/shared";

export type VlmProvider = "gemini" | "anthropic" | "qwen_local";
export type VisionServiceShotDetector = "ffmpeg_scdet" | "pyscenedetect" | "transnetv2";

export interface PipelineConfig {
  api: {
    preceptApiUrl: string;
    preceptApiKey: string;
  };
  vlm: {
    defaultTier: AnalysisTier;
    tier1Provider: VlmProvider;
    tier1Model: string;
    tier2Provider: VlmProvider;
    tier2Model: string;
    maxFramesPerShot: number;
    imageMaxDimension: number;
    summaryCompressEveryShots: number;
  };
  features: {
    enableQwenLocal: boolean;
    enableDreamsim: boolean;
    enableDepthAnything: boolean;
    enablePythonVisionService: boolean;
    enableAdaptiveKeyframes: boolean;
  };
  shot: {
    detector: VisionServiceShotDetector;
    sceneThreshold: number;
    maxFramesCandidate: number;
  };
  endpoints: {
    visionServiceUrl?: string;
    qwenBaseUrl?: string;
  };
  keys: {
    anthropicApiKey?: string;
    geminiApiKey?: string;
  };
}

function readString(name: string, fallback?: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function readBool(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asTier(value: string | undefined, fallback: AnalysisTier): AnalysisTier {
  return value === AnalysisTier.TIER_0 || value === AnalysisTier.TIER_1 || value === AnalysisTier.TIER_2
    ? value
    : fallback;
}

function asProvider(value: string | undefined, fallback: VlmProvider): VlmProvider {
  return value === "gemini" || value === "anthropic" || value === "qwen_local" ? value : fallback;
}

function asDetector(
  value: string | undefined,
  fallback: VisionServiceShotDetector
): VisionServiceShotDetector {
  return value === "ffmpeg_scdet" || value === "pyscenedetect" || value === "transnetv2" ? value : fallback;
}

export function loadPipelineConfig(): PipelineConfig {
  return {
    api: {
      preceptApiUrl: readString("PRECEPT_API_URL", "") ?? "",
      preceptApiKey: readString("PRECEPT_API_KEY", "") ?? "",
    },
    vlm: {
      defaultTier: asTier(readString("PIPELINE_DEFAULT_TIER"), AnalysisTier.TIER_1),
      tier1Provider: asProvider(readString("PIPELINE_TIER1_PROVIDER"), "gemini"),
      tier1Model: readString("PIPELINE_TIER1_MODEL", "gemini-2.5-flash-lite") ?? "gemini-2.5-flash-lite",
      tier2Provider: asProvider(readString("PIPELINE_TIER2_PROVIDER"), "anthropic"),
      tier2Model: readString("PIPELINE_TIER2_MODEL", "claude-sonnet-4-6") ?? "claude-sonnet-4-6",
      maxFramesPerShot: Math.max(1, Math.floor(readNumber("PIPELINE_MAX_FRAMES_PER_SHOT", 7))),
      imageMaxDimension: Math.max(128, Math.floor(readNumber("PIPELINE_IMAGE_MAX_DIM", 768))),
      summaryCompressEveryShots: Math.max(3, Math.floor(readNumber("PIPELINE_SUMMARY_COMPRESS_EVERY", 15))),
    },
    features: {
      enableQwenLocal: readBool("ENABLE_QWEN_LOCAL", false),
      enableDreamsim: readBool("ENABLE_DREAMSIM", false),
      enableDepthAnything: readBool("ENABLE_DEPTH_ANYTHING", true),
      enablePythonVisionService: readBool("ENABLE_PYTHON_VISION_SERVICE", false),
      enableAdaptiveKeyframes: readBool("ENABLE_ADAPTIVE_KEYFRAMES", true),
    },
    shot: {
      detector: asDetector(readString("PIPELINE_SHOT_DETECTOR"), "ffmpeg_scdet"),
      sceneThreshold: readNumber("PIPELINE_SCENE_THRESHOLD", 0.3),
      maxFramesCandidate: Math.max(6, Math.floor(readNumber("PIPELINE_MAX_CANDIDATE_FRAMES", 24))),
    },
    endpoints: {
      visionServiceUrl: readString("VISION_SERVICE_URL"),
      qwenBaseUrl: readString("QWEN_BASE_URL"),
    },
    keys: {
      anthropicApiKey: readString("ANTHROPIC_API_KEY"),
      geminiApiKey: readString("GEMINI_API_KEY"),
    },
  };
}

export function assertIngestConfig(config: PipelineConfig): void {
  if (!config.api.preceptApiUrl || !config.api.preceptApiKey) {
    throw new Error("Set PRECEPT_API_URL and PRECEPT_API_KEY in environment.");
  }
}
