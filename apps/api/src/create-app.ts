import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb } from "@precept/db";
import { etagMiddleware } from "./lib/cache.js";
import { ok } from "./lib/envelope.js";
import { createAuthMiddleware, type AppEnv } from "./middleware/auth.js";
import { aiRoutes } from "./routes/ai.js";
import { authRoutes } from "./routes/auth.js";
import { collectionRoutes } from "./routes/collections.js";
import { connectionRoutes } from "./routes/connections.js";
import { filmRoutes } from "./routes/films.js";
import { flagRoutes } from "./routes/flags.js";
import { graphRoutes } from "./routes/graph.js";
import { peopleRoutes } from "./routes/people.js";
import { placeRoutes } from "./routes/places.js";
import { preceptRoutes } from "./routes/precepts.js";
import { searchRoutes } from "./routes/search.js";
import { spotlightRoutes } from "./routes/spotlight.js";
import { suggestionRoutes } from "./routes/suggestions.js";
import { registerTmdbFilmImport, tmdbRoutes } from "./routes/tmdb.js";
import { voteRoutes } from "./routes/votes.js";

let tmdbRegistered = false;

/**
 * Workers-facing Hono app. Bindings come from c.env; DB is per-request.
 */
export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    // Same-origin by default; optional CORS for split-port local debugging.
    if (c.env.CORS_ORIGIN) {
      return cors({ origin: c.env.CORS_ORIGIN, credentials: true })(c, next);
    }
    return next();
  });

  app.use("*", async (c, next) => {
    const db = createDb(c.env.DB);
    c.set("db", db);
    (globalThis as unknown as { __PRECEPT_TMDB_KEY?: string }).__PRECEPT_TMDB_KEY =
      c.env.TMDB_API_KEY;
    if (!tmdbRegistered) {
      registerTmdbFilmImport();
      tmdbRegistered = true;
    }
    return next();
  });

  app.use("*", createAuthMiddleware());

  app.use("/api/*", async (c, next) => {
    if (c.req.method === "GET") return etagMiddleware(c, next);
    return next();
  });

  app.get("/api/health", (c) =>
    ok(c, {
      ok: true,
      runtime: "workers",
      hasDb: Boolean(c.env?.DB),
      hasKv: Boolean(c.env?.RATE_LIMIT),
      hasQueue: Boolean(c.env?.TMDB_IMPORT_QUEUE),
    })
  );

  app.route("/api", authRoutes());
  app.route("/api", searchRoutes());
  app.route("/api", filmRoutes());
  app.route("/api", tmdbRoutes());
  app.route("/api", peopleRoutes());
  app.route("/api", collectionRoutes());
  app.route("/api", connectionRoutes());
  app.route("/api", placeRoutes());
  app.route("/api", preceptRoutes());
  app.route("/api", spotlightRoutes());
  app.route("/api", graphRoutes());
  app.route("/api", suggestionRoutes());
  app.route("/api", voteRoutes());
  app.route("/api", flagRoutes());
  app.route("/api", aiRoutes());

  // Explicitly no POST /api/connections — live writes only via suggestion approval.

  return app;
}

export default createApp;
