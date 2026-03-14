#!/usr/bin/env node
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { Command } from "commander";
import ora from "ora";
import { ulid } from "ulid";
import type { ShotIngestPayload } from "@precept/shared";
import { analyzeShotAudio } from "./audio-extract.js";
import { embedThumbnail } from "./embedder.js";
import { extractFrames } from "./frame-extract.js";
import { detectScenes } from "./scene-detect.js";
import { tagShotsWithVisionModel } from "./tagger.js";
import { uploadIngestPayload } from "./uploader.js";
import { readJson, writeJson } from "./utils.js";
import mime from "mime-types";

function contentTypeFromPath(path: string, fallback: string): string {
  const guessed = mime.lookup(path);
  return typeof guessed === "string" ? guessed : fallback;
}

async function fileToBase64(path: string): Promise<string> {
  const buf = await readFile(path);
  return buf.toString("base64");
}

function toSafeSegment(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .join("_");
}

function toSlugFromInputPath(inputPath: string): string {
  const base = basename(inputPath);
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base).toLowerCase();
  const chars: string[] = [];
  let prevDash = false;
  for (const ch of stem) {
    const isAlnum = (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9");
    if (isAlnum) {
      chars.push(ch);
      prevDash = false;
    } else if (!prevDash) {
      chars.push("-");
      prevDash = true;
    }
  }

  while (chars[0] === "-") chars.shift();
  while (chars.at(-1) === "-") chars.pop();
  return chars.join("") || "movie";
}

async function buildUploadShots(
  tags: any[],
  vectors: number[][],
  director: string,
  title: string
): Promise<ShotIngestPayload["shots"]> {
  const safeDirector = toSafeSegment(director);
  const safeTitle = toSafeSegment(title);

  return Promise.all(
    tags.map(async (shot, i) => {
      const frameBuffers = await Promise.all(
        (shot.frames ?? []).map(async (framePath: string) => ({
          key: `films/${safeDirector}/${safeTitle}/${basename(framePath)}`,
          content_type: contentTypeFromPath(framePath, "image/webp"),
          data_base64: await fileToBase64(framePath),
        }))
      );

      const audioBuffer =
        shot.audio_clip && typeof shot.audio_clip === "string"
          ? {
              key: `films/${safeDirector}/${safeTitle}/${basename(shot.audio_clip)}`,
              content_type: contentTypeFromPath(shot.audio_clip, "audio/wav"),
              data_base64: await fileToBase64(shot.audio_clip),
            }
          : undefined;

      return {
        ...shot,
        frame_buffers: frameBuffers,
        audio_buffer: audioBuffer,
        embedding_vector: vectors[i] ?? [],
      };
    })
  );
}

const program = new Command();
program.name("precept-ingest").description("Precept ingest pipeline");

program
  .command("detect")
  .requiredOption("--input <path>")
  .requiredOption("--output <path>")
  .option("--threshold <number>", "Scene detection threshold", "0.3")
  .action(async (opts) => {
    const spinner = ora("Detecting scenes").start();
    const scenes = await detectScenes(opts.input, 4, Number(opts.threshold));
    await writeJson(opts.output, scenes);
    spinner.succeed(`Wrote ${scenes.length} scenes -> ${opts.output}`);
  });

program
  .command("extract")
  .requiredOption("--input <path>")
  .requiredOption("--scenes <path>")
  .requiredOption("--output <path>")
  .action(async (opts) => {
    const scenes = await readJson<Awaited<ReturnType<typeof detectScenes>>>(opts.scenes);
    const spinner = ora("Extracting frame references").start();
    const extracted = await extractFrames(opts.input, opts.output, scenes);
    await writeJson(`${opts.output}/frames.json`, extracted);
    spinner.succeed(`Prepared ${extracted.length} shot frame sets`);
  });

program
  .command("tag")
  .requiredOption("--frames <path>")
  .requiredOption("--title <title>")
  .requiredOption("--year <year>")
  .requiredOption("--director <director>")
  .requiredOption("--output <path>")
  .action(async (opts) => {
    const frameSets = await readJson<Awaited<ReturnType<typeof extractFrames>>>(opts.frames);
    const spinner = ora("Analyzing shot audio + generating tags").start();

    const enriched = await Promise.all(
      frameSets.map(async (item) => ({
        ...item,
        audio_metadata: item.audio_clip ? await analyzeShotAudio(item.audio_clip) : undefined,
      }))
    );
    const tags = await tagShotsWithVisionModel(enriched, opts.title, Number(opts.year), opts.director);
    await writeJson(opts.output, tags);
    spinner.succeed(`Tagged ${tags.length} shots`);
  });

