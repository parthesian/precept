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

  return (
    <section style={{ border: "1px solid #1f2937", borderRadius: 12, padding: "1rem", background: "#111319" }}>
      <h3 style={{ marginTop: 0 }}>Tag Browser</h3>
      {shotsQuery.isLoading ? <p style={{ color: "#9ca3af" }}>Loading tag stats...</p> : null}
      {!shotsQuery.isLoading && rows.length === 0 ? <p style={{ color: "#9ca3af" }}>No tagged shots found yet.</p> : null}
      {rows.length > 0 ? (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div>
            <strong style={{ color: "#e5e7eb" }}>Top Shot Scales</strong>
            <div style={{ color: "#9ca3af", marginTop: "0.25rem", fontSize: "0.9rem" }}>
              {topScales.map(([name, count]) => `${name} (${count})`).join(" · ")}
            </div>
          </div>
          <div>
            <strong style={{ color: "#e5e7eb" }}>Top Settings</strong>
            <div style={{ color: "#9ca3af", marginTop: "0.25rem", fontSize: "0.9rem" }}>
              {topSettings.map(([name, count]) => `${name} (${count})`).join(" · ")}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
