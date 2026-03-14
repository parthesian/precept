import { useRef, useState, type MouseEvent, type WheelEventHandler } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type FilmShotRow } from "../lib/api";

function toDisplayShotNumber(shotIndex: number): number {
  return shotIndex + 1;
}

export function FilmTimeline() {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);
  const filmsQuery = useQuery({
    queryKey: ["films"],
    queryFn: api.listFilms,
  });
  const latestFilm = filmsQuery.data?.data?.[0];
  const shotsQuery = useQuery({
    queryKey: ["film-shots", latestFilm?.id],
    queryFn: () => api.listShotsByFilm(latestFilm!.id),
    enabled: Boolean(latestFilm?.id),
  });

  const handleWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    const el = timelineRef.current;
    if (!el) return;
    const horizontalDelta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
    event.preventDefault();
    el.scrollLeft += horizontalDelta;
  };

  const scrollByAmount = (amount: number) => {
    timelineRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const el = timelineRef.current;
    if (!el) return;
    setDragging(true);
    setDragStartX(event.clientX);
    setStartScrollLeft(el.scrollLeft);
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const el = timelineRef.current;
    if (!el) return;
    const delta = event.clientX - dragStartX;
    el.scrollLeft = startScrollLeft - delta;
  };

  const handleMouseUp = () => setDragging(false);

  const shots = shotsQuery.data?.data ?? [];
  const totalDuration = shots.reduce((sum, shot) => sum + Math.max(0.2, shot.duration_seconds), 0);
  const averageDuration = shots.length > 0 ? totalDuration / shots.length : 0;
  const dominantScale = shots.reduce(
    (acc, shot) => {
      acc.set(shot.shot_scale, (acc.get(shot.shot_scale) ?? 0) + 1);
      return acc;
    },
    new Map<string, number>()
  );
  const topScale = Array.from(dominantScale.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "n/a";

  return (
    <section className="panel">
      <h3 className="section-title" style={{ fontSize: "var(--text-xl)", marginBottom: "6px" }}>
        Film Timeline
      </h3>
      {filmsQuery.isLoading ? <p className="muted">Loading films...</p> : null}
      {!filmsQuery.isLoading && !latestFilm ? <p className="muted">No films found yet.</p> : null}
      {latestFilm ? (
        <p style={{ marginTop: 0 }}>
          <span className="film-title-inline">{latestFilm.title}</span> <span className="film-year">({latestFilm.year})</span>{" "}
          <span className="section-subtitle">by {latestFilm.director}</span>
        </p>
      ) : null}
      {shots.length ? (
        <div style={{ display: "grid", gap: "0.55rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <span className="meta-line">Use wheel/trackpad or drag to scrub timeline.</span>
            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <button onClick={() => scrollByAmount(-360)} className="tag">
                ◀
              </button>
              <button onClick={() => scrollByAmount(360)} className="tag">
                ▶
              </button>
            </div>
          </div>
          <div
            ref={timelineRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
            onMouseUp={handleMouseUp}
            className="timeline-strip"
            style={{ cursor: dragging ? "grabbing" : "grab", userSelect: "none" }}
          >
            {shots.map((shot: FilmShotRow) => (
              <article key={shot.id} className="timeline-segment" style={{ width: `${Math.max(12, (shot.duration_seconds / totalDuration) * 1800)}px` }}>
                <img
                  src={shot.thumbnail_url}
                  alt={`Shot ${toDisplayShotNumber(shot.shot_index)}`}
                  draggable={false}
                />
                <span className="meta">{shot.duration_seconds.toFixed(1)}s</span>
              </article>
            ))}
          </div>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <span className="meta-mono">avg shot {averageDuration.toFixed(2)}s</span>
            <span className="meta-mono">total {totalDuration.toFixed(1)}s</span>
            <span className="meta-mono">dominant scale {topScale}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