program
  .command("embed")
  .requiredOption("--tags <path>")
  .requiredOption("--output <path>")
  .action(async (opts) => {
    const tags = await readJson<Array<{ thumbnail: string }>>(opts.tags);
    const spinner = ora("Generating CLIP embeddings").start();
    const vectors = await Promise.all(tags.map(async (t) => embedThumbnail(t.thumbnail)));
    await writeJson(opts.output, vectors);
    spinner.succeed(`Generated ${vectors.length} vectors`);
  });

program
  .command("upload")
  .requiredOption("--tags <path>")
  .requiredOption("--embeddings <path>")
  .requiredOption("--title <title>")
  .requiredOption("--year <year>")
  .requiredOption("--director <director>")
  .requiredOption("--runtime <minutes>")
  .option("--cinematographer <name>")
  .action(async (opts) => {
    const apiUrl = process.env.PRECEPT_API_URL;
    const apiKey = process.env.PRECEPT_API_KEY;
    if (!apiUrl || !apiKey) {
      throw new Error("Set PRECEPT_API_URL and PRECEPT_API_KEY in environment.");
    }

    const tags = await readJson<any[]>(opts.tags);
    const vectors = await readJson<number[][]>(opts.embeddings);
    const spinner = ora("Uploading ingest payload").start();
    const payload: ShotIngestPayload = {
      film: {
        title: opts.title,
        year: Number(opts.year),
        director: opts.director,
        cinematographer: opts.cinematographer,
        genre: [],
        runtime_minutes: Number(opts.runtime),
      },
      shots: await buildUploadShots(tags, vectors, opts.director, opts.title),
    };

    const result = await uploadIngestPayload(apiUrl, apiKey, payload);
    spinner.succeed(`Upload completed (film_id=${result.film_id}, shots=${result.shots_ingested})`);
  });

program
  .command("process")
  .requiredOption("--input <path>")
  .requiredOption("--title <title>")
  .requiredOption("--year <year>")
  .requiredOption("--director <director>")
  .option("--cinematographer <name>")
  .option("--runtime <minutes>", "Runtime in minutes", "120")
  .option("--max-shots <number>", "Limit shots for faster local testing")
  .option("--scene-threshold <number>", "Scene threshold (default 0.3)", "0.3")
  .action(async (opts) => {
    const slug = toSlugFromInputPath(opts.input);
    const workspace = `workspace/${slug}-${ulid()}`;
    const scenesPath = `${workspace}/scenes.json`;
    const framesDir = `${workspace}/frames`;
    const tagsPath = `${workspace}/tags.json`;
    const vectorsPath = `${workspace}/embeddings.json`;
    const scenesAll = await detectScenes(opts.input, 4, Number(opts.sceneThreshold));
    const maxShots = opts.maxShots ? Number(opts.maxShots) : undefined;
    const scenes = maxShots ? scenesAll.slice(0, maxShots) : scenesAll;
    await writeJson(scenesPath, scenes);

    const extracted = await extractFrames(opts.input, framesDir, scenes);
    await writeJson(`${framesDir}/frames.json`, extracted);

    const enriched = await Promise.all(
      extracted.map(async (item) => ({
        ...item,
        audio_metadata: item.audio_clip ? await analyzeShotAudio(item.audio_clip) : undefined,
      }))
    );
    const tags = await tagShotsWithVisionModel(enriched, opts.title, Number(opts.year), opts.director);
    await writeJson(tagsPath, tags);

    const vectors = await Promise.all(tags.map(async (shot) => embedThumbnail(shot.thumbnail)));
    await writeJson(vectorsPath, vectors);

    const apiUrl = process.env.PRECEPT_API_URL;
    const apiKey = process.env.PRECEPT_API_KEY;
    if (!apiUrl || !apiKey) {
      throw new Error("Set PRECEPT_API_URL and PRECEPT_API_KEY in environment.");
    }

    const payload: ShotIngestPayload = {
      film: {
        title: opts.title,
        year: Number(opts.year),
        director: opts.director,
        cinematographer: opts.cinematographer,
        genre: [],
        runtime_minutes: Number(opts.runtime),
      },
      shots: await buildUploadShots(tags, vectors, opts.director, opts.title),
    };
    const result = await uploadIngestPayload(apiUrl, apiKey, payload);
    console.log(`Uploaded film_id=${result.film_id} shots=${result.shots_ingested}`);
  });

program.command("connect").description("Placeholder for connection discovery command").action(() => {
  console.log("connect command scaffolded; implement vector + LLM relation classification next.");
});

try {
  await program.parseAsync(process.argv);
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
