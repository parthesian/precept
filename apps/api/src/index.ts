import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
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

// Turbo runs with cwd apps/api; prefer repo-root .env from HANDOFF setup.
for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}

export const db = createDb(process.env.DATABASE_URL);
registerTmdbFilmImport(db);
const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use("*", createAuthMiddleware(db));
app.use("/api/*", async (c, next) => {
  if (c.req.method === "GET") return etagMiddleware(c, next);
  return next();
});

app.get("/", (c) => ok(c, { name: "precept-api", status: "ok", version: "0.1.0" }));
app.get("/api/health", (c) => ok(c, { ok: true }));

app.route("/api", authRoutes(db));
app.route("/api", searchRoutes(db));
app.route("/api", filmRoutes(db));
app.route("/api", tmdbRoutes(db));
app.route("/api", peopleRoutes(db));
app.route("/api", collectionRoutes(db));
app.route("/api", connectionRoutes(db));
app.route("/api", placeRoutes(db));
app.route("/api", preceptRoutes(db));
app.route("/api", spotlightRoutes(db));
app.route("/api", graphRoutes(db));
app.route("/api", suggestionRoutes(db));
app.route("/api", voteRoutes(db));
app.route("/api", flagRoutes(db));
app.route("/api", aiRoutes(db));

// Explicitly no POST /api/connections — live writes only via suggestion approval.

const port = Number(process.env.API_PORT ?? 8787);

// Node server is opt-in during the Workers migration (idle by default).
if (process.env.NODE_ENV !== "test" && process.env.PRECEPT_NODE_SERVER === "1") {
  serve({ fetch: app.fetch, port }, () => {
    console.log(`precept-api listening on http://localhost:${port}`);
  });
}

export { app };
export { createApp } from "./create-app.js";
export type { ApiBindings } from "./env.js";
