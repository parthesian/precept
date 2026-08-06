const TMDB = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

/** Free-tier pacing: ~40 req / 10s → ~260ms between calls. */
export const TMDB_PACE_MS = 260;

export type TmdbMovie = {
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
  genres?: Array<{ id?: number; name: string }>;
  production_countries?: Array<{ iso_3166_1: string; name?: string }>;
  imdb_id?: string;
};

export type TmdbCredits = {
  cast?: Array<{
    id: number;
    name: string;
    character?: string;
    order?: number;
    profile_path?: string | null;
  }>;
  crew?: Array<{
    id: number;
    name: string;
    job?: string;
    department?: string;
    profile_path?: string | null;
  }>;
};

export type TmdbMovieWithCredits = TmdbMovie & { credits?: TmdbCredits };

export type TmdbSearchResult = {
  id: number;
  title: string;
  release_date?: string;
  overview?: string;
  poster_path?: string | null;
  popularity?: number;
};

export type TmdbSearchResponse = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbSearchResult[];
};

export type TmdbDiscoverResponse = {
  page: number;
  total_pages: number;
  total_results: number;
  results: Array<{ id: number; title?: string; popularity?: number }>;
};

export function posterUrl(path: string | null | undefined, size = "w500"): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null | undefined, size = "w1280"): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function profileUrl(path: string | null | undefined, size = "w185"): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function tmdbFetch<T>(path: string, apiKey: string, init?: RequestInit): Promise<T> {
  const url = `${TMDB}${path}${path.includes("?") ? "&" : "?"}api_key=${apiKey}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TMDB ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Fetch with polite pacing after the request completes. */
export async function tmdbFetchPaced<T>(
  path: string,
  apiKey: string,
  paceMs = TMDB_PACE_MS
): Promise<T> {
  const data = await tmdbFetch<T>(path, apiKey);
  await sleep(paceMs);
  return data;
}

export async function searchMovies(
  apiKey: string,
  query: string,
  page = 1
): Promise<TmdbSearchResponse> {
  return tmdbFetchPaced<TmdbSearchResponse>(
    `/search/movie?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
    apiKey
  );
}

export async function discoverPopularMovies(
  apiKey: string,
  page: number
): Promise<TmdbDiscoverResponse> {
  return tmdbFetchPaced<TmdbDiscoverResponse>(
    `/discover/movie?sort_by=popularity.desc&page=${page}&include_adult=false`,
    apiKey
  );
}

export async function fetchMovieMetadata(apiKey: string, tmdbId: number): Promise<TmdbMovie> {
  return tmdbFetchPaced<TmdbMovie>(`/movie/${tmdbId}`, apiKey);
}

export async function fetchMovieFull(
  apiKey: string,
  tmdbId: number
): Promise<TmdbMovieWithCredits> {
  return tmdbFetchPaced<TmdbMovieWithCredits>(
    `/movie/${tmdbId}?append_to_response=credits`,
    apiKey
  );
}

export async function resolveTitlesToIds(titles: string[], apiKey: string): Promise<number[]> {
  const ids: number[] = [];
  for (const title of titles) {
    const data = await searchMovies(apiKey, title, 1);
    const hit = data.results?.[0];
    if (!hit) {
      console.warn(`No TMDB match for "${title}"`);
      continue;
    }
    ids.push(hit.id);
  }
  return ids;
}
