#!/usr/bin/env node
import "dotenv/config";
import { createDb } from "@precept/db";
import { bootstrapPopularFilms } from "./bootstrap.js";
import { importFilmFull, importFilmMetadata } from "./import-film.js";
import { resolveTitlesToIds } from "./tmdb-client.js";

function usage(): string {
  return `
TMDB importer

Requires TMDB_API_KEY from https://www.themoviedb.org/settings/api
Free developer key; ~40 requests / 10 seconds.

Usage:
  npm run import:tmdb -- --bootstrap --top=5000
  npm run import:tmdb -- --bootstrap --top=10000
  npm run import:tmdb -- --tmdb-ids=155,27205,389
  npm run import:tmdb -- --tmdb-ids=155 --metadata-only
  npm run import:tmdb -- --titles="The Dark Knight,Inception,12 Angry Men"

Flags:
  --bootstrap           Metadata-only import of top-N popular + curated canon
  --top=N               Bootstrap size (default 5000)
  --metadata-only       Skip credits/people (for --tmdb-ids / --titles)
  --backfill            Refresh missing posters/synopsis on existing rows
  --no-resume           Ignore bootstrap checkpoint and start fresh
`;
}

function flag(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`));
  if (arg) return arg.slice(name.length + 1);
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    console.error(usage());
    process.exit(1);
  }

  const db = createDb();
  const metadataOnly = hasFlag("--metadata-only");
  const backfill = hasFlag("--backfill");
  const bootstrap = hasFlag("--bootstrap");

  if (bootstrap) {
    const top = Number(flag("--top") ?? "5000");
    if (!Number.isFinite(top) || top < 1) {
      console.error("--top must be a positive number");
      process.exit(1);
    }
    console.log(`Bootstrapping top ${top} films (metadata only)…`);
    const result = await bootstrapPopularFilms(db, key, {
      top,
      backfill: backfill || true,
      resume: !hasFlag("--no-resume"),
      onProgress: ({ index, total, title, status }) => {
        const mark = status === "created" ? "film+" : status === "updated" ? "film~" : "film=";
        console.log(`${mark} ${index}/${total} ${title}`);
      },
    });
    console.log(
      `Bootstrap done: ${result.imported} created, ${result.updated} updated, ${result.skipped} skipped (${result.total} total).`
    );
    return;
  }

  const idsArg = flag("--tmdb-ids");
  const titlesArg = flag("--titles");

  let ids: number[] = [];
  if (idsArg) {
    ids = idsArg
      .split(",")
      .map((x) => Number(x.trim()))
      .filter(Boolean);
  } else if (titlesArg) {
    ids = await resolveTitlesToIds(
      titlesArg
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      key
    );
  } else {
    console.error("Provide --bootstrap, --tmdb-ids=, or --titles=");
    console.error(usage());
    process.exit(1);
  }

  for (const id of ids) {
    const result = metadataOnly
      ? await importFilmMetadata(db, id, key, { backfill })
      : await importFilmFull(db, id, key, { backfill: backfill || true });
    if (result.created) console.log(`film+ ${result.title}`);
    else if (result.updated) console.log(`film~ ${result.title} (updated)`);
    else console.log(`film= ${result.title} (exists)`);
    if (!metadataOnly && result.creditsImported) console.log(`  credits+ ${result.title}`);
  }
  console.log(`Imported ${ids.length} film(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
