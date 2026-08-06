import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "@precept/db";
import { importFilmMetadata } from "./import-film.js";
import { discoverPopularMovies } from "./tmdb-client.js";

/** Lazy — top-level fileURLToPath(import.meta.url) breaks Workers bundles. */
function defaultCanonPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../data/canon.json");
}

function defaultCheckpointPath(): string {
  return resolve(process.cwd(), ".tmdb-bootstrap-checkpoint.json");
}

export type CanonEntry = {
  tmdb_id: number;
  title?: string;
  release_year?: number;
};

export type BootstrapCheckpoint = {
  target: number;
  collectedIds: number[];
  importedIds: number[];
  discoverPage: number;
  updatedAt: string;
};

function loadCanon(path?: string): CanonEntry[] {
  const resolved = path ?? defaultCanonPath();
  if (!existsSync(resolved)) return [];
  const raw = JSON.parse(readFileSync(resolved, "utf8")) as CanonEntry[];
  return raw.filter((e) => Number.isFinite(e.tmdb_id));
}

function loadCheckpoint(path: string): BootstrapCheckpoint | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as BootstrapCheckpoint;
  } catch {
    return null;
  }
}

function saveCheckpoint(path: string, cp: BootstrapCheckpoint) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cp, null, 2));
}

/**
 * Collect unique TMDB IDs: curated canon first, then discover/movie by popularity.
 */
export async function collectBootstrapIds(
  apiKey: string,
  top: number,
  options: {
    canonPath?: string;
    checkpointPath?: string;
    resume?: boolean;
  } = {}
): Promise<{ ids: number[]; checkpoint: BootstrapCheckpoint }> {
  const checkpointPath = options.checkpointPath ?? defaultCheckpointPath();
  const resume = options.resume !== false;
  const existing = resume ? loadCheckpoint(checkpointPath) : null;

  const ids: number[] = [];
  const seen = new Set<number>();

  if (existing && existing.target === top && existing.collectedIds.length) {
    for (const id of existing.collectedIds) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }

  for (const entry of loadCanon(options.canonPath)) {
    if (ids.length >= top) break;
    if (seen.has(entry.tmdb_id)) continue;
    seen.add(entry.tmdb_id);
    ids.push(entry.tmdb_id);
  }

  let page = existing && existing.target === top ? existing.discoverPage || 1 : 1;
  const maxPages = 500; // TMDB discover hard cap

  while (ids.length < top && page <= maxPages) {
    const data = await discoverPopularMovies(apiKey, page);
    if (!data.results?.length) break;
    for (const row of data.results) {
      if (ids.length >= top) break;
      if (!row.id || seen.has(row.id)) continue;
      seen.add(row.id);
      ids.push(row.id);
    }
    page += 1;
    if (page > data.total_pages) break;
  }

  const checkpoint: BootstrapCheckpoint = {
    target: top,
    collectedIds: ids,
    importedIds: existing && existing.target === top ? existing.importedIds ?? [] : [],
    discoverPage: page,
    updatedAt: new Date().toISOString(),
  };
  saveCheckpoint(checkpointPath, checkpoint);
  return { ids, checkpoint };
}

export type BootstrapOptions = {
  top?: number;
  canonPath?: string;
  checkpointPath?: string;
  resume?: boolean;
  backfill?: boolean;
  onProgress?: (info: {
    index: number;
    total: number;
    tmdbId: number;
    title: string;
    status: "created" | "updated" | "skipped";
  }) => void;
};

/**
 * Metadata-only bootstrap of top-N popular films (+ curated canon).
 * Safe to re-run: skips existing tmdb_id (optionally backfills posters).
 */
export async function bootstrapPopularFilms(
  db: Db,
  apiKey: string,
  options: BootstrapOptions = {}
): Promise<{ imported: number; skipped: number; updated: number; total: number }> {
  const top = options.top ?? 5000;
  const checkpointPath = options.checkpointPath ?? defaultCheckpointPath();
  const { ids, checkpoint } = await collectBootstrapIds(apiKey, top, {
    canonPath: options.canonPath,
    checkpointPath,
    resume: options.resume,
  });

  const already = new Set(checkpoint.importedIds);
  let imported = 0;
  let skipped = 0;
  let updated = 0;

  for (let i = 0; i < ids.length; i++) {
    const tmdbId = ids[i]!;
    if (already.has(tmdbId) && !options.backfill) {
      skipped += 1;
      options.onProgress?.({
        index: i + 1,
        total: ids.length,
        tmdbId,
        title: String(tmdbId),
        status: "skipped",
      });
      continue;
    }

    try {
      const result = await importFilmMetadata(db, tmdbId, apiKey, {
        backfill: options.backfill ?? true,
      });
      if (result.created) {
        imported += 1;
        options.onProgress?.({
          index: i + 1,
          total: ids.length,
          tmdbId,
          title: result.title,
          status: "created",
        });
      } else if (result.updated) {
        updated += 1;
        options.onProgress?.({
          index: i + 1,
          total: ids.length,
          tmdbId,
          title: result.title,
          status: "updated",
        });
      } else {
        skipped += 1;
        options.onProgress?.({
          index: i + 1,
          total: ids.length,
          tmdbId,
          title: result.title,
          status: "skipped",
        });
      }
      already.add(tmdbId);
      checkpoint.importedIds = [...already];
      checkpoint.updatedAt = new Date().toISOString();
      if ((i + 1) % 25 === 0 || i + 1 === ids.length) {
        saveCheckpoint(checkpointPath, checkpoint);
      }
    } catch (err) {
      console.error(`bootstrap failed for tmdb_id=${tmdbId}:`, err);
      saveCheckpoint(checkpointPath, {
        ...checkpoint,
        importedIds: [...already],
        updatedAt: new Date().toISOString(),
      });
      throw err;
    }
  }

  saveCheckpoint(checkpointPath, {
    ...checkpoint,
    importedIds: [...already],
    updatedAt: new Date().toISOString(),
  });

  return { imported, skipped, updated, total: ids.length };
}

export function getDefaultCanonPath() {
  return defaultCanonPath();
}
export function getDefaultCheckpointPath() {
  return defaultCheckpointPath();
}
/** @deprecated Use getDefaultCanonPath() — kept for CLI string display. */
export const DEFAULT_CANON_PATH = "(resolved at runtime)";
/** @deprecated Use getDefaultCheckpointPath() — kept for CLI string display. */
export const DEFAULT_CHECKPOINT = ".tmdb-bootstrap-checkpoint.json";
