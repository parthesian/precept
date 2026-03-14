import { getFfmpegBinary, getFfprobeBinary, runCommand } from "./ffmpeg.js";

export interface DetectedShot {
  shot_index: number;
  start: number;
  end: number;
  duration: number;
  transition: "cut" | "dissolve" | "fade_in" | "fade_out" | "wipe";
}

export async function detectScenes(
  inputPath: string,
  approxShotDurationSeconds = 4,
  threshold = 0.3
): Promise<DetectedShot[]> {
  const ffmpeg = getFfmpegBinary();
  const ffprobe = getFfprobeBinary();
  const probe = await runCommand(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=avg_frame_rate",
    "-select_streams",
    "v:0",
    "-of",
    "json",
    inputPath,
  ]);
  const parsed = JSON.parse(probe.stdout) as {
    format?: { duration?: string };
    streams?: Array<{ avg_frame_rate?: string }>;
  };
  const parsedDuration = Number(parsed.format?.duration ?? "0");
  const totalDurationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 120;
  const fpsRaw = parsed.streams?.[0]?.avg_frame_rate ?? "24/1";
  const [num, den] = fpsRaw.split("/").map(Number);
  const fps = Number.isFinite(num / den) && den > 0 ? num / den : 24;

  const detect = await runCommand(ffmpeg, [
    "-i",
    inputPath,
    "-vf",
    `select='gt(scene,${threshold})',showinfo`,
    "-f",
    "null",
    "-",
  ]);

  const matches = [...detect.stderr.matchAll(/pts_time:(\d+(?:\.\d+)?)/g)];
  const boundaries = [0, ...matches.map((m) => Number(m[1])), totalDurationSeconds]
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const deduped: number[] = [];
  for (const t of boundaries) {
    if (deduped.length === 0 || Math.abs((deduped.at(-1) ?? 0) - t) > 1 / fps) {
      deduped.push(t);
    }
  }

  const detected: DetectedShot[] = [];
  for (let i = 0; i < deduped.length - 1; i += 1) {
    const start = deduped[i];
    const end = deduped[i + 1];
    const duration = end - start;
    if (duration <= 0.05) continue;
    detected.push({
      shot_index: detected.length,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      duration: Number(duration.toFixed(3)),
      transition: "cut",
    });
  }

  if (detected.length > 0) {
    return detected;
  }

  const count = Math.max(1, Math.floor(totalDurationSeconds / approxShotDurationSeconds));
  return Array.from({ length: count }, (_, i) => {
    const start = i * approxShotDurationSeconds;
    const end = Math.min(totalDurationSeconds, (i + 1) * approxShotDurationSeconds);
    return {
      shot_index: i,
      start,
      end,
      duration: Number((end - start).toFixed(3)),
      transition: "cut",
    };
  });
}
