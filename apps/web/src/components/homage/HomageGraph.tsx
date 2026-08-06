"use client";

import { useQuery } from "@tanstack/react-query";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import Sigma from "sigma";
import { api } from "@/lib/api";
import { useSelectionStore } from "@/stores/selection";

const TYPE_COLOR: Record<string, string> = {
  film: "var(--entity-film)",
  person: "var(--entity-person)",
  place: "var(--entity-place)",
  precept: "var(--entity-precept)",
  collection: "var(--entity-collection)",
};

function resolveCssColor(value: string): string {
  if (typeof window === "undefined") return "#c4943a";
  if (!value.startsWith("var(")) return value;
  const name = value.slice(4, -1).trim();
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#c4943a";
}

function confidenceOpacity(tier?: string) {
  switch (tier) {
    case "confirmed":
      return 1;
    case "highly_likely":
      return 0.75;
    case "proposed":
      return 0.5;
    case "ai_suggested":
      return 0.35;
    default:
      return 0.6;
  }
}

export function HomageGraph({
  centerType,
  centerSlug,
}: {
  centerType: "film" | "person" | "collection";
  centerSlug: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { filters, suggestMode, highlightEdgeId, setHighlightEdgeId, setSelection, breadcrumb } =
    useSelectionStore();

  const edgeClasses = useMemo(() => {
    const base = filters.edgeClasses.length ? filters.edgeClasses : ["curated"];
    return base.join(",");
  }, [filters.edgeClasses]);

  const graphQuery = useQuery({
    queryKey: ["graph", centerType, centerSlug, edgeClasses],
    queryFn: () =>
      api.getGraph({
        center_type: centerType,
        center_slug: centerSlug,
        depth: "1",
        limit: "150",
        edge_classes: edgeClasses,
      }),
  });

  const data = graphQuery.data;

  useEffect(() => {
    if (!containerRef.current || !data) return;
    const graph = new Graph();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (const node of data.nodes) {
      graph.addNode(node.id, {
        label: node.label,
        size: Math.max(4, Math.min(18, (node.popularity_score ?? 10) / 8)),
        color: resolveCssColor(TYPE_COLOR[node.type] ?? TYPE_COLOR.film),
        x: Math.random(),
        y: Math.random(),
        slug: node.slug,
        nodeType: node.type,
      });
    }

    for (const edge of data.edges) {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
      if (edge.confidence_tier === "ai_suggested" && !suggestMode) continue;
      if (filters.connectionTypes.length && edge.connection_type) {
        if (!filters.connectionTypes.includes(edge.connection_type) && edge.edge_class === "curated") {
          continue;
        }
      }
      if (!graph.hasEdge(edge.id) && !graph.hasEdge(edge.source, edge.target)) {
        try {
          graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
            label: edge.title ?? edge.connection_type,
            size: edge.edge_class === "curated" ? 1.4 : 0.8,
            color:
              edge.confidence_tier === "ai_suggested"
                ? resolveCssColor("var(--confidence-ai)")
                : resolveCssColor("var(--text-tertiary)"),
            opacity: confidenceOpacity(edge.confidence_tier),
            edgeClass: edge.edge_class,
            dashed: edge.confidence_tier === "ai_suggested",
            type: edge.confidence_tier === "ai_suggested" ? "dashed" : "line",
          });
        } catch {
          // ignore duplicate
        }
      }
    }

    forceAtlas2.assign(graph, {
      iterations: reduced ? 20 : 60,
      settings: forceAtlas2.inferSettings(graph),
    });

    const sigma = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      labelDensity: 0.2,
      labelRenderedSizeThreshold: 8,
      defaultEdgeColor: resolveCssColor("var(--text-tertiary)"),
      allowInvalidContainer: true,
    });

    sigma.on("enterEdge", ({ edge }) => setHighlightEdgeId(edge));
    sigma.on("leaveEdge", () => setHighlightEdgeId(null));
    sigma.on("clickNode", ({ node }) => {
      const attrs = graph.getNodeAttributes(node);
      if (attrs.nodeType === "film") {
        setSelection({ type: "film", id: node, slug: attrs.slug, label: attrs.label });
        router.push(`/homage/film/${attrs.slug}`);
      } else if (attrs.nodeType === "person") {
        setSelection({ type: "person", id: node, slug: attrs.slug, label: attrs.label });
        router.push(`/homage/person/${attrs.slug}`);
      }
    });
    sigma.on("clickEdge", ({ edge }) => {
      if (String(edge).startsWith("derived_") || String(edge).startsWith("computed_")) return;
      router.push(`/connections/${edge}`);
    });

    return () => {
      sigma.kill();
      graph.clear();
    };
  }, [data, suggestMode, filters.connectionTypes, router, setHighlightEdgeId, setSelection]);

  useEffect(() => {
    // highlight handled via CSS overlay list; sigma edge state left simple for v1
    void highlightEdgeId;
  }, [highlightEdgeId]);

  return (
    <div className="graph-wrap">
      <div className="graph-toolbar">
        <div className="breadcrumb" aria-label="Graph breadcrumb">
          {breadcrumb.map((b) => (
            <button
              key={`${b.type}-${b.id}`}
              type="button"
              onClick={() => {
                setSelection(b, false);
                if (b.type === "film") router.push(`/homage/film/${b.slug}`);
                if (b.type === "person") router.push(`/homage/person/${b.slug}`);
              }}
            >
              {b.label ?? b.slug}
            </button>
          ))}
        </div>
        <div className="edge-class-toggles">
          {(["curated", "derived", "computed"] as const).map((cls) => {
            const on = filters.edgeClasses.includes(cls);
            return (
              <button
                key={cls}
                type="button"
                className={on ? "active" : ""}
                onClick={() => {
                  const next = on
                    ? filters.edgeClasses.filter((c) => c !== cls)
                    : [...filters.edgeClasses, cls];
                  useSelectionStore.getState().setFilters({
                    edgeClasses: next.length ? next : ["curated"],
                  });
                }}
              >
                {cls}
              </button>
            );
          })}
        </div>
      </div>
      {graphQuery.isLoading ? <p className="muted">Loading graph…</p> : null}
      {graphQuery.error ? (
        <p className="error">Could not load graph. Check the API and try again.</p>
      ) : null}
      <div ref={containerRef} className="graph-canvas" role="img" aria-label="Influence graph" />
    </div>
  );
}
