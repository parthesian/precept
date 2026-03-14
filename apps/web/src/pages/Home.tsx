import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function Home() {
  const filmsQuery = useQuery({
    queryKey: ["home-films"],
    queryFn: api.listFilms,
  });
  const sampleShotsQuery = useQuery({
    queryKey: ["home-shots"],
    queryFn: () => api.searchTags("?limit=200"),
  });
  const films = filmsQuery.data?.data ?? [];
  const shots = sampleShotsQuery.data?.data ?? [];

  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <h2>Home</h2>
      <p style={{ color: "#9ca3af" }}>
        Precept maps visual, audio, and semantic lineages between shots across film history.
      </p>
      <section style={{ border: "1px solid #1f2937", borderRadius: 12, padding: "1rem", background: "#111319" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", color: "#e5e7eb" }}>
          <div>
            <strong>{films.length}</strong> films
          </div>
          <div>
            <strong>{shots.length}</strong> indexed shots
          </div>
          <div>
            <strong>{new Set(films.map((f) => f.director)).size}</strong> directors
          </div>
        </div>
      </section>
    </section>
  );
}
