import { Hono } from "hono";
import { generateId } from "../services/d1";

type Bindings = {
  DB: D1Database;
};

export const filmsRouter = new Hono<{ Bindings: Bindings }>();

filmsRouter.get("/", async (c) => {
  const limit = Number(c.req.query("limit") ?? "50");
  const offset = Number(c.req.query("offset") ?? "0");

  const rows = await c.env.DB.prepare(
    "SELECT f.*, (SELECT COUNT(*) FROM shots s WHERE s.film_id = f.id) AS shot_count FROM films f ORDER BY year DESC, title ASC LIMIT ?1 OFFSET ?2"
  )
    .bind(limit, offset)
    .all();

  return c.json({ data: rows.results ?? [], limit, offset });
});

filmsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const film = await c.env.DB.prepare(
    "SELECT f.*, (SELECT COUNT(*) FROM shots s WHERE s.film_id = f.id) AS shot_count FROM films f WHERE f.id = ?1"
  )
    .bind(id)
    .first();

  if (!film) return c.json({ error: "Film not found" }, 404);
  return c.json({ data: film });
});

filmsRouter.post("/", async (c) => {
  const body = await c.req.json<any>();
  const id = generateId();
  await c.env.DB.prepare(
    "INSERT INTO films (id, title, year, director, cinematographer, genre, runtime_minutes, aspect_ratio, film_stock_or_camera, imdb_id, tmdb_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)"
  )
    .bind(
      id,
      body.title,
      body.year,
      body.director,
      body.cinematographer ?? null,
      JSON.stringify(body.genre ?? []),
      body.runtime_minutes,
      body.aspect_ratio ?? null,
      body.film_stock_or_camera ?? null,
      body.imdb_id ?? null,
      body.tmdb_id ?? null
    )
    .run();

  return c.json({ id }, 201);
});
