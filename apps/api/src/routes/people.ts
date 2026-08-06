import type { AppEnv } from "../middleware/auth.js";
import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import type { Db } from "@precept/db";
import { credits, films, people } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";
import { filmDto, personDto } from "../lib/serialize.js";

export function peopleRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/people/:slug", async (c) => {
    const db = c.get("db");
    const [row] = await db.select().from(people).where(eq(people.slug, c.req.param("slug")));
    if (!row) return fail(c, 404, "not_found", "Person not found");
    return ok(c, personDto(row));
  });

  app.get("/people/:slug/films", async (c) => {
    const db = c.get("db");
    const [person] = await db.select().from(people).where(eq(people.slug, c.req.param("slug")));
    if (!person) return fail(c, 404, "not_found", "Person not found");
    const rows = await db
      .select({ credit: credits, film: films })
      .from(credits)
      .innerJoin(films, eq(credits.filmId, films.id))
      .where(eq(credits.personId, person.id))
      .orderBy(asc(films.releaseYear));
    return ok(
      c,
      rows.map(({ credit, film }) => ({
        ...filmDto(film),
        role_type: credit.roleType,
        character_name: credit.characterName,
      }))
    );
  });

  return app;
}
