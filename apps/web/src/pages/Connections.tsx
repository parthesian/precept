import { ConnectionGraph } from "../components/ConnectionGraph";

export function Connections() {
  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <h2 style={{ marginBottom: 0 }}>Connections</h2>
      <ConnectionGraph />
    </section>
  );
}
