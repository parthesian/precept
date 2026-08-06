import { TagBrowser } from "../components/TagBrowser";

export function Director() {
  return (
    <section style={{ display: "grid", gap: "6px", padding: "0 12px 18px" }}>
      <h2 className="section-title" style={{ marginBottom: 0 }}>
        Directors
      </h2>
      <p className="section-subtitle" style={{ margin: 0 }}>
        Start with Christopher Nolan as seed corpus, then expand to influences and peers.
      </p>
      <TagBrowser />
    </section>
  );
}
