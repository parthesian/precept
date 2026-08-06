import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createDb } from "@precept/db";
import { ok } from "./lib/envelope.js";

const app = new Hono();
const db = createDb(process.env.DATABASE_URL);

app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

app.get("/", (c) => ok(c, { name: "precept-api", status: "ok", version: "0.1.0" }));
app.get("/api/health", (c) => ok(c, { ok: true }));

// Placeholder — Milestone 3 wires full read API.
app.get("/api/search", (c) =>
  ok(c, { film: [], person: [], collection: [], place: [], precept: [] }, { q: c.req.query("q") ?? "" })
);

const port = Number(process.env.API_PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`precept-api listening on http://localhost:${port}`);
});

export { app, db };
