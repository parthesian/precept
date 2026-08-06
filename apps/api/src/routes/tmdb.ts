import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import {
  createSuggestion,
  credits,
  films,
  registerFilmImportByTmdbHandler,
  type Db,
} from "@precept/db";
import {
  importFilmFull,
  posterUrl,
  tmdbFetch,
  type TmdbSearchResponse,
} from "@precept/importer";
import { filmDto } from "../lib/serialize.js";
import { fail, ok } from "../lib/envelope.js";
import { rateLimit } from "../lib/rate-limit.js";
import type { AppEnv } from "../middleware/auth.js";
import { requireUser, unauthorized } from "../middleware/auth.js";

function tmdbLimits(env: AppEnv["Bindings"]) {
  return {
    search: Number(env.RATE_LIMIT_TMDB_SEARCH_PER_HOUR ?? "120"),
    import: Number(env.RATE_LIMIT_TMDB_IMPORT_PER_HOUR ?? "30"),
  };
}

function requireTmdbKey(c: { env: AppEnv["Bindings"] } & Parameters<typeof fail>[0]) {
  const key = c.env.TMDB_API_KEY;
  if (!key) {
    return {
      key: null as string | null,
      error: fail(
        c,
        503,
        "tmdb_unavailable",
        "TMDB_API_KEY is not configured. Set it in the API environment to enable live TMDB search/import."
      ),
    };
  }
  return { key, error: null };
}

/** Register once so suggestion approval can run full TMDB imports for payload.tmdb_id. */
export function registerTmdbFilmImport() {
  registerFilmImportByTmdbHandler(async (tx, tmdbId) => {
    // TMDB key is read from globalThis shim set by createApp middleware when available.
    const key =
      (globalThis as unknown as { __PRECEPT_TMDB_KEY?: string }).__PRECEPT_TMDB_KEY ||
      undefined;
    if (!key) throw new Error("TMDB_API_KEY is not configured");
    const result = await importFilmFull(tx, tmdbId, key, { backfill: true });
    return result.filmId;
  });
}

