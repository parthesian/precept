import { getFfprobeBinary, runCommand } from "./ffmpeg";

export interface DetectedShot {
  shot_index: number;
  start: number;
  end: number;
  duration: number;
  transition: "cut" | "dissolve" | "fade_in" | "fade_out" | "wipe";
}

export async function detectScenes(
  inputPath: string,
  approxShotDurationSeconds = 4
): Promise<DetectedShot[]> {
  const ffprobe = getFfprobeBinary();
  const { stdout } = await runCommand(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ]);
  const parsedDuration = Number(stdout.trim());
  const totalDurationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 120;

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
