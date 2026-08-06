"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { useSelectionStore } from "@/stores/selection";

export function SideList({ filmSlug }: { filmSlug: string }) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { filters, setFilters, highlightEdgeId, setHighlightEdgeId, suggestMode } =
    useSelectionStore();

  const connections = useQuery({
    queryKey: ["film-connections", filmSlug, filters.sort],
    queryFn: () => api.getFilmConnections(filmSlug, `?sort=${filters.sort}&limit=100`),
  });

  const rows = useMemo(() => {
    let list = connections.data ?? [];
    if (filters.connectionTypes.length) {
      list = list.filter((r) => filters.connectionTypes.includes(r.connection_type));
    }
    if (filters.minConfidence) {
      const order = ["confirmed", "highly_likely", "proposed", "ai_suggested"];
      const min = order.indexOf(filters.minConfidence);
      list = list.filter((r) => order.indexOf(r.confidence_tier) <= min);
    }
    if (!suggestMode) {
      list = list.filter((r) => r.confidence_tier !== "ai_suggested");
    }
    return list;
  }, [connections.data, filters, suggestMode]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  return (
    <aside className="side-list" aria-label="Connections list">
      <div className="side-list-controls">
        <label>
          Sort
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ sort: e.target.value as any })}
          >
            <option value="score">Score</option>
            <option value="popularity">Popularity</option>
            <option value="chronological">Chronological</option>
          </select>
        </label>
        <label>
          Min confidence
          <select
            value={filters.minConfidence ?? ""}
            onChange={(e) => setFilters({ minConfidence: e.target.value || null })}
          >
            <option value="">Any</option>
            <option value="confirmed">Confirmed</option>
            <option value="highly_likely">Highly likely</option>
            <option value="proposed">Proposed</option>
            <option value="ai_suggested">AI suggested</option>
          </select>
        </label>
      </div>

      <div ref={parentRef} className="side-list-scroll" tabIndex={0}>
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index];
            const active = highlightEdgeId === row.id;
            return (
              <button
                key={row.id}
                type="button"
                className={`side-list-row ${active ? "active" : ""} ${
                  row.confidence_tier === "ai_suggested" ? "ai" : ""
                }`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: item.size,
                  transform: `translateY(${item.start}px)`,
                }}
                onMouseEnter={() => setHighlightEdgeId(row.id)}
                onMouseLeave={() => setHighlightEdgeId(null)}
                onFocus={() => setHighlightEdgeId(row.id)}
                onClick={() => navigate(`/connections/${row.id}`)}
              >
                <span className="row-title">{row.title}</span>
                <span className="row-meta">
                  {row.connection_type.replace(/_/g, " ")} · {row.confidence_tier.replace(/_/g, " ")}
                  {row.confidence_tier === "ai_suggested" ? " · AI" : ""}
                </span>
              </button>
            );
          })}
        </div>
        {!connections.isLoading && rows.length === 0 ? (
          <p className="empty-invite">
            No connections yet. Turn on Suggest mode to propose the first edge.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
