import { Hono } from "hono";
import { querySimilar } from "../services/vectorize";

type Bindings = {
  DB: D1Database;
  VECTORS: VectorizeIndex;
};

export const searchRouter = new Hono<{ Bindings: Bindings }>();

searchRouter.get("/search/tags", async (c) => {
  const shotScale = c.req.query("shot_scale");
  const setting = c.req.query("setting");
  const limit = Number(c.req.query("limit") ?? "50");
  const offset = Number(c.req.query("offset") ?? "0");

  const filters: string[] = [];
  const args: unknown[] = [];
  if (shotScale) {
    filters.push(`shot_scale = ?${args.length + 1}`);
    args.push(shotScale);
  }
  if (setting) {
    filters.push(`setting = ?${args.length + 1}`);
    args.push(setting);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const sql = `SELECT * FROM shots ${where} ORDER BY created_at DESC LIMIT ?${args.length + 1} OFFSET ?${
    args.length + 2
  }`;
  const rows = await c.env.DB.prepare(sql)
    .bind(...args, limit, offset)
    .all();

  return c.json({ data: rows.results ?? [], limit, offset });
});

searchRouter.post("/search/similar", async (c) => {
  const body = await c.req.json<{ embedding?: number[]; shot_id?: string }>();
  let vector = body.embedding;
  if (!vector && body.shot_id) {
    const row = await c.env.DB.prepare("SELECT embedding_id FROM shots WHERE id = ?1")
      .bind(body.shot_id)
      .first<{ embedding_id?: string }>();
    if (!row?.embedding_id) return c.json({ error: "Embedding not found for shot" }, 404);
    // API expects vector input; caller can provide embedding directly for now.
    return c.json({ error: "Provide embedding vector directly for this scaffold route." }, 400);
  }
  if (!vector) return c.json({ error: "Provide shot_id or embedding" }, 400);

  const matches = await querySimilar(c.env.VECTORS, vector, 12);
  return c.json({ data: matches.matches ?? [] });
});

searchRouter.get("/search/text", async (c) => {
  const q = c.req.query("q") ?? "";
  const rows = await c.env.DB.prepare(
    "SELECT * FROM shots WHERE llm_description LIKE ?1 ORDER BY created_at DESC LIMIT 50"
  )
    .bind(`%${q}%`)
    .all();
  return c.json({ data: rows.results ?? [] });
});
