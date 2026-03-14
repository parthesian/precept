import { join } from "node:path";
import { copyFile } from "node:fs/promises";
import sharp from "sharp";
import { getFfmpegBinary, runCommand } from "./ffmpeg.js";
import { ensureDir } from "./utils.js";
import { loadPipelineConfig } from "./config/pipeline-config.js";
import type { DetectedShot } from "./scene-detect.js";
import { selectKeyframesWithVisionService } from "./vision-service.js";

export interface ExtractedFrameSet {
  shot_index: number;
  timecode_start: number;
  timecode_end: number;
  duration_seconds: number;
  frames: string[];
  thumbnail: string;
  audio_clip?: string;
  keyframe_diagnostics?: {
    candidate_count?: number;
    selected_count?: number;
    rejected_dedup?: number;
    rejected_blur?: number;
    avg_motion?: number;
    avg_entropy?: number;
  };
}

interface CandidateScore {
  index: number;
  path: string;
  entropy: number;
  sharpness: number;
  hash: bigint;
}

function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x > 0n) {
    x &= x - 1n;
    count += 1;
  }
  return count;
}

async function averageHash(path: string): Promise<bigint> {
  const { data } = await sharp(path)
    .resize(8, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sum = data.reduce((acc, value) => acc + value, 0);
  const mean = sum / data.length;
  let hash = 0n;
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] >= mean) {
      hash |= 1n << BigInt(i);
    }
  }
  return hash;
}

function computeTargetFrameCount(durationSec: number, motion: number, entropy: number): number {
  const base = 1;
  const durationFactor = Math.max(0, (durationSec - 2) / 3);
  const motionFactor = Math.min(2, motion / 10.0);
  const complexityFactor = Math.min(1, Math.max(0, (entropy - 4.0) / 3.0));
  return Math.max(1, Math.min(8, Math.round(base + durationFactor + motionFactor + complexityFactor)));
}

function selectAdaptiveIndices(
  candidates: CandidateScore[],
  targetCount: number
): {
  selectedIndices: number[];
  rejectedDedup: number;
  rejectedBlur: number;
  avgEntropy: number;
  avgMotion: number;
} {
  if (candidates.length === 0) {
    return {
      selectedIndices: [],
      rejectedDedup: 0,
      rejectedBlur: 0,
      avgEntropy: 0,
      avgMotion: 0,
    };
  }

  let rejectedBlur = 0;
  let rejectedDedup = 0;
  const blurThreshold = 4.5;
  const kept: CandidateScore[] = [];
  for (const candidate of candidates) {
    if (candidate.sharpness < blurThreshold) {
      rejectedBlur += 1;
      continue;
    }
    const duplicate = kept.some((k) => hammingDistance(k.hash, candidate.hash) <= 5);
    if (duplicate) {
      rejectedDedup += 1;
      continue;
    }
    kept.push(candidate);
  }

  const pool = kept.length > 0 ? kept : [...candidates].sort((a, b) => b.sharpness - a.sharpness);
  const avgEntropy = pool.reduce((sum, c) => sum + c.entropy, 0) / Math.max(1, pool.length);

  let motionTotal = 0;
  let motionCount = 0;
  for (let i = 1; i < pool.length; i += 1) {
    motionTotal += hammingDistance(pool[i - 1].hash, pool[i].hash);
    motionCount += 1;
  }
  const avgMotion = motionCount > 0 ? motionTotal / motionCount : 0;

  const desired = Math.max(1, Math.min(targetCount, pool.length));
  const selected: number[] = [];
  for (let i = 0; i < desired; i += 1) {
    const pick = Math.min(pool.length - 1, Math.floor((i + 0.5) * (pool.length / desired)));
    selected.push(pool[pick].index);
  }

  return {
    selectedIndices: [...new Set(selected)].sort((a, b) => a - b),
    rejectedDedup,
    rejectedBlur,
    avgEntropy,
    avgMotion,
  };
}

