const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787").replace(/\/$/, "");

export type Envelope<T> = { data?: T; meta?: Record<string, unknown>; errors?: Array<{ code: string; message: string }> };

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

export const api = {
  search: (q: string, limit = 8) =>
    request<Record<string, Array<{ id: string; type: string; slug: string; label: string; sublabel?: string; thumb?: string }>>>(
      `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  getFilm: (slug: string) => request<any>(`/api/films/${slug}`),
  getFilmConnections: (slug: string, query = "") => request<any[]>(`/api/films/${slug}/connections${query}`),
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
  createSuggestion: (body: unknown) =>
    request<any>("/api/suggestions", { method: "POST", body: JSON.stringify(body) }),
  vote: (body: unknown) => request<any>("/api/votes", { method: "POST", body: JSON.stringify(body) }),
};

export { API_URL };
