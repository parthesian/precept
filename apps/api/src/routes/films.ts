import { Hono } from "hono";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@precept/db";
import {
  connections,
  credits,
  filmLocations,
  films,
  people,
  places,
  preceptExamples,
  precepts,
} from "@precept/db";
import { decodeCursor, encodeCursor } from "../lib/cursor.js";
import { fail, ok } from "../lib/envelope.js";
import {
  connectionDto,
  filmDto,
  placeDto,
  preceptDto,
} from "../lib/serialize.js";

export function filmRoutes(db: Db) {
  const app = new Hono();

  app.get("/films/:slug", async (c) => {
    const slug = c.req.param("slug");
    const [row] = await db.select().from(films).where(eq(films.slug, slug));
    if (!row) return fail(c, 404, "not_found", "Film not found");
    return ok(c, filmDto(row));
  });

  app.get("/films/:slug/connections", async (c) => {
    const slug = c.req.param("slug");
    const [film] = await db.select().from(films).where(eq(films.slug, slug));
    if (!film) return fail(c, 404, "not_found", "Film not found");

    const types = c.req.query("types")?.split(",").filter(Boolean);
    const minConfidence = c.req.query("min_confidence");
    const sort = c.req.query("sort") ?? "score";
    const limit = Math.min(Number(c.req.query("limit") ?? "50"), 100);
    const cursor = decodeCursor<{ score?: number; id?: string }>(c.req.query("cursor"));

    const order =
      sort === "chronological"
        ? [asc(connections.createdAt)]
        : sort === "popularity"
          ? [desc(connections.upvotes)]
          : [desc(connections.communityScore), desc(connections.id)];

    let rows = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.status, "approved"),
          sql`(${connections.sourceFilmId} = ${film.id} OR ${connections.targetFilmId} = ${film.id})`
        )
      )
      .orderBy(...order)
      .limit(limit + 1);

    if (types?.length) {
      rows = rows.filter((r) => types.includes(r.connectionType));
    }
    if (minConfidence) {
      const orderTier = ["confirmed", "highly_likely", "proposed", "ai_suggested"];
      const minIdx = orderTier.indexOf(minConfidence);
      rows = rows.filter((r) => orderTier.indexOf(r.confidenceTier) <= minIdx || minIdx < 0);
    }
    if (cursor?.id) {
      const idx = rows.findIndex((r) => r.id === cursor.id);
      if (idx >= 0) rows = rows.slice(idx + 1);
    }

    const page = rows.slice(0, limit);
    const next = rows.length > limit ? encodeCursor({ id: page[page.length - 1]?.id }) : null;
    return ok(c, page.map(connectionDto), { cursor: next, limit });
  });

  app.get("/films/:slug/locations", async (c) => {
    const slug = c.req.param("slug");
    const [film] = await db.select().from(films).where(eq(films.slug, slug));
    if (!film) return fail(c, 404, "not_found", "Film not found");
    const rows = await db
      .select({
        loc: filmLocations,
        place: places,
      })
      .from(filmLocations)
      .innerJoin(places, eq(filmLocations.placeId, places.id))
      .where(and(eq(filmLocations.filmId, film.id), eq(filmLocations.status, "approved")));

    return ok(
      c,
      rows.map(({ loc, place }) => ({
        id: loc.id,
        film_id: loc.filmId,
        place: placeDto(place),
        relationship: loc.relationship,
        scene_description: loc.sceneDescription,
        timecode_start: loc.timecodeStart,
        timecode_end: loc.timecodeEnd,
        is_doubling_for: loc.isDoublingFor,
        community_score: loc.communityScore,
      }))
    );
  });

  app.get("/films/:slug/precepts", async (c) => {
    const slug = c.req.param("slug");
    const [film] = await db.select().from(films).where(eq(films.slug, slug));
    if (!film) return fail(c, 404, "not_found", "Film not found");
    const rows = await db
      .select({ example: preceptExamples, precept: precepts })
      .from(preceptExamples)
      .innerJoin(precepts, eq(preceptExamples.preceptId, precepts.id))
      .where(and(eq(preceptExamples.filmId, film.id), eq(preceptExamples.status, "approved")));
    return ok(
      c,
      rows.map(({ example, precept }) => ({
        ...preceptDto(precept),
        example: {
          id: example.id,
          timecode_start: example.timecodeStart,
          timecode_end: example.timecodeEnd,
          description: example.description,
          is_canonical_example: example.isCanonicalExample,
        },
      }))
    );
  });

  app.get("/films/:slug/credits", async (c) => {
    const slug = c.req.param("slug");
    const [film] = await db.select().from(films).where(eq(films.slug, slug));
    if (!film) return fail(c, 404, "not_found", "Film not found");
    const rows = await db
      .select({ credit: credits, person: people })
      .from(credits)
      .innerJoin(people, eq(credits.personId, people.id))
      .where(eq(credits.filmId, film.id))
      .orderBy(asc(credits.billingOrder));
    return ok(
      c,
      rows.map(({ credit, person }) => ({
        id: credit.id,
        role_type: credit.roleType,
        character_name: credit.characterName,
        billing_order: credit.billingOrder,
        department: credit.department,
        person: {
          id: person.id,
          slug: person.slug,
          name: person.name,
          photo_url: person.photoUrl,
        },
      }))
    );
  });

  return app;
}
