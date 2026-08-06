/** Same-origin API client — cookies work without CORS. */
const API_URL = "";

export type Envelope<T> = {
  data?: T;
  meta?: Record<string, unknown>;
  errors?: Array<{ code: string; message: string }>;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as Envelope<T>;
  if (!res.ok) {
    throw new Error(json.errors?.[0]?.message ?? `Request failed: ${res.status}`);
  }
  return json.data as T;
}

export type TmdbSearchHit = {
  tmdb_id: number;
  title: string;
  release_year: number | null;
  overview: string | null;
  poster_url: string | null;
  popularity: number;
};

export type FilmImportResult = {
  film: {
    id: string;
    slug: string;
    title: string;
    tmdb_id?: number | null;
    release_year?: number;
    poster_url?: string | null;
  } | null;
  status: string;
  suggestionId: string | null;
};

async function requestEnvelope<T>(
  path: string,
  init?: RequestInit
): Promise<{ data: T; meta: Record<string, unknown> }> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });
  const json = (await res.json()) as Envelope<T>;
  if (!res.ok) {
    throw new Error(json.errors?.[0]?.message ?? `Request failed: ${res.status}`);
  }
  return { data: json.data as T, meta: (json.meta ?? {}) as Record<string, unknown> };
}

export const api = {
  search: (q: string, limit = 8) =>
    request<
      Record<
        string,
        Array<{
          id: string;
          type: string;
          slug: string;
          label: string;
          sublabel?: string;
          thumb?: string;
        }>
      >
    >(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  tmdbSearch: async (q: string, page = 1) => {
    const { data, meta } = await requestEnvelope<TmdbSearchHit[]>(
      `/api/tmdb/search?q=${encodeURIComponent(q)}&page=${page}`
    );
    return {
      results: data,
      page: Number(meta.page ?? page),
      total_pages: Number(meta.total_pages ?? 0),
    };
  },
  importFilm: (tmdbId: number, autoApprove = false) =>
    request<FilmImportResult>("/api/films/import", {
      method: "POST",
      body: JSON.stringify({ tmdb_id: tmdbId, auto_approve: autoApprove }),
    }),
  getFilm: (slug: string) => request<any>(`/api/films/${slug}`),
  getFilmConnections: (slug: string, query = "") =>
    request<any[]>(`/api/films/${slug}/connections${query}`),
  getFilmLocations: (slug: string) => request<any[]>(`/api/films/${slug}/locations`),
  getFilmPrecepts: (slug: string) => request<any[]>(`/api/films/${slug}/precepts`),
  getFilmCredits: (slug: string) => request<any[]>(`/api/films/${slug}/credits`),
  getPerson: (slug: string) => request<any>(`/api/people/${slug}`),
  getPersonFilms: (slug: string) => request<any[]>(`/api/people/${slug}/films`),
  getCollection: (slug: string) => request<any>(`/api/collections/${slug}`),
  getConnection: (id: string) => request<any>(`/api/connections/${id}`),
  getGraph: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<{ nodes: any[]; edges: any[] }>(`/api/graph?${qs}`);
  },
  getPlaces: (query = "") => request<any[]>(`/api/places${query}`),
  getPlace: (slug: string) => request<any>(`/api/places/${slug}`),
  getPrecepts: (query = "") => request<any[]>(`/api/precepts${query}`),
  getPrecept: (slug: string) => request<any>(`/api/precepts/${slug}`),
  getSpotlight: () => request<any>("/api/spotlight"),
  getSpotlightBySlug: (slug: string) => request<any>(`/api/spotlight/${slug}`),
  me: () => request<any>("/api/me"),
  login: (body: { email: string; password: string }) =>
    request<any>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body: { email: string; password: string; handle: string; display_name?: string }) =>
    request<any>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<any>("/api/auth/logout", { method: "POST" }),
  createSuggestion: (body: unknown) =>
    request<any>("/api/suggestions", { method: "POST", body: JSON.stringify(body) }),
  listSuggestions: (query = "") => request<any[]>(`/api/suggestions${query}`),
  approveSuggestion: (id: string, body: unknown = {}) =>
    request<any>(`/api/suggestions/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  rejectSuggestion: (id: string, body: unknown) =>
    request<any>(`/api/suggestions/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  vote: (body: unknown) => request<any>("/api/votes", { method: "POST", body: JSON.stringify(body) }),
};

export { API_URL };
