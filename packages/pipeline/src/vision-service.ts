import type { VisionServiceShotDetector } from "./config/pipeline-config.js";

export interface VisionServiceShot {
  shot_index: number;
  start: number;
  end: number;
  duration: number;
  transition: "cut" | "dissolve" | "fade_in" | "fade_out" | "wipe";
}

export interface VisionServiceKeyframeSelection {
  selected_indices: number[];
  diagnostics: {
    candidate_count: number;
    selected_count: number;
    rejected_dedup: number;
    rejected_blur: number;
    avg_motion: number;
    avg_entropy: number;
  };
}

async function callJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vision service request failed (${response.status}): ${text}`);
  }
  return (await response.json()) as T;
}

export async function detectShotsWithVisionService(
  serviceUrl: string,
  inputPath: string,
  detector: VisionServiceShotDetector,
  threshold: number
): Promise<VisionServiceShot[]> {
  const body = { input_path: inputPath, detector, threshold };
  return callJson<VisionServiceShot[]>(`${serviceUrl.replace(/\/$/, "")}/shots/detect`, body);
}

export async function selectKeyframesWithVisionService(
  serviceUrl: string,
  shot: {
    input_path: string;
    shot_index: number;
    start: number;
    end: number;
    frame_paths: string[];
    max_frames: number;
  }
): Promise<VisionServiceKeyframeSelection> {
  return callJson<VisionServiceKeyframeSelection>(`${serviceUrl.replace(/\/$/, "")}/keyframes/select`, shot);
}

export async function embedImageWithVisionService(
  serviceUrl: string,
  imagePath: string
): Promise<{ embedding: number[] }> {
  return callJson<{ embedding: number[] }>(`${serviceUrl.replace(/\/$/, "")}/embeddings/clip`, {
    image_path: imagePath,
  });
}
