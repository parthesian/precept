import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

export interface CommandResult {
  stdout: string;
  stderr: string;
}

function resolveBinary(defaultBinary: string, envName: string, staticPath?: string | null): string {
  const override = process.env[envName];
  if (override && override.trim()) return override;
  if (staticPath && staticPath.trim()) return staticPath;
  return defaultBinary;
}

export function getFfmpegBinary(): string {
  return resolveBinary("ffmpeg", "FFMPEG_PATH", ffmpegStatic);
}

export function getFfprobeBinary(): string {
  return resolveBinary("ffprobe", "FFPROBE_PATH", ffprobeStatic.path);
}

export async function runCommand(binary: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed (${binary} ${args.join(" ")}):\n${stderr}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
