import { ConnectionGraph } from "../components/ConnectionGraph";

export function Connections() {
  return (
    <section style={{ display: "grid", gap: "8px", padding: "0 12px 16px" }}>
      <h2 className="section-title" style={{ marginBottom: 0 }}>
        Connections
      </h2>
      <ConnectionGraph />
    </section>
  );
}
