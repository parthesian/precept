const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8787").replace(/\/$/, "");

export function resolveApiUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? `${API_URL}${path}` : `${API_URL}/${path}`;
}

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

export interface FilmRow {
  id: string;
  title: string;
  year: number;
  director: string;
  cinematographer?: string | null;
  shot_count?: number;
}

export interface FilmShotRow {
  id: string;
  film_id: string;
  shot_index: number;
  timecode_start: number;
  timecode_end: number;
  duration_seconds: number;
  thumbnail: string;
  llm_description: string;
  shot_scale: string;
  setting: string;
  lighting: string;
  thumbnail_url: string;
}

export interface ShotDetailRow {
  id: string;
  film_id: string;
  shot_index: number;
  timecode_start: number;
  timecode_end: number;
  duration_seconds: number;
  frames: string;
  thumbnail: string;
  audio_clip?: string | null;
  shot_scale: string;
  camera_angle: string;
  camera_movement: string;
  composition: string;
  lighting: string;
  color_palette: string;
  dominant_colors: string;
  location_type: string;
  setting: string;
  time_of_day: string;
  subject_count: number;
  subject_actions: string;
  emotional_register: string;
  narrative_function: string;
  props_or_motifs?: string | null;
  music_present: number;
  music_type?: string | null;
  music_mood?: string | null;
  music_diegetic?: number | null;
  audio_visual_relationship: string;
  sound_design: string;
  dialogue_present: number;
  specific_song?: string | null;
  llm_description: string;
  embedding_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const api = {
  listFilms: () => request<{ data: FilmRow[] }>("/api/films"),
  listShotsByFilm: async (filmId: string) => {
    const result = await request<{ data: FilmShotRow[] }>(`/api/films/${filmId}/shots`);
    return {
      ...result,
      data: result.data.map((row) => ({
        ...row,
        thumbnail_url: resolveApiUrl(`/api/assets?key=${encodeURIComponent(row.thumbnail)}`),
      })),
    };
  },
  searchTags: async (query = "") => {
    const result = await request<{ data: SearchShotRow[] }>(`/api/search/tags${query}`);
    return {
      ...result,
      data: result.data.map((row) => ({
        ...row,
        thumbnail_url: resolveApiUrl(row.thumbnail_url),
      })),
    };
  },
  getSimilarShots: (embedding: number[]) =>
    request<{ data: unknown[] }>("/api/search/similar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embedding }),
    }),
  getConnections: (shotId: string) => request<{ data: unknown[] }>(`/api/shots/${shotId}/connections`),
  getShot: (shotId: string) => request<{ data: ShotDetailRow }>(`/api/shots/${shotId}`),
};
