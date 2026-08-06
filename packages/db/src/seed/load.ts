import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { getPlatformProxy } from "wrangler";
import { createDb } from "../client.js";
import {
  collectionFilms,
  collections,
  connections,
  credits,
  evidence,
  filmLocations,
  films,
  people,
  places,
  preceptExamples,
  preceptRelations,
  precepts,
  spotlights,
  suggestions,
  users,
} from "../schema/index.js";

const seedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../seed");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const now = Date.now();

async function readJson<T>(name: string): Promise<T> {
  const raw = await readFile(path.join(seedDir, name), "utf8");
  return JSON.parse(raw) as T;
}

function parseTime(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

async function main() {
  const proxy = await getPlatformProxy({
    configPath: path.join(root, "apps/web/wrangler.jsonc"),
    // Must match wrangler --local persist layout (…/.wrangler/state/v3).
    persist: { path: path.join(root, "apps/web/.wrangler/state/v3") },
  });
  try {
    const db = createDb(proxy.env.DB as D1Database);

    const usersData = await readJson<any[]>("users.json");
    const filmsData = await readJson<any[]>("films.json");
    const peopleData = await readJson<any[]>("people.json");
    const creditsData = await readJson<any[]>("credits.json");
    const collectionsData = await readJson<any[]>("collections.json");
    const connectionsData = await readJson<any[]>("connections.json");
    const evidenceData = await readJson<any[]>("evidence.json");
    const placesData = await readJson<any[]>("places.json");
    const filmLocationsData = await readJson<any[]>("film_locations.json");
    const preceptsData = await readJson<any[]>("precepts.json");
    const preceptRelationsData = await readJson<any[]>("precept_relations.json");
    const preceptExamplesData = await readJson<any[]>("precept_examples.json");
    const suggestionsData = await readJson<any[]>("suggestions.json");
    const spotlightsData = await readJson<any[]>("spotlights.json");

    console.log("seeding users…");
    for (const u of usersData) {
      await db
        .insert(users)
        .values({
          id: u.id,
          handle: u.handle,
          displayName: u.display_name,
          email: u.email,
          role: u.role,
          reputation: u.reputation ?? 0,
          contributionCounts: u.contribution_counts ?? {},
          isSeedData: true,
          createdAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seeding films…");
    for (const f of filmsData) {
      await db
        .insert(films)
        .values({
          id: f.id,
          slug: f.slug,
          tmdbId: f.tmdb_id ?? null,
          imdbId: f.imdb_id ?? null,
          title: f.title,
          originalTitle: f.original_title ?? null,
          releaseYear: f.release_year,
          releaseDate: f.release_date ?? null,
          runtimeMinutes: f.runtime_minutes ?? null,
          country: f.country ?? [],
          originalLanguage: f.original_language ?? null,
          genres: f.genres ?? [],
          synopsis: f.synopsis ?? null,
          posterUrl: f.poster_url ?? null,
          backdropUrl: f.backdrop_url ?? null,
          aspectRatio: f.aspect_ratio ?? null,
          colorFormat: f.color_format ?? null,
          popularityScore: f.popularity_score ?? 0,
          connectionCount: 0,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seeding people…");
    for (const p of peopleData) {
      await db
        .insert(people)
        .values({
          id: p.id,
          slug: p.slug,
          tmdbPersonId: p.tmdb_person_id ?? null,
          name: p.name,
          alsoKnownAs: p.also_known_as ?? [],
          primaryDepartment: p.primary_department ?? null,
          birthYear: p.birth_year ?? null,
          deathYear: p.death_year ?? null,
          bioSnippet: p.bio_snippet ?? null,
          photoUrl: p.photo_url ?? null,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seeding credits…");
    for (const c of creditsData) {
      await db
        .insert(credits)
        .values({
          id: c.id,
          personId: c.person_id,
          filmId: c.film_id,
          roleType: c.role_type,
          characterName: c.character_name ?? null,
          billingOrder: c.billing_order ?? null,
          department: c.department ?? null,
          isSeedData: true,
        })
        .onConflictDoNothing();
    }

    console.log("seeding collections…");
    for (const col of collectionsData) {
      await db
        .insert(collections)
        .values({
          id: col.id,
          slug: col.slug,
          name: col.name,
          description: col.description ?? null,
          kind: col.kind,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      let pos = 0;
      for (const filmId of col.film_ids ?? []) {
        await db
          .insert(collectionFilms)
          .values({
            id: `${col.id}_${filmId}`,
            collectionId: col.id,
            filmId,
            position: pos++,
            isSeedData: true,
          })
          .onConflictDoNothing();
      }
    }

    console.log("seeding places…");
    for (const p of placesData) {
      await db
        .insert(places)
        .values({
          id: p.id,
          slug: p.slug,
          name: p.name,
          altNames: p.alt_names ?? [],
          address: p.address ?? null,
          locality: p.locality ?? null,
          region: p.region ?? null,
          country: p.country ?? null,
          lat: p.lat,
          lng: p.lng,
          geohash: p.geohash ?? null,
          placeKind: p.place_kind,
          stillExtant: p.still_extant ?? true,
          notes: p.notes ?? null,
          externalIds: p.external_ids ?? {},
          status: p.status ?? "approved",
          createdBy: p.created_by ?? null,
          approvedBy: p.approved_by ?? null,
          approvedAt: now,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seeding connections…");
    const connCount = new Map<string, number>();
    for (const c of connectionsData) {
      await db
        .insert(connections)
        .values({
          id: c.id,
          sourceFilmId: c.source_film_id,
          targetFilmId: c.target_film_id,
          isDirected: c.is_directed ?? true,
          connectionType: c.connection_type,
          confidenceTier: c.confidence_tier,
          title: c.title,
          rationale: c.rationale,
          sourceAnchor: c.source_anchor ?? null,
          targetAnchor: c.target_anchor ?? null,
          tags: c.tags ?? [],
          upvotes: c.upvotes ?? 0,
          downvotes: c.downvotes ?? 0,
          communityScore: c.community_score ?? 0,
          status: c.status ?? "approved",
          createdBy: c.created_by ?? null,
          approvedBy: c.approved_by ?? null,
          approvedAt: now,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      connCount.set(c.source_film_id, (connCount.get(c.source_film_id) ?? 0) + 1);
      connCount.set(c.target_film_id, (connCount.get(c.target_film_id) ?? 0) + 1);
    }

    for (const [filmId, count] of connCount) {
      await db
        .update(films)
        .set({ connectionCount: count, updatedAt: now })
        .where(eq(films.id, filmId));
    }

    console.log("seeding evidence…");
    for (const e of evidenceData) {
      await db
        .insert(evidence)
        .values({
          id: e.id,
          targetType: e.target_type,
          targetId: e.target_id,
          evidenceType: e.evidence_type,
          url: e.url ?? null,
          citationText: e.citation_text,
          excerpt: e.excerpt ?? null,
          pageOrTimestamp: e.page_or_timestamp ?? null,
          submittedBy: e.submitted_by ?? null,
          isSeedData: true,
          createdAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seeding film locations…");
    for (const loc of filmLocationsData) {
      await db
        .insert(filmLocations)
        .values({
          id: loc.id,
          filmId: loc.film_id,
          placeId: loc.place_id,
          relationship: loc.relationship,
          sceneDescription: loc.scene_description ?? null,
          timecodeStart: loc.timecode_start ?? null,
          timecodeEnd: loc.timecode_end ?? null,
          isDoublingFor: loc.is_doubling_for ?? null,
          upvotes: loc.upvotes ?? 0,
          downvotes: loc.downvotes ?? 0,
          communityScore: loc.community_score ?? 0,
          status: loc.status ?? "approved",
          createdBy: loc.created_by ?? null,
          approvedBy: loc.approved_by ?? null,
          approvedAt: now,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seeding precepts…");
    for (const p of preceptsData) {
      await db
        .insert(precepts)
        .values({
          id: p.id,
          slug: p.slug,
          name: p.name,
          aliases: p.aliases ?? [],
          category: p.category,
          shortDefinition: p.short_definition,
          description: p.description,
          originClaim: p.origin_claim ?? null,
          popularizedByFilmIds: p.popularized_by_film_ids ?? [],
          status: p.status ?? "approved",
          createdBy: p.created_by ?? null,
          approvedBy: p.approved_by ?? null,
          approvedAt: now,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    for (const r of preceptRelationsData) {
      await db
        .insert(preceptRelations)
        .values({
          id: r.id,
          sourcePreceptId: r.source_precept_id,
          targetPreceptId: r.target_precept_id,
          relationType: r.relation_type,
          status: r.status ?? "approved",
          createdBy: r.created_by ?? null,
          approvedBy: r.approved_by ?? null,
          approvedAt: now,
          isSeedData: true,
          createdAt: now,
        })
        .onConflictDoNothing();
    }

    for (const ex of preceptExamplesData) {
      await db
        .insert(preceptExamples)
        .values({
          id: ex.id,
          preceptId: ex.precept_id,
          filmId: ex.film_id,
          timecodeStart: ex.timecode_start ?? null,
          timecodeEnd: ex.timecode_end ?? null,
          description: ex.description,
          isCanonicalExample: ex.is_canonical_example ?? false,
          status: ex.status ?? "approved",
          createdBy: ex.created_by ?? null,
          approvedBy: ex.approved_by ?? null,
          approvedAt: now,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seeding suggestions…");
    for (const s of suggestionsData) {
      await db
        .insert(suggestions)
        .values({
          id: s.id,
          targetType: s.target_type,
          targetId: s.target_id ?? null,
          operation: s.operation,
          payload: s.payload,
          source: s.source,
          aiMetadata: s.ai_metadata ?? null,
          submitterNote: s.submitter_note ?? null,
          status: s.status,
          submittedBy: s.submitted_by ?? null,
          communityScore: s.community_score ?? 0,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seeding spotlights…");
    for (const s of spotlightsData) {
      await db
        .insert(spotlights)
        .values({
          id: s.id,
          slug: s.slug,
          filmId: s.film_id,
          headline: s.headline,
          bodyMarkdown: s.body_markdown,
          featuredConnectionIds: s.featured_connection_ids ?? [],
          publishedAt: parseTime(s.published_at),
          status: s.status ?? "approved",
          createdBy: s.created_by ?? null,
          approvedBy: s.approved_by ?? null,
          isSeedData: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    console.log("seed complete");
  } finally {
    await proxy.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
