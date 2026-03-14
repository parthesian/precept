import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface HomeProps {
  onExplore: () => void;
}

export function Home({ onExplore }: HomeProps) {
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
  const curated = shots.slice(0, 8);

  return (
    <section style={{ display: "grid", gap: "8px", paddingBottom: "16px" }}>
      <section className="shot-main-frame" style={{ minHeight: "76vh" }}>
        {curated[0]?.thumbnail_url ? (
          <img src={curated[0].thumbnail_url} alt={`${curated[0].film_title} hero frame`} />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to top, rgba(10,10,11,0.88), rgba(10,10,11,0.24))",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            gap: "10px",
          }}
        >
          <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--text-3xl)", letterSpacing: "0.01em", fontWeight: 400 }}>
            PRECEPT
          </h1>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "var(--text-base)" }}>The visual genealogy of cinema</p>
          <button type="button" className="tag active" onClick={onExplore} style={{ borderRadius: 2 }}>
            Enter Explore
          </button>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title" style={{ marginBottom: "6px" }}>
          Symmetrical Hallway
        </h2>
        <div className="timeline-strip">
          {curated.map((shot) => (
            <article key={shot.id} className="timeline-segment" style={{ width: 170 }}>
              <img src={shot.thumbnail_url} alt={`${shot.film_title} shot`} />
              <span className="meta">{shot.film_year}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <span>
          <strong>{films.length}</strong> films
        </span>
        <span>
          <strong>{shots.length}</strong> indexed shots
        </span>
        <span>
          <strong>{new Set(films.map((film) => film.director)).size}</strong> directors
        </span>
      </section>
    </section>
  );
}
