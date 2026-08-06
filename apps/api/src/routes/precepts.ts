import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { films, preceptExamples, preceptRelations, precepts } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";
import { filmDto, preceptDto } from "../lib/serialize.js";
import type { AppEnv } from "../middleware/auth.js";

export function preceptRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/precepts", async (c) => {
    const db = c.get("db");
    const category = c.req.query("category");
    const q = c.req.query("q");
    let rows = await db.select().from(precepts).where(eq(precepts.status, "approved"));
    if (category) rows = rows.filter((r) => r.category === category);
    if (q) {
      const lower = q.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          (Array.isArray(r.aliases) &&
            r.aliases.some((a: string) => String(a).toLowerCase().includes(lower)))
      );
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return ok(c, rows.map(preceptDto), { count: rows.length });
  });

  app.get("/precepts/:slug", async (c) => {
    const db = c.get("db");
    const [row] = await db.select().from(precepts).where(eq(precepts.slug, c.req.param("slug")));
    if (!row) return fail(c, 404, "not_found", "Precept not found");

    const relations = await db
      .select()
      .from(preceptRelations)
      .where(
        and(
          eq(preceptRelations.status, "approved"),
          or(
            eq(preceptRelations.sourcePreceptId, row.id),
            eq(preceptRelations.targetPreceptId, row.id)
          )
        )
      );

    const examples = await db
      .select({ example: preceptExamples, film: films })
      .from(preceptExamples)
      .innerJoin(films, eq(preceptExamples.filmId, films.id))
      .where(and(eq(preceptExamples.preceptId, row.id), eq(preceptExamples.status, "approved")))
      .orderBy(asc(films.releaseYear));

    return ok(c, {
      ...preceptDto(row),
      relations: relations.map((r) => ({
        id: r.id,
        source_precept_id: r.sourcePreceptId,
        target_precept_id: r.targetPreceptId,
        relation_type: r.relationType,
      })),
      examples: examples.map(({ example, film }) => ({
        id: example.id,
        description: example.description,
        timecode_start: example.timecodeStart,
        timecode_end: example.timecodeEnd,
        is_canonical_example: example.isCanonicalExample,
        film: filmDto(film),
      })),
    });
  });

  return app;
}
