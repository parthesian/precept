import { AudioVisualBadge } from "./AudioVisualBadge";
import { useState } from "react";

interface Props {
  id: string;
  title: string;
  year: number;
  thumbnail?: string;
  tags: string[];
  timecodeStart?: number;
  shotScale?: string;
  audioVisualRelationship?: string;
  onSelect?: (shotId: string) => void;
}

function asTimecode(shotIndex = 0): string {
  const minutes = Math.floor(shotIndex / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (shotIndex % 60).toString().padStart(2, "0");
  return `00:${minutes}:${seconds}`;
}

export function ShotCard({ id, title, year, thumbnail, tags, timecodeStart, shotScale, audioVisualRelationship, onSelect }: Props) {
  const [imageLoaded, setImageLoaded] = useState(false);
  return (
    <article className="shot-card" onClick={() => onSelect?.(id)} role="button" tabIndex={0}>
      <div style={{ width: "100%", height: "100%", background: "var(--surface-1)" }}>
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`${title} thumbnail`}
            className={imageLoaded ? "loaded" : ""}
            onLoad={() => setImageLoaded(true)}
            style={{ objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div className="shot-card-overlay">
        <div className="shot-card-meta">
          <div>
            <span className="film-title-inline">{title}</span> <span className="film-year">({year})</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
            <span className="meta-mono">{asTimecode(timecodeStart)}</span>
            <span className="meta-line">{shotScale}</span>
          </div>
          <div className="meta-line">{tags.slice(0, 3).join(" · ")}</div>
          {audioVisualRelationship ? (
            <div style={{ marginTop: "2px" }}>
              <AudioVisualBadge value={audioVisualRelationship} />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