export function tmdbRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/tmdb/search", async (c) => {
    const db = c.get("db");
    const user = requireUser(c);
    if (!user) return unauthorized(c);

    const limits = tmdbLimits(c.env);
    if (!(await rateLimit(c.env.RATE_LIMIT, `tmdb-search:${user.id}`, limits.search))) {
      return fail(c, 429, "rate_limited", "Too many TMDB searches this hour");
    }

    const { key, error } = requireTmdbKey(c);
    if (error) return error;

    const q = (c.req.query("q") ?? "").trim();
    const page = Math.max(1, Number(c.req.query("page") ?? "1") || 1);
    if (q.length < 1) {
      return ok(c, [], { page: 1, total_pages: 0, q });
    }

    try {
      // Unpaced for interactive search; per-user rate limit applies above.
      const data = await tmdbFetch<TmdbSearchResponse>(
        `/search/movie?query=${encodeURIComponent(q)}&page=${page}&include_adult=false`,
        key!
      );
      const results = (data.results ?? []).map((r) => ({
        tmdb_id: r.id,
        title: r.title,
        release_year: r.release_date ? Number(r.release_date.slice(0, 4)) || null : null,
        overview: r.overview ?? null,
        poster_url: posterUrl(r.poster_path),
        popularity: r.popularity ?? 0,
      }));
      return ok(c, results, {
        page: data.page,
        total_pages: data.total_pages,
        total_results: data.total_results,
        q,
      });
    } catch (err) {
      return fail(
        c,
        502,
        "tmdb_error",
        err instanceof Error ? err.message : "TMDB search failed"
      );
    }
  });

  app.post("/films/import", async (c) => {
    const db = c.get("db");
    const user = requireUser(c);
    if (!user) return unauthorized(c);

    const limits = tmdbLimits(c.env);
    if (!(await rateLimit(c.env.RATE_LIMIT, `tmdb-import:${user.id}`, limits.import))) {
      return fail(c, 429, "rate_limited", "Too many film imports this hour");
    }

    const { key, error } = requireTmdbKey(c);
    if (error) return error;

    const body = (await c.req.json().catch(() => ({}))) as {
      tmdb_id?: number;
      auto_approve?: boolean;
    };
    const tmdbId = Number(body.tmdb_id);
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      return fail(c, 400, "validation_error", "tmdb_id must be a positive number");
    }

    const [existing] = await db.select().from(films).where(eq(films.tmdbId, tmdbId));

    // Prefer Queue when bound (Workers) — avoids request timeouts on full imports.
    const canSelfApprove =
      body.auto_approve === true && (user.role === "admin" || user.role === "moderator");
    if (!existing && c.env.TMDB_IMPORT_QUEUE && typeof c.env.TMDB_IMPORT_QUEUE.send === "function") {
      await c.env.TMDB_IMPORT_QUEUE.send({
        tmdbId,
        userId: user.id,
        autoApprove: canSelfApprove,
      });
      // Also record a pending import suggestion for attribution / moderation.
      if (!canSelfApprove) {
        const result = await createSuggestion(db, {
          target_type: "film",
          operation: "create",
          source: "import",
          payload: { tmdb_id: tmdbId },
          submitted_by: user.id,
          auto_approve: false,
        });
        return ok(
          c,
          { film: null, status: "queued", suggestionId: result.suggestionId },
          { queued: true },
          202
        );
      }
      return ok(
        c,
        { film: null, status: "queued", suggestionId: null },
        { queued: true },
        202
      );
    }

    if (existing) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)` })
        .from(credits)
        .where(eq(credits.filmId, existing.id));
      // Already fully imported — idempotent return.
      if ((n ?? 0) > 0) {
        return ok(c, {
          film: filmDto(existing),
          status: "exists",
          suggestionId: null,
        });
      }
      // Metadata-only bootstrap row: upgrade with credits when caller can self-approve.
      const canUpgrade =
        body.auto_approve === true && (user.role === "admin" || user.role === "moderator");
      if (canUpgrade) {
        try {
          await importFilmFull(db, tmdbId, key!, { backfill: true });
          const [row] = await db.select().from(films).where(eq(films.id, existing.id));
          return ok(c, {
            film: filmDto(row ?? existing),
            status: "imported",
            suggestionId: null,
          });
        } catch (err) {
          return fail(
            c,
            400,
            "import_error",
            err instanceof Error ? err.message : "Import failed"
          );
        }
      }
      // Otherwise return the metadata-only film (search/navigation still works).
      return ok(c, {
        film: filmDto(existing),
        status: "exists",
        suggestionId: null,
      });
    }

    if (canSelfApprove) {
      try {
        // Direct full import for admin/mod self-approve; still recorded as import source via suggestion.
        const result = await createSuggestion(db, {
          target_type: "film",
          operation: "create",
          source: "import",
          payload: { tmdb_id: tmdbId },
          submitted_by: user.id,
          auto_approve: true,
        });
        const [film] = await db.select().from(films).where(eq(films.id, result.targetId!));
        if (!film) {
          // Fallback if suggestion path returned without film (should not happen)
          const imported = await importFilmFull(db, tmdbId, key!, { backfill: true });
          const [row] = await db.select().from(films).where(eq(films.id, imported.filmId));
          return ok(c, { film: filmDto(row), status: "imported", suggestionId: result.suggestionId }, {}, 201);
        }
        return ok(
          c,
          {
            film: filmDto(film),
            status: result.status,
            suggestionId: result.suggestionId,
          },
          {},
          201
        );
      } catch (err) {
        return fail(
          c,
          400,
          "import_error",
          err instanceof Error ? err.message : "Import failed"
        );
      }
    }

    try {
      const result = await createSuggestion(db, {
        target_type: "film",
        operation: "create",
        source: "import",
        payload: { tmdb_id: tmdbId },
        submitted_by: user.id,
        auto_approve: false,
      });
      return ok(
        c,
        {
          film: null,
          status: result.status,
          suggestionId: result.suggestionId,
        },
        {},
        201
      );
    } catch (err) {
      return fail(
        c,
        400,
        "import_error",
        err instanceof Error ? err.message : "Import failed"
      );
    }
  });

  return app;
}
