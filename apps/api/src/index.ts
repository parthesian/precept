import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb } from "@precept/db";
import { etagMiddleware } from "./lib/cache.js";
import { ok } from "./lib/envelope.js";
import { collectionRoutes } from "./routes/collections.js";
import { connectionRoutes } from "./routes/connections.js";
import { filmRoutes } from "./routes/films.js";
import { graphRoutes } from "./routes/graph.js";
import { peopleRoutes } from "./routes/people.js";
import { placeRoutes } from "./routes/places.js";
import { preceptRoutes } from "./routes/precepts.js";
import { searchRoutes } from "./routes/search.js";
import { spotlightRoutes } from "./routes/spotlight.js";

const app = new Hono();
export const db = createDb(process.env.DATABASE_URL);

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use("/api/*", etagMiddleware);

app.get("/", (c) => ok(c, { name: "precept-api", status: "ok", version: "0.1.0" }));
app.get("/api/health", (c) => ok(c, { ok: true }));

app.route("/api", searchRoutes(db));
app.route("/api", filmRoutes(db));
app.route("/api", peopleRoutes(db));
app.route("/api", collectionRoutes(db));
app.route("/api", connectionRoutes(db));
app.route("/api", placeRoutes(db));
app.route("/api", preceptRoutes(db));
app.route("/api", spotlightRoutes(db));
app.route("/api", graphRoutes(db));

const port = Number(process.env.API_PORT ?? 8787);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port }, () => {
    console.log(`precept-api listening on http://localhost:${port}`);
  });
}

export { app };
