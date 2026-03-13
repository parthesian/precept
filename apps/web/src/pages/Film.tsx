import { FilmTimeline } from "../components/FilmTimeline";

export function Film() {
  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <h2 style={{ marginBottom: 0 }}>Film Page</h2>
      <FilmTimeline />
    </section>
  );
}
