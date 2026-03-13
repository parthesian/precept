import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
  FRAMES: R2Bucket;
};

export const shotsRouter = new Hono<{ Bindings: Bindings }>();

shotsRouter.get("/films/:filmId/shots", async (c) => {
  const filmId = c.req.param("filmId");
  const limit = Number(c.req.query("limit") ?? "100");
  const offset = Number(c.req.query("offset") ?? "0");

  const rows = await c.env.DB.prepare(
    "SELECT * FROM shots WHERE film_id = ?1 ORDER BY timecode_start ASC LIMIT ?2 OFFSET ?3"
  )
    .bind(filmId, limit, offset)
    .all();

  return c.json({ data: rows.results ?? [], limit, offset });
});

shotsRouter.get("/shots/:id", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT * FROM shots WHERE id = ?1").bind(id).first();
  if (!row) return c.json({ error: "Shot not found" }, 404);
  return c.json({ data: row });
});

shotsRouter.get("/assets", async (c) => {
  const key = c.req.query("key");
  if (!key) return c.json({ error: "Missing key query param" }, 400);

  const object = await c.env.FRAMES.get(key);
  if (!object) return c.json({ error: "Asset not found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});

shotsRouter.get("/shots/:id/frames", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT frames, thumbnail FROM shots WHERE id = ?1").bind(id).first<{
    frames: string;
    thumbnail: string;
  }>();
  if (!row) return c.json({ error: "Shot not found" }, 404);

  const frames = JSON.parse(row.frames || "[]") as string[];
  return c.json({
    thumbnail: row.thumbnail,
    thumbnail_url: `/api/assets?key=${encodeURIComponent(row.thumbnail)}`,
    frames,
    frame_urls: frames.map((key) => `/api/assets?key=${encodeURIComponent(key)}`),
  });
});

shotsRouter.get("/shots/:id/audio", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT audio_clip FROM shots WHERE id = ?1").bind(id).first<{
    audio_clip?: string;
  }>();
  if (!row) return c.json({ error: "Shot not found" }, 404);
  if (!row.audio_clip) return c.json({ error: "No audio clip" }, 404);
  return c.json({
    audio_clip: row.audio_clip,
    audio_url: `/api/assets?key=${encodeURIComponent(row.audio_clip)}`,
  });
});
