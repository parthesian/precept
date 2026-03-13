import { AudioVisualBadge } from "./AudioVisualBadge";

interface Props {
  title: string;
  year: number;
  thumbnail?: string;
  tags: string[];
  audioVisualRelationship?: string;
}

export function ShotCard({ title, year, thumbnail, tags, audioVisualRelationship }: Props) {
  return (
    <article
      style={{
        border: "1px solid #1f2937",
        borderRadius: 12,
        overflow: "hidden",
        background: "#111319",
      }}
    >
      <div style={{ aspectRatio: "16 / 9", background: "#0f172a" }}>
        {thumbnail ? (
          <img src={thumbnail} alt={`${title} thumbnail`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
      </div>
      <div style={{ padding: "0.75rem" }}>
        <strong>{title}</strong> <span style={{ color: "#9ca3af" }}>({year})</span>
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} style={{ fontSize: "0.75rem", color: "#d1d5db" }}>
              #{tag}
            </span>
          ))}
          {audioVisualRelationship ? <AudioVisualBadge value={audioVisualRelationship} /> : null}
        </div>
      </div>
    </article>
  );
}
