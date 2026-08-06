import { and, eq, sql } from "drizzle-orm";
import { credits, films, newId, people, slugify, type Db } from "@precept/db";
import {
  backdropUrl,
  fetchMovieFull,
  fetchMovieMetadata,
  posterUrl,
  profileUrl,
  type TmdbMovie,
  type TmdbMovieWithCredits,
} from "./tmdb-client.js";

export type ImportResult = {
  filmId: string;
  slug: string;
  tmdbId: number;
  title: string;
  created: boolean;
  updated: boolean;
  creditsImported: boolean;
};

const WANTED_JOBS: Record<string, "director" | "cinematographer" | "composer" | "writer" | "editor"> =
  {
    Director: "director",
    "Director of Photography": "cinematographer",
    Cinematography: "cinematographer",
    "Original Music Composer": "composer",
    Screenplay: "writer",
    Writer: "writer",
    Editor: "editor",
  };

export async function resolveUniqueFilmSlug(
  db: Db,
  title: string,
  releaseYear: number,
  tmdbId: number,
  existingFilmId?: string
): Promise<string> {
  const base = slugify(title);
  const candidates = [base, `${base}-${releaseYear || "0"}`, `${base}-${tmdbId}`];

  for (const candidate of candidates) {
    const [hit] = await db.select({ id: films.id }).from(films).where(eq(films.slug, candidate));
    if (!hit || (existingFilmId && hit.id === existingFilmId)) return candidate;
  }

  // Extremely unlikely fallback
  return `${base}-${tmdbId}-${newId().slice(0, 6).toLowerCase()}`;
}

async function resolveUniquePersonSlug(db: Db, name: string, tmdbPersonId: number): Promise<string> {
  const base = slugify(name);
  const candidates = [base, `${base}-${tmdbPersonId}`];
  for (const candidate of candidates) {
    const [hit] = await db.select({ id: people.id }).from(people).where(eq(people.slug, candidate));
    if (!hit) return candidate;
  }
  return `${base}-${tmdbPersonId}-${newId().slice(0, 6).toLowerCase()}`;
}

function filmValuesFromMovie(movie: TmdbMovie, slug: string, filmId: string) {
  const year = movie.release_date ? Number(movie.release_date.slice(0, 4)) : 0;
  return {
    id: filmId,
    slug,
    tmdbId: movie.id,
    imdbId: movie.imdb_id ?? null,
    title: movie.title,
    originalTitle: movie.original_title ?? null,
    releaseYear: year || 0,
    releaseDate: movie.release_date ?? null,
    runtimeMinutes: movie.runtime ?? null,
    country: (movie.production_countries ?? []).map((c) => c.iso_3166_1),
    originalLanguage: movie.original_language ?? null,
    genres: (movie.genres ?? []).map((g) => g.name),
    synopsis: movie.overview ?? null,
    posterUrl: posterUrl(movie.poster_path),
    backdropUrl: backdropUrl(movie.backdrop_path),
    popularityScore: movie.popularity ?? 0,
    updatedAt: new Date(),
  };
}

export type ImportFilmOptions = {
  /** When true, refresh missing poster/backdrop (and other metadata) on existing rows. */
  backfill?: boolean;
};

/**
 * Upsert film metadata only — no credits/people.
 * Idempotent on films.tmdb_id.
 */
export async function importFilmMetadata(
  db: Db,
  tmdbId: number,
  apiKey: string,
  options: ImportFilmOptions = {}
): Promise<ImportResult> {
  const movie = await fetchMovieMetadata(apiKey, tmdbId);
  return upsertFilmMetadata(db, movie, options);
}

/**
 * Upsert film metadata + credits/people (director, DP, composer, writer, editor, top 8 cast).
 * Idempotent on films.tmdb_id; skips credit inserts when the film already has credits.
 */
export async function importFilmFull(
  db: Db,
  tmdbId: number,
  apiKey: string,
  options: ImportFilmOptions = {}
): Promise<ImportResult> {
  const movie = await fetchMovieFull(apiKey, tmdbId);
  const meta = await upsertFilmMetadata(db, movie, { backfill: options.backfill ?? true });
  const creditsImported = await importCreditsForFilm(db, meta.filmId, movie);
  return { ...meta, creditsImported };
}

