#!/usr/bin/env node
import "dotenv/config";
import { createDb, credits, films, newId, people, slugify } from "@precept/db";
import { eq } from "drizzle-orm";

const TMDB = "https://api.themoviedb.org/3";

type TmdbMovie = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  runtime?: number;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  original_language?: string;
  popularity?: number;
  genres?: Array<{ name: string }>;
  production_countries?: Array<{ iso_3166_1: string }>;
  imdb_id?: string;
};

async function tmdb<T>(path: string, key: string): Promise<T> {
  const url = `${TMDB}${path}${path.includes("?") ? "&" : "?"}api_key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function resolveTitles(titles: string[], key: string): Promise<number[]> {
  const ids: number[] = [];
  for (const title of titles) {
    const data = await tmdb<{ results: Array<{ id: number; title: string }> }>(
      `/search/movie?query=${encodeURIComponent(title)}`,
      key
    );
    const hit = data.results?.[0];
    if (!hit) {
      console.warn(`No TMDB match for "${title}"`);
      continue;
    }
    ids.push(hit.id);
    // polite pacing — TMDB free tier ~40 req/10s
    await new Promise((r) => setTimeout(r, 260));
  }
  return ids;
}

async function importMovie(db: ReturnType<typeof createDb>, tmdbId: number, key: string) {
  const movie = await tmdb<TmdbMovie>(`/movie/${tmdbId}?append_to_response=credits`, key);
  const creditsPayload = (movie as any).credits as {
    cast?: Array<{ id: number; name: string; character?: string; order?: number; profile_path?: string }>;
    crew?: Array<{ id: number; name: string; job?: string; department?: string; profile_path?: string }>;
  };

  const year = movie.release_date ? Number(movie.release_date.slice(0, 4)) : 0;
  const slug = slugify(movie.title);
  const existing = await db.select().from(films).where(eq(films.tmdbId, movie.id));
  let filmId = existing[0]?.id;
  if (!filmId) {
    filmId = newId();
    await db.insert(films).values({
      id: filmId,
      slug: existing[0]?.slug ?? slug,
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
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdropUrl: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
        : null,
      popularityScore: movie.popularity ?? 0,
    });
    console.log(`film+ ${movie.title}`);
  } else {
    console.log(`film= ${movie.title} (exists)`);
  }

  const wantedJobs: Record<string, "director" | "cinematographer" | "composer" | "writer" | "editor"> = {
    Director: "director",
    "Director of Photography": "cinematographer",
    Cinematography: "cinematographer",
    "Original Music Composer": "composer",
    Screenplay: "writer",
    Writer: "writer",
    Editor: "editor",
  };

  for (const person of creditsPayload.crew ?? []) {
    const role = person.job ? wantedJobs[person.job] : undefined;
    if (!role) continue;
    let personId: string;
    const existingPerson = await db.select().from(people).where(eq(people.tmdbPersonId, person.id));
    if (existingPerson[0]) personId = existingPerson[0].id;
    else {
      personId = newId();
      await db.insert(people).values({
        id: personId,
        slug: slugify(person.name),
        tmdbPersonId: person.id,
        name: person.name,
        primaryDepartment: person.department ?? null,
        photoUrl: person.profile_path
          ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
          : null,
      });
    }
    await db.insert(credits).values({
      id: newId(),
      personId,
      filmId,
      roleType: role,
      department: person.department ?? null,
    });
  }

  for (const actor of (creditsPayload.cast ?? []).slice(0, 8)) {
    let personId: string;
    const existingPerson = await db.select().from(people).where(eq(people.tmdbPersonId, actor.id));
    if (existingPerson[0]) personId = existingPerson[0].id;
    else {
      personId = newId();
      await db.insert(people).values({
        id: personId,
        slug: slugify(actor.name),
        tmdbPersonId: actor.id,
        name: actor.name,
        primaryDepartment: "Acting",
        photoUrl: actor.profile_path
          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
          : null,
      });
    }
    await db.insert(credits).values({
      id: newId(),
      personId,
      filmId,
      roleType: "actor",
      characterName: actor.character ?? null,
      billingOrder: actor.order ?? null,
      department: "Acting",
    });
  }

  await new Promise((r) => setTimeout(r, 260));
}

async function main() {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    console.error(`
TMDB importer

Requires TMDB_API_KEY from https://www.themoviedb.org/settings/api
Free developer key; ~40 requests / 10 seconds.

Usage:
  npm run import:tmdb -- --tmdb-ids=155,27205,389
  npm run import:tmdb -- --titles="The Dark Knight,Inception,12 Angry Men"
`);
    process.exit(1);
  }

  const idsArg = process.argv.find((a) => a.startsWith("--tmdb-ids="))?.split("=")[1];
  const titlesArg = process.argv.find((a) => a.startsWith("--titles="))?.slice("--titles=".length);

  let ids: number[] = [];
  if (idsArg) ids = idsArg.split(",").map((x) => Number(x.trim())).filter(Boolean);
  else if (titlesArg) {
    ids = await resolveTitles(
      titlesArg.split(",").map((t) => t.trim()).filter(Boolean),
      key
    );
  } else {
    console.error("Provide --tmdb-ids= or --titles=");
    process.exit(1);
  }

  const db = createDb();
  for (const id of ids) {
    await importMovie(db, id, key);
  }
  console.log(`Imported ${ids.length} film(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
