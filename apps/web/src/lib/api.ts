const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export interface SearchShotRow {
  id: string;
  film_id: string;
  shot_index: number;
  shot_scale: string;
  setting: string;
  lighting: string;
  audio_visual_relationship: string;
  thumbnail: string;
  thumbnail_url: string;
  llm_description: string;
  film_title: string;
  film_year: number;
  film_director: string;
}

export const api = {
  listFilms: () => request<{ data: unknown[] }>("/api/films"),
  listShotsByFilm: (filmId: string) => request<{ data: unknown[] }>(`/api/films/${filmId}/shots`),
  searchTags: (query = "") => request<{ data: SearchShotRow[] }>(`/api/search/tags${query}`),
  getSimilarShots: (embedding: number[]) =>
    request<{ data: unknown[] }>("/api/search/similar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embedding }),
    }),
  getConnections: (shotId: string) => request<{ data: unknown[] }>(`/api/shots/${shotId}/connections`),
};
