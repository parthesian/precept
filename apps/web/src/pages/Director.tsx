import { TagBrowser } from "../components/TagBrowser";

export function Director() {
  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <h2 style={{ marginBottom: 0 }}>Director Overview</h2>
      <p style={{ color: "#9ca3af", margin: 0 }}>
        Start with Christopher Nolan as seed corpus, then expand to influences and peers.
      </p>
      <TagBrowser />
    </section>
  );
}
