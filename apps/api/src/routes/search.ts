import { Hono } from "hono";
import { inArray, or, sql } from "drizzle-orm";
import { collections, films, people, places, precepts } from "@precept/db";
import { ok } from "../lib/envelope.js";
import type { AppEnv } from "../middleware/auth.js";

async function ftsIds(
  d1: D1Database,
  table: "films_fts" | "people_fts" | "precepts_fts",
  idColumn: "film_id" | "person_id" | "precept_id",
  q: string,
  limit: number
): Promise<string[]> {
  const safe = q.replace(/"/g, " ").trim();
  if (!safe) return [];
  try {
    const res = await d1
      .prepare(`SELECT ${idColumn} as id FROM ${table} WHERE ${table} MATCH ? LIMIT ?`)
      .bind(safe, limit)
      .all<{ id: string }>();
    return (res.results ?? []).map((r) => r.id);
  } catch {
    return [];
  }
}

export function searchRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/search", async (c) => {
    const db = c.get("db");
    const q = (c.req.query("q") ?? "").trim();
    const limit = Math.min(Number(c.req.query("limit") ?? "8"), 20);
    const types = (c.req.query("types") ?? "film,person,collection,place,precept").split(",");

    if (!q) {
      return ok(c, { film: [], person: [], collection: [], place: [], precept: [] }, { q, limit });
    }

    const pattern = `%${q.toLowerCase()}%`;
    const result: Record<string, unknown[]> = {
      film: [],
      person: [],
      collection: [],
      place: [],
      precept: [],
    };

    if (types.includes("film")) {
      let rows: Array<typeof films.$inferSelect> = [];
      const ids = await ftsIds(c.env.DB, "films_fts", "film_id", q, limit);
      if (ids.length) {
        rows = await db.select().from(films).where(inArray(films.id, ids)).limit(limit);
      }
      if (!rows.length) {
        rows = await db
          .select()
          .from(films)
          .where(
            or(
              sql`lower(${films.title}) like ${pattern}`,
              sql`lower(coalesce(${films.originalTitle}, '')) like ${pattern}`
            )
          )
          .orderBy(sql`${films.popularityScore} desc`)
          .limit(limit);
      }
      result.film = rows.map((r) => ({
        id: r.id,
        type: "film",
        slug: r.slug,
        label: r.title,
        sublabel: String(r.releaseYear),
        thumb: r.posterUrl,
      }));
    }

    if (types.includes("person")) {
      let rows: Array<typeof people.$inferSelect> = [];
      const ids = await ftsIds(c.env.DB, "people_fts", "person_id", q, limit);
      if (ids.length) {
        rows = await db.select().from(people).where(inArray(people.id, ids)).limit(limit);
      }
      if (!rows.length) {
        rows = await db
          .select()
          .from(people)
          .where(sql`lower(${people.name}) like ${pattern}`)
          .limit(limit);
      }
      result.person = rows.map((r) => ({
        id: r.id,
        type: "person",
        slug: r.slug,
        label: r.name,
        sublabel: r.primaryDepartment,
        thumb: r.photoUrl,
      }));
    }

    if (types.includes("collection")) {
      const rows = await db
        .select()
        .from(collections)
        .where(sql`lower(${collections.name}) like ${pattern}`)
        .limit(limit);
      result.collection = rows.map((r) => ({
        id: r.id,
        type: "collection",
        slug: r.slug,
        label: r.name,
        sublabel: r.kind,
        thumb: null,
      }));
    }

    if (types.includes("place")) {
      const rows = await db
        .select()
        .from(places)
        .where(sql`lower(${places.name}) like ${pattern}`)
        .limit(limit);
      result.place = rows.map((r) => ({
        id: r.id,
        type: "place",
        slug: r.slug,
        label: r.name,
        sublabel: [r.locality, r.country].filter(Boolean).join(", "),
        thumb: null,
      }));
    }

    if (types.includes("precept")) {
      let rows: Array<typeof precepts.$inferSelect> = [];
      const ids = await ftsIds(c.env.DB, "precepts_fts", "precept_id", q, limit);
      if (ids.length) {
        rows = await db.select().from(precepts).where(inArray(precepts.id, ids)).limit(limit);
      }
      if (!rows.length) {
        rows = await db
          .select()
          .from(precepts)
          .where(
            or(
              sql`lower(${precepts.name}) like ${pattern}`,
              sql`lower(coalesce(${precepts.aliases}, '')) like ${pattern}`
            )
          )
          .limit(limit);
      }
      result.precept = rows.map((r) => ({
        id: r.id,
        type: "precept",
        slug: r.slug,
        label: r.name,
        sublabel: r.shortDefinition,
        thumb: null,
      }));
    }

    return ok(c, result, { q, limit });
  });

  return app;
}
