import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const connectionTypes = [
  { key: "homage", color: "var(--conn-homage)" },
  { key: "quotation", color: "var(--conn-quotation)" },
  { key: "technique", color: "var(--conn-technique)" },
  { key: "convention", color: "var(--conn-convention)" },
  { key: "subversion", color: "var(--conn-subversion)" },
  { key: "parallel", color: "var(--conn-parallel)" },
];

interface NodeLayout {
  id: string;
  x: number;
  y: number;
  thumbnail: string;
  title: string;
  year: number;
}

interface EdgeLayout {
  id: string;
  from: NodeLayout;
  to: NodeLayout;
  type: (typeof connectionTypes)[number];
}

export function ConnectionGraph() {
  const shotsQuery = useQuery({
    queryKey: ["graph-seed-shots"],
    queryFn: () => api.searchTags("?limit=18"),
  });

  const graph = useMemo(() => {
    const rows = shotsQuery.data?.data ?? [];
    const centerX = 50;
    const centerY = 50;
    const radius = 36;
    const nodes: NodeLayout[] = rows.map((row, index) => {
      const angle = (index / Math.max(rows.length, 1)) * Math.PI * 2;
      const wobble = (index % 2 === 0 ? 1 : -1) * (index % 5);
      return {
        id: row.id,
        x: centerX + Math.cos(angle) * (radius + wobble),
        y: centerY + Math.sin(angle) * (radius + wobble),
        thumbnail: row.thumbnail_url,
        title: row.film_title,
        year: row.film_year,
      };
    });
    const edges: EdgeLayout[] = [];
    for (let index = 0; index < nodes.length - 1; index += 1) {
      edges.push({
        id: `${nodes[index].id}-${nodes[index + 1].id}`,
        from: nodes[index],
        to: nodes[index + 1],
        type: connectionTypes[index % connectionTypes.length],
      });
    }
    return { nodes, edges };
  }, [shotsQuery.data?.data]);

  const selectedType = "all";

  const controls = (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        zIndex: 4,
        border: "1px solid var(--border)",
        background: "rgba(26,26,30,0.88)",
        padding: "8px",
        display: "grid",
        gap: "6px",
      }}
    >
      <span className="meta-line">Connection Type</span>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", maxWidth: "280px" }}>
        <button type="button" className={`tag ${selectedType === "all" ? "active" : ""}`}>
          all
        </button>
        {connectionTypes.map((type) => (
          <span key={type.key} className="tag">
            {type.key}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <section className="graph-canvas">
      {controls}
      {graph.edges.map((edge) => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <div
            key={edge.id}
            className="graph-edge"
            style={{
              left: `${edge.from.x}%`,
              top: `${edge.from.y}%`,
              width: `${length}%`,
              transform: `rotate(${angle}deg)`,
              background: edge.type.color,
              boxShadow: `0 0 8px ${edge.type.color}`,
            }}
          />
        );
      })}
      {graph.nodes.map((node, index) => (
        <div
          key={node.id}
          className="graph-node"
          title={`${node.title} (${node.year})`}
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            animation: `fade-in 800ms ease ${index * 55}ms both`,
          }}
        >
          <img src={node.thumbnail} alt={`${node.title} node`} />
        </div>
      ))}
    </section>
  );
}
