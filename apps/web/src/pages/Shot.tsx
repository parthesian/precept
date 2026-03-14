import { ComparisonView } from "../components/ComparisonView";
import { ShotDetail } from "../components/ShotDetail";

interface ShotPageProps {
  selectedShotId?: string;
  onShotChange?: (shotId: string) => void;
}

export function Shot({ selectedShotId, onShotChange }: ShotPageProps) {
  return (
    <section style={{ display: "grid", gap: "8px", padding: "0 12px 22px" }}>
      <h2 className="section-title" style={{ marginBottom: 0 }}>
        Shot
      </h2>
      <ShotDetail initialShotId={selectedShotId} onShotChange={onShotChange} />
      <ComparisonView />
    </section>
  );
}
