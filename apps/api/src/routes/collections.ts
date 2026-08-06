import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import type { Db } from "@precept/db";
import { collectionFilms, collections, films } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";
import { filmDto } from "../lib/serialize.js";

export function collectionRoutes(db: Db) {
  const app = new Hono();

  app.get("/collections/:slug", async (c) => {
    const [col] = await db
      .select()
      .from(collections)
      .where(eq(collections.slug, c.req.param("slug")));
    if (!col) return fail(c, 404, "not_found", "Collection not found");
    const rows = await db
      .select({ membership: collectionFilms, film: films })
      .from(collectionFilms)
      .innerJoin(films, eq(collectionFilms.filmId, films.id))
      .where(eq(collectionFilms.collectionId, col.id))
      .orderBy(asc(collectionFilms.position));
    return ok(c, {
      id: col.id,
      slug: col.slug,
      name: col.name,
      description: col.description,
      kind: col.kind,
      films: rows.map(({ film, membership }) => ({
        ...filmDto(film),
        position: membership.position,
      })),
    });
  });

  return app;
}
