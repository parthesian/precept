import { FilmTimeline } from "../components/FilmTimeline";

export function Film() {
  return (
    <section style={{ display: "grid", gap: "6px", padding: "0 12px 18px" }}>
      <h2 className="section-title" style={{ marginBottom: 0 }}>
        Film
      </h2>
      <FilmTimeline />
    </section>
  );
}
