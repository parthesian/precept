#!/usr/bin/env node
import "dotenv/config";
import { basename } from "node:path";
import { Command } from "commander";
import ora from "ora";
import { ulid } from "ulid";
import type { ShotIngestPayload } from "@cinegraph/shared";
import { analyzeShotAudio } from "./audio-extract";
import { embedThumbnail } from "./embedder";
import { extractFrames } from "./frame-extract";
import { detectScenes } from "./scene-detect";
import { tagShotsWithVisionModel } from "./tagger";
import { uploadIngestPayload } from "./uploader";
import { readJson, writeJson } from "./utils";

const program = new Command();
program.name("cinegraph-ingest").description("CineGraph ingest pipeline");

program
  .command("detect")
  .requiredOption("--input <path>")
  .requiredOption("--output <path>")
  .action(async (opts) => {
    const spinner = ora("Detecting scenes").start();
    const scenes = await detectScenes(opts.input);
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
    const apiUrl = process.env.CINEGRAPH_API_URL;
    const apiKey = process.env.CINEGRAPH_API_KEY;
    if (!apiUrl || !apiKey) {
      throw new Error("Set CINEGRAPH_API_URL and CINEGRAPH_API_KEY in environment.");
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
      shots: tags.map((shot, i) => ({
        ...shot,
        frame_buffers: [],
        audio_buffer: undefined,
        embedding_vector: vectors[i] ?? [],
      })),
    };

    await uploadIngestPayload(apiUrl, apiKey, payload);
    spinner.succeed("Upload completed");
  });

program
  .command("process")
  .requiredOption("--input <path>")
  .requiredOption("--title <title>")
  .requiredOption("--year <year>")
  .requiredOption("--director <director>")
  .option("--cinematographer <name>")
  .option("--runtime <minutes>", "Runtime in minutes", "120")
  .action(async (opts) => {
    const slug = basename(opts.input).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const workspace = `workspace/${slug}-${ulid()}`;
    const scenesPath = `${workspace}/scenes.json`;
    const framesDir = `${workspace}/frames`;
    const tagsPath = `${workspace}/tags.json`;
    const vectorsPath = `${workspace}/embeddings.json`;
    const scenes = await detectScenes(opts.input);
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

    const apiUrl = process.env.CINEGRAPH_API_URL;
    const apiKey = process.env.CINEGRAPH_API_KEY;
    if (!apiUrl || !apiKey) {
      throw new Error("Set CINEGRAPH_API_URL and CINEGRAPH_API_KEY in environment.");
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
      shots: tags.map((shot, i) => ({
        ...shot,
        frame_buffers: [],
        audio_buffer: undefined,
        embedding_vector: vectors[i] ?? [],
      })),
    };
    await uploadIngestPayload(apiUrl, apiKey, payload);
  });

program.command("connect").description("Placeholder for connection discovery command").action(() => {
  console.log("connect command scaffolded; implement vector + LLM relation classification next.");
});

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
