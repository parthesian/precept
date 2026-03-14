import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

function topCounts(values: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
}

export function TagBrowser() {
  const shotsQuery = useQuery({
    queryKey: ["tag-browser"],
    queryFn: () => api.searchTags("?limit=200"),
  });
  const rows = shotsQuery.data?.data ?? [];
  const topScales = useMemo(() => topCounts(rows.map((r) => r.shot_scale)), [rows]);
  const topSettings = useMemo(() => topCounts(rows.map((r) => r.setting)), [rows]);
  const topLighting = useMemo(() => topCounts(rows.map((r) => r.lighting)), [rows]);

  return (
    <section className="panel">
      <h3 className="section-title" style={{ fontSize: "var(--text-xl)", marginTop: 0 }}>
        Visual Fingerprint
      </h3>
      {shotsQuery.isLoading ? <p className="muted">Loading tag stats...</p> : null}
      {!shotsQuery.isLoading && rows.length === 0 ? <p className="muted">No tagged shots found yet.</p> : null}
      {rows.length > 0 ? (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div>
            <strong>Top Shot Scales</strong>
            <div className="section-subtitle" style={{ marginTop: "0.25rem" }}>
              {topScales.map(([name, count]) => `${name} (${count})`).join(" · ")}
            </div>
          </div>
          <div>
            <strong>Top Settings</strong>
            <div className="section-subtitle" style={{ marginTop: "0.25rem" }}>
              {topSettings.map(([name, count]) => `${name} (${count})`).join(" · ")}
            </div>
          </div>
          <div>
            <strong>Top Lighting</strong>
            <div className="section-subtitle" style={{ marginTop: "0.25rem" }}>
              {topLighting.map(([name, count]) => `${name} (${count})`).join(" · ")}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
