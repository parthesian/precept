import { Hono } from "hono";
import { ilike, or, sql } from "drizzle-orm";
import type { Db } from "@precept/db";
import { collections, films, people, places, precepts } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";

export function searchRoutes(db: Db) {
  const app = new Hono();

  app.get("/search", async (c) => {
    const q = (c.req.query("q") ?? "").trim();
    const limit = Math.min(Number(c.req.query("limit") ?? "8"), 20);
    const types = (c.req.query("types") ?? "film,person,collection,place,precept").split(",");

    if (!q) {
      return ok(c, { film: [], person: [], collection: [], place: [], precept: [] }, { q, limit });
    }

    const pattern = `%${q}%`;
    const result: Record<string, unknown[]> = {
      film: [],
      person: [],
      collection: [],
      place: [],
      precept: [],
    };

    if (types.includes("film")) {
      const rows = await db
        .select()
        .from(films)
        .where(or(ilike(films.title, pattern), ilike(films.originalTitle, pattern)))
        .orderBy(sql`${films.popularityScore} desc`)
        .limit(limit);
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
      const rows = await db
        .select()
        .from(people)
        .where(ilike(people.name, pattern))
        .limit(limit);
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
        .where(ilike(collections.name, pattern))
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
      const rows = await db.select().from(places).where(ilike(places.name, pattern)).limit(limit);
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
      const rows = await db
        .select()
        .from(precepts)
        .where(or(ilike(precepts.name, pattern), sql`${precepts.aliases}::text ilike ${pattern}`))
        .limit(limit);
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
