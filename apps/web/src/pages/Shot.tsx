import { ComparisonView } from "../components/ComparisonView";
import { ShotDetail } from "../components/ShotDetail";

export function Shot() {
  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <h2 style={{ marginBottom: 0 }}>Shot Page</h2>
      <ShotDetail />
      <ComparisonView />
    </section>
  );
}
