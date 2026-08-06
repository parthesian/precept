import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@precept/db";
import { filmLocations, films, places } from "@precept/db";
import { decodeCursor, encodeCursor } from "../lib/cursor.js";
import { fail, ok } from "../lib/envelope.js";
import { filmDto, placeDto } from "../lib/serialize.js";

export function placeRoutes(db: Db) {
  const app = new Hono();

  app.get("/places", async (c) => {
    const bbox = c.req.query("bbox"); // west,south,east,north
    const filmId = c.req.query("film_id");
    const limit = Math.min(Number(c.req.query("limit") ?? "100"), 200);
    const cursor = decodeCursor<{ id?: string }>(c.req.query("cursor"));

    let rows = await db.select().from(places).where(eq(places.status, "approved")).limit(500);

    if (bbox) {
      const [west, south, east, north] = bbox.split(",").map(Number);
      rows = rows.filter(
        (p) => p.lng >= west && p.lng <= east && p.lat >= south && p.lat <= north
      );
    }

    if (filmId) {
      const locs = await db
        .select()
        .from(filmLocations)
        .where(and(eq(filmLocations.filmId, filmId), eq(filmLocations.status, "approved")));
      const allowed = new Set(locs.map((l) => l.placeId));
      rows = rows.filter((p) => allowed.has(p.id));
    }

    if (cursor?.id) {
      const idx = rows.findIndex((r) => r.id === cursor.id);
      if (idx >= 0) rows = rows.slice(idx + 1);
    }

    const page = rows.slice(0, limit);
    const next = rows.length > limit ? encodeCursor({ id: page[page.length - 1]?.id }) : null;
    return ok(c, page.map(placeDto), { cursor: next, limit });
  });

  app.get("/places/:slug", async (c) => {
    const [place] = await db.select().from(places).where(eq(places.slug, c.req.param("slug")));
    if (!place) return fail(c, 404, "not_found", "Place not found");
    const rows = await db
      .select({ loc: filmLocations, film: films })
      .from(filmLocations)
      .innerJoin(films, eq(filmLocations.filmId, films.id))
      .where(and(eq(filmLocations.placeId, place.id), eq(filmLocations.status, "approved")));

    return ok(c, {
      ...placeDto(place),
      films: rows.map(({ loc, film }) => ({
        ...filmDto(film),
        location: {
          id: loc.id,
          relationship: loc.relationship,
          scene_description: loc.sceneDescription,
          timecode_start: loc.timecodeStart,
          timecode_end: loc.timecodeEnd,
          is_doubling_for: loc.isDoublingFor,
        },
      })),
    });
  });

  return app;
}
