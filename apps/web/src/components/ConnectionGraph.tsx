export function ConnectionGraph() {
  return (
    <section style={{ border: "1px solid #1f2937", borderRadius: 12, padding: "1rem", background: "#111319" }}>
      <h3 style={{ marginTop: 0 }}>Connection Graph</h3>
      <p style={{ color: "#9ca3af" }}>
        D3 force-directed visualization scaffold. Wire nodes/edges from `/api/connections/graph`.
      </p>
    </section>
  );
}
