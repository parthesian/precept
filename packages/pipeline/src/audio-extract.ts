import { getFfmpegBinary, getFfprobeBinary, runCommand } from "./ffmpeg";

export interface AudioMetadata {
  has_music: boolean;
  has_dialogue: boolean;
  has_silence: boolean;
  energy_level: number;
  estimated_tempo?: number;
}

function parseMeanVolume(stderr: string): number | null {
  const match = stderr.match(/mean_volume:\s*(-?\d+(?:\.\d+)?)\s*dB/i);
  if (!match) return null;
  return Number(match[1]);
}

function parseSilenceDuration(stderr: string): number {
  const matches = [...stderr.matchAll(/silence_duration:\s*(\d+(?:\.\d+)?)/gi)];
  return matches.reduce((sum, m) => sum + Number(m[1]), 0);
}

export async function analyzeShotAudio(audioPath: string): Promise<AudioMetadata> {
  const ffprobe = getFfprobeBinary();
  const ffmpeg = getFfmpegBinary();

  const durationProbe = await runCommand(ffprobe, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    audioPath,
  ]);

  const duration = Number(durationProbe.stdout.trim());
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 1;

  const volumeScan = await runCommand(ffmpeg, [
    "-i",
    audioPath,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  const meanVolume = parseMeanVolume(volumeScan.stderr);

  const silenceScan = await runCommand(ffmpeg, [
    "-i",
    audioPath,
    "-af",
    "silencedetect=noise=-40dB:d=0.4",
    "-f",
    "null",
    "-",
  ]);
  const silenceDuration = parseSilenceDuration(silenceScan.stderr);
  const silenceRatio = silenceDuration / safeDuration;

  // Heuristic placeholders until full music/dialogue classification lands.
  const energyLevel = meanVolume == null ? 0.5 : Math.max(0, Math.min(1, (meanVolume + 60) / 60));
  const hasSilence = silenceRatio > 0.35;
  const hasDialogue = !hasSilence && energyLevel > 0.25;
  const hasMusic = energyLevel > 0.45;

  return {
    has_music: hasMusic,
    has_dialogue: hasDialogue,
    has_silence: hasSilence,
    energy_level: Number(energyLevel.toFixed(3)),
    estimated_tempo: undefined,
  };
}