async function upsertFilmMetadata(
  db: Db,
  movie: TmdbMovie,
  options: ImportFilmOptions
): Promise<ImportResult> {
  const year = movie.release_date ? Number(movie.release_date.slice(0, 4)) : 0;
  const [existing] = await db.select().from(films).where(eq(films.tmdbId, movie.id));

  if (existing) {
    let updated = false;
    const patch: Partial<typeof films.$inferInsert> = { updatedAt: new Date() };

    if (options.backfill) {
      if (!existing.posterUrl && movie.poster_path) {
        patch.posterUrl = posterUrl(movie.poster_path);
        updated = true;
      }
      if (!existing.backdropUrl && movie.backdrop_path) {
        patch.backdropUrl = backdropUrl(movie.backdrop_path);
        updated = true;
      }
      if (!existing.imdbId && movie.imdb_id) {
        patch.imdbId = movie.imdb_id;
        updated = true;
      }
      if (!existing.synopsis && movie.overview) {
        patch.synopsis = movie.overview;
        updated = true;
      }
      if ((!existing.runtimeMinutes || existing.runtimeMinutes === 0) && movie.runtime) {
        patch.runtimeMinutes = movie.runtime;
        updated = true;
      }
      if ((existing.popularityScore ?? 0) === 0 && movie.popularity) {
        patch.popularityScore = movie.popularity;
        updated = true;
      }
      const genres = (movie.genres ?? []).map((g) => g.name);
      if ((!existing.genres || (existing.genres as unknown[]).length === 0) && genres.length) {
        patch.genres = genres;
        updated = true;
      }
    }

    if (updated) {
      await db.update(films).set(patch).where(eq(films.id, existing.id));
    }

    return {
      filmId: existing.id,
      slug: existing.slug,
      tmdbId: movie.id,
      title: existing.title,
      created: false,
      updated,
      creditsImported: false,
    };
  }

  const filmId = newId();
  const slug = await resolveUniqueFilmSlug(db, movie.title, year || 0, movie.id);
  await db.insert(films).values(filmValuesFromMovie(movie, slug, filmId));

  return {
    filmId,
    slug,
    tmdbId: movie.id,
    title: movie.title,
    created: true,
    updated: false,
    creditsImported: false,
  };
}

async function ensurePerson(
  db: Db,
  person: { id: number; name: string; department?: string | null; profile_path?: string | null }
): Promise<string> {
  const [existing] = await db.select().from(people).where(eq(people.tmdbPersonId, person.id));
  if (existing) {
    if (!existing.photoUrl && person.profile_path) {
      await db
        .update(people)
        .set({ photoUrl: profileUrl(person.profile_path), updatedAt: new Date() })
        .where(eq(people.id, existing.id));
    }
    return existing.id;
  }

  const personId = newId();
  await db.insert(people).values({
    id: personId,
    slug: await resolveUniquePersonSlug(db, person.name, person.id),
    tmdbPersonId: person.id,
    name: person.name,
    primaryDepartment: person.department ?? null,
    photoUrl: profileUrl(person.profile_path),
  });
  return personId;
}

async function creditExists(
  db: Db,
  filmId: string,
  personId: string,
  roleType: string,
  characterName?: string | null
): Promise<boolean> {
  const rows = await db
    .select({ id: credits.id })
    .from(credits)
    .where(
      and(
        eq(credits.filmId, filmId),
        eq(credits.personId, personId),
        eq(credits.roleType, roleType as typeof credits.$inferInsert.roleType),
        characterName
          ? eq(credits.characterName, characterName)
          : sql`${credits.characterName} is null`
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

async function importCreditsForFilm(
  db: Db,
  filmId: string,
  movie: TmdbMovieWithCredits
): Promise<boolean> {
  const existingCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(credits)
    .where(eq(credits.filmId, filmId));
  if ((existingCount[0]?.n ?? 0) > 0) {
    return false;
  }

  const creditsPayload = movie.credits ?? {};
  let inserted = false;

  for (const person of creditsPayload.crew ?? []) {
    const role = person.job ? WANTED_JOBS[person.job] : undefined;
    if (!role) continue;
    const personId = await ensurePerson(db, {
      id: person.id,
      name: person.name,
      department: person.department,
      profile_path: person.profile_path,
    });
    if (await creditExists(db, filmId, personId, role)) continue;
    await db.insert(credits).values({
      id: newId(),
      personId,
      filmId,
      roleType: role,
      department: person.department ?? null,
    });
    inserted = true;
  }

  for (const actor of (creditsPayload.cast ?? []).slice(0, 8)) {
    const personId = await ensurePerson(db, {
      id: actor.id,
      name: actor.name,
      department: "Acting",
      profile_path: actor.profile_path,
    });
    if (await creditExists(db, filmId, personId, "actor", actor.character ?? null)) continue;
    await db.insert(credits).values({
      id: newId(),
      personId,
      filmId,
      roleType: "actor",
      characterName: actor.character ?? null,
      billingOrder: actor.order ?? null,
      department: "Acting",
    });
    inserted = true;
  }

  return inserted;
}
