import type { Connection, Film, Shot } from "@cinegraph/shared";

type D1 = D1Database;

export async function listFilms(db: D1, limit = 50, offset = 0): Promise<Film[]> {
  const result = await db
    .prepare(
      "SELECT * FROM films ORDER BY year DESC, title ASC LIMIT ?1 OFFSET ?2"
    )
    .bind(limit, offset)
    .all<Film>();

  return result.results;
}

export async function getFilmById(db: D1, id: string): Promise<Film | null> {
  const result = await db.prepare("SELECT * FROM films WHERE id = ?1").bind(id).first<Film>();
  return result ?? null;
}

export async function listShotsForFilm(
  db: D1,
  filmId: string,
  limit = 100,
  offset = 0
): Promise<Shot[]> {
  const result = await db
    .prepare(
      "SELECT * FROM shots WHERE film_id = ?1 ORDER BY timecode_start ASC LIMIT ?2 OFFSET ?3"
    )
    .bind(filmId, limit, offset)
    .all<Shot>();

  return result.results;
}

export async function getShotById(db: D1, id: string): Promise<Shot | null> {
  const result = await db.prepare("SELECT * FROM shots WHERE id = ?1").bind(id).first<Shot>();
  return result ?? null;
}

export async function getShotConnections(db: D1, shotId: string): Promise<Connection[]> {
  const result = await db
    .prepare(
      "SELECT * FROM connections WHERE source_shot_id = ?1 OR target_shot_id = ?1 ORDER BY created_at DESC"
    )
    .bind(shotId)
    .all<Connection>();

  return result.results;
}
