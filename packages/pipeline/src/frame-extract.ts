import { join } from "node:path";
import { getFfmpegBinary, runCommand } from "./ffmpeg.js";
import { ensureDir } from "./utils.js";
import type { DetectedShot } from "./scene-detect.js";

export interface ExtractedFrameSet {
  shot_index: number;
  timecode_start: number;
  timecode_end: number;
  duration_seconds: number;
  frames: string[];
  thumbnail: string;
  audio_clip?: string;
}

export async function extractFrames(
  inputPath: string,
  outputDir: string,
  shots: DetectedShot[]
): Promise<ExtractedFrameSet[]> {
  await ensureDir(outputDir);
  const ffmpeg = getFfmpegBinary();
  const capAudioDuration = 10;

  const results: ExtractedFrameSet[] = [];

  for (const shot of shots) {
    const prefix = `shot-${String(shot.shot_index).padStart(5, "0")}`;
    const frames = Array.from({ length: 5 }, (_, i) => join(outputDir, `${prefix}-f${i + 1}.webp`));
    const thumbnail = join(outputDir, `${prefix}-thumb.webp`);
    const audioClip = join(outputDir, `${prefix}.wav`);
    const shotDuration = Math.max(0.05, shot.duration);

    for (let i = 0; i < 5; i += 1) {
      const t = shot.start + shotDuration * ((i + 0.5) / 5);
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
        frames[i],
      ]);
    }

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
      frames,
      thumbnail,
      audio_clip: audioClip,
    });
  }

  return results;
}
