import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@precept/db";
import { films, spotlights } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";
import { filmDto } from "../lib/serialize.js";

export function spotlightRoutes(db: Db) {
  const app = new Hono();

  app.get("/spotlight", async (c) => {
    const [row] = await db
      .select()
      .from(spotlights)
      .where(eq(spotlights.status, "approved"))
      .orderBy(desc(spotlights.publishedAt))
      .limit(1);
    if (!row) return fail(c, 404, "not_found", "No spotlight published");
    const [film] = await db.select().from(films).where(eq(films.id, row.filmId));
    return ok(c, {
      id: row.id,
      slug: row.slug,
      headline: row.headline,
      body_markdown: row.bodyMarkdown,
      featured_connection_ids: row.featuredConnectionIds,
      published_at: row.publishedAt,
      film: film ? filmDto(film) : null,
    });
  });

  app.get("/spotlight/:slug", async (c) => {
    const [row] = await db
      .select()
      .from(spotlights)
      .where(eq(spotlights.slug, c.req.param("slug")));
    if (!row) return fail(c, 404, "not_found", "Spotlight not found");
    const [film] = await db.select().from(films).where(eq(films.id, row.filmId));
    return ok(c, {
      id: row.id,
      slug: row.slug,
      headline: row.headline,
      body_markdown: row.bodyMarkdown,
      featured_connection_ids: row.featuredConnectionIds,
      published_at: row.publishedAt,
      film: film ? filmDto(film) : null,
    });
  });

  return app;
}
