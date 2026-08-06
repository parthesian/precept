import { Hono } from "hono";
import { generateId } from "../services/d1";

type Bindings = {
  DB: D1Database;
};

export const connectionsRouter = new Hono<{ Bindings: Bindings }>();

connectionsRouter.get("/shots/:id/connections", async (c) => {
  const shotId = c.req.param("id");
  const rows = await c.env.DB.prepare(
    "SELECT * FROM connections WHERE source_shot_id = ?1 OR target_shot_id = ?1 ORDER BY created_at DESC"
  )
    .bind(shotId)
    .all();
  return c.json({ data: rows.results ?? [] });
});

connectionsRouter.get("/connections/graph", async (c) => {
  const filmId = c.req.query("film_id");
  if (!filmId) {
    const edges = await c.env.DB.prepare("SELECT * FROM connections ORDER BY created_at DESC LIMIT 1000").all();
    return c.json({ edges: edges.results ?? [] });
  }

  const edges = await c.env.DB.prepare(
    "SELECT c.* FROM connections c JOIN shots s1 ON c.source_shot_id = s1.id JOIN shots s2 ON c.target_shot_id = s2.id WHERE s1.film_id = ?1 OR s2.film_id = ?1 LIMIT 1000"
  )
    .bind(filmId)
    .all();
  return c.json({ edges: edges.results ?? [] });
});

connectionsRouter.post("/connections", async (c) => {
  const body = await c.req.json<any>();
  const id = generateId();
  await c.env.DB.prepare(
    "INSERT INTO connections (id, source_shot_id, target_shot_id, connection_type, confidence, description, evidence, similarity_score, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
  )
    .bind(
      id,
      body.source_shot_id,
      body.target_shot_id,
      body.connection_type,
      body.confidence,
      body.description ?? null,
      body.evidence ?? null,
      body.similarity_score ?? null,
      body.created_by ?? "user"
    )
    .run();
  return c.json({ id }, 201);
});

connectionsRouter.patch("/connections/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<any>();
  await c.env.DB.prepare(
    "UPDATE connections SET connection_type = ?1, confidence = ?2, description = ?3, evidence = ?4 WHERE id = ?5"
  )
    .bind(body.connection_type, body.confidence, body.description ?? null, body.evidence ?? null, id)
    .run();
  return c.json({ ok: true });
});

connectionsRouter.delete("/connections/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM connections WHERE id = ?1").bind(id).run();
  return c.json({ ok: true });
});
