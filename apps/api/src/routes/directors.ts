import { Hono } from "hono";

type Bindings = {
  DB: D1Database;
};

export const directorsRouter = new Hono<{ Bindings: Bindings }>();

directorsRouter.get("/directors", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM directors ORDER BY name ASC").all();
  return c.json({ data: rows.results ?? [] });
});

directorsRouter.get("/directors/:name/shots", async (c) => {
  const name = c.req.param("name");
  const rows = await c.env.DB.prepare(
    "SELECT s.* FROM shots s JOIN films f ON s.film_id = f.id WHERE lower(f.director) = lower(?1) ORDER BY f.year ASC, s.shot_index ASC LIMIT 2000"
  )
    .bind(name)
    .all();
  return c.json({ data: rows.results ?? [] });
});
