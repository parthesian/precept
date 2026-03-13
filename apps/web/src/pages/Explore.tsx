import { useMemo, useState } from "react";
import { SearchPanel } from "../components/SearchPanel";
import { ShotGrid } from "../components/ShotGrid";
import { useSearch } from "../hooks/useSearch";

export function Explore() {
  const [query, setQuery] = useState("");
  const { data, isLoading, error } = useSearch(query ? `?${query}` : "");

  const rows = useMemo(
    () =>
      (data?.data ?? []).map((row: any, index: number) => ({
        id: row.id ?? `shot-${index}`,
        title: row.title ?? "Unknown Film",
        year: row.year ?? 0,
        tags: [row.shot_scale, row.setting, row.lighting].filter(Boolean),
      })),
    [data]
  );

  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <SearchPanel onChange={setQuery} />
      {isLoading ? <p>Loading shots...</p> : null}
      {error ? <p style={{ color: "#fca5a5" }}>Search failed.</p> : null}
      <ShotGrid shots={rows} />
    </section>
  );
}