export async function extractFrames(
  inputPath: string,
  outputDir: string,
  shots: DetectedShot[]
): Promise<ExtractedFrameSet[]> {
  await ensureDir(outputDir);
  const config = loadPipelineConfig();
  const ffmpeg = getFfmpegBinary();
  const capAudioDuration = 10;

  const results: ExtractedFrameSet[] = [];

  for (const shot of shots) {
    const prefix = `shot-${String(shot.shot_index).padStart(5, "0")}`;
    const candidateCount = Math.max(
      6,
      Math.min(config.shot.maxFramesCandidate, Math.ceil(Math.max(2, shot.duration) * 2))
    );
    const candidateFrames = Array.from({ length: candidateCount }, (_, i) =>
      join(outputDir, `${prefix}-cand-${String(i + 1).padStart(2, "0")}.webp`)
    );
    const thumbnail = join(outputDir, `${prefix}-thumb.webp`);
    const audioClip = join(outputDir, `${prefix}.wav`);
    const shotDuration = Math.max(0.05, shot.duration);

    for (let i = 0; i < candidateCount; i += 1) {
      const t = shot.start + shotDuration * ((i + 0.5) / candidateCount);
      await runCommand(ffmpeg, [
        "-y",
        "-ss",
        `${t}`,
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-vf",
        "scale='min(1920,iw)':-2",
        "-c:v",
        "libwebp",
        "-q:v",
        "85",
        candidateFrames[i],
      ]);
    }

    const scores: CandidateScore[] = await Promise.all(
      candidateFrames.map(async (path, index) => {
        const stats = await sharp(path).stats();
        return {
          index,
          path,
          entropy: stats.entropy,
          sharpness: stats.sharpness,
          hash: await averageHash(path),
        };
      })
    );

    let selectedIndices: number[] = [];
    let rejectedDedup = 0;
    let rejectedBlur = 0;
    let avgEntropy = 0;
    let avgMotion = 0;

    if (
      config.features.enablePythonVisionService &&
      config.features.enableAdaptiveKeyframes &&
      config.endpoints.visionServiceUrl
    ) {
      try {
        const response = await selectKeyframesWithVisionService(config.endpoints.visionServiceUrl, {
          input_path: inputPath,
          shot_index: shot.shot_index,
          start: shot.start,
          end: shot.end,
          frame_paths: candidateFrames,
          max_frames: config.vlm.maxFramesPerShot,
        });
        selectedIndices = response.selected_indices;
        rejectedDedup = response.diagnostics.rejected_dedup;
        rejectedBlur = response.diagnostics.rejected_blur;
        avgMotion = response.diagnostics.avg_motion;
        avgEntropy = response.diagnostics.avg_entropy;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Vision service keyframe selection failed for shot ${shot.shot_index}: ${message}`);
      }
    }

    if (selectedIndices.length === 0) {
      let candidateMotion = 0;
      let candidateMotionCount = 0;
      for (let i = 1; i < scores.length; i += 1) {
        candidateMotion += hammingDistance(scores[i - 1].hash, scores[i].hash);
        candidateMotionCount += 1;
      }
      const motionEstimate = candidateMotionCount > 0 ? candidateMotion / candidateMotionCount : 0;
      const entropyEstimate = scores.reduce((sum, item) => sum + item.entropy, 0) / Math.max(1, scores.length);
      const targetCount = computeTargetFrameCount(shotDuration, motionEstimate, entropyEstimate);
      const local = selectAdaptiveIndices(scores, targetCount);
      selectedIndices = local.selectedIndices;
      rejectedDedup = local.rejectedDedup;
      rejectedBlur = local.rejectedBlur;
      avgEntropy = local.avgEntropy;
      avgMotion = local.avgMotion;
    }

    const frames = selectedIndices
      .slice(0, config.vlm.maxFramesPerShot)
      .map((index, i) => ({ source: candidateFrames[index], target: join(outputDir, `${prefix}-f${i + 1}.webp`) }));
    for (const frame of frames) {
      await copyFile(frame.source, frame.target);
    }
    const selectedFramePaths = frames.map((frame) => frame.target);

    const mid = shot.start + shotDuration / 2;
    await runCommand(ffmpeg, [
      "-y",
      "-ss",
      `${mid}`,
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=400:-2",
      "-c:v",
      "libwebp",
      "-q:v",
      "85",
      thumbnail,
    ]);

    await runCommand(ffmpeg, [
      "-y",
      "-ss",
      `${shot.start}`,
      "-t",
      `${Math.min(capAudioDuration, shotDuration)}`,
      "-i",
      inputPath,
      "-vn",
      "-acodec",
      "pcm_s16le",
      "-ar",
      "44100",
      "-ac",
      "2",
      audioClip,
    ]);

    results.push({
      shot_index: shot.shot_index,
      timecode_start: shot.start,
      timecode_end: shot.end,
      duration_seconds: shot.duration,
      frames: selectedFramePaths,
      thumbnail,
      audio_clip: audioClip,
      keyframe_diagnostics: {
        candidate_count: candidateCount,
        selected_count: selectedFramePaths.length,
        rejected_dedup: rejectedDedup,
        rejected_blur: rejectedBlur,
        avg_motion: Number(avgMotion.toFixed(4)),
        avg_entropy: Number(avgEntropy.toFixed(4)),
      },
    });
  }

  return results;
}
