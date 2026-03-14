import { useMemo, useState } from "react";
import { ShotGrid } from "../components/ShotGrid";
import { useSearch } from "../hooks/useSearch";
import type { SearchShotRow } from "../lib/api";

interface ExploreProps {
  onOpenShot: (shotId: string) => void;
}

type FilterCategory = "shot_scale" | "setting" | "lighting" | "audio_visual_relationship";

function topCounts(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);
}

export function Explore({ onOpenShot }: ExploreProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<Record<FilterCategory, string[]>>({
    shot_scale: [],
    setting: [],
    lighting: [],
    audio_visual_relationship: [],
  });

  const query = useMemo(() => {
    const params = new URLSearchParams({ limit: "300" });
    (Object.keys(filters) as FilterCategory[]).forEach((key) => {
      filters[key].forEach((value) => params.append(key, value));
    });
    return `?${params.toString()}`;
  }, [filters]);

  const { data, isLoading, error } = useSearch(query);
  const allShotsQuery = useSearch("?limit=450");
  const optionRows = allShotsQuery.data?.data ?? [];

  const rows = useMemo(
    () =>
      (data?.data ?? []).map((row: SearchShotRow, index: number) => ({
        id: row.id ?? `shot-${index}`,
        title: row.film_title ?? "Unknown Film",
        year: row.film_year ?? 0,
        tags: [row.shot_scale, row.setting, row.lighting].filter(Boolean),
        thumbnail: row.thumbnail_url,
        timecodeStart: row.shot_index,
        shotScale: row.shot_scale,
        audioVisualRelationship: row.audio_visual_relationship,
      })),
    [data]
  );

  const filterOptions = useMemo(
    () => ({
      shot_scale: topCounts(optionRows.map((row) => row.shot_scale)),
      setting: topCounts(optionRows.map((row) => row.setting)),
      lighting: topCounts(optionRows.map((row) => row.lighting)),
      audio_visual_relationship: topCounts(optionRows.map((row) => row.audio_visual_relationship)),
    }),
    [optionRows]
  );

  const activeFilters = useMemo(
    () =>
      (Object.keys(filters) as FilterCategory[]).flatMap((key) =>
        filters[key].map((value) => ({
          category: key,
          value,
        }))
      ),
    [filters]
  );

  const toggleFilter = (category: FilterCategory, value: string) => {
    setFilters((prev) => {
      const hasFilter = prev[category].includes(value);
      return {
        ...prev,
        [category]: hasFilter ? prev[category].filter((item) => item !== value) : [...prev[category], value],
      };
    });
  };

  const removeFilter = (category: FilterCategory, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [category]: prev[category].filter((item) => item !== value),
    }));
  };

  return (
    <section style={{ display: "grid", gap: "6px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px" }}>
        <h2 className="section-title">Explore</h2>
        <button type="button" className="tag" onClick={() => setDrawerOpen(true)}>
          Filters
        </button>
      </div>

      {activeFilters.length > 0 ? (
        <div className="active-filter-bar">
          {activeFilters.map((item) => (
            <button
              key={`${item.category}-${item.value}`}
              type="button"
              className="tag active"
              onClick={() => removeFilter(item.category, item.value)}
            >
              {item.value}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? <p className="muted" style={{ padding: "0 12px" }}>Loading shots...</p> : null}
      {error ? <p style={{ color: "#ad6b7b", padding: "0 12px" }}>Search failed.</p> : null}
      {!isLoading && rows.length === 0 ? <p className="empty-state">No shots match these criteria.</p> : null}
      <ShotGrid shots={rows} onSelect={onOpenShot} />

      {drawerOpen ? <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} role="presentation" /> : null}
      <aside className={`filter-drawer ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <h3 className="section-title" style={{ fontSize: "var(--text-lg)" }}>
            Filters
          </h3>
          <button type="button" className="tag" onClick={() => setDrawerOpen(false)}>
            Close
          </button>
        </div>
        {(Object.keys(filterOptions) as FilterCategory[]).map((category) => (
          <div key={category} className="filter-group">
            <h4>{category.replaceAll("_", " ")}</h4>
            <div className="filter-tag-row">
              {filterOptions[category].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`tag ${filters[category].includes(option) ? "active" : ""}`}
                  onClick={() => toggleFilter(category, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>
    </section>
  );
}
