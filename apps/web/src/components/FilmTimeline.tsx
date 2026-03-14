import { useRef, useState, type MouseEvent, type WheelEventHandler } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type FilmShotRow } from "../lib/api";

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

  return (
    <section style={{ border: "1px solid #1f2937", borderRadius: 12, padding: "1rem", background: "#111319" }}>
      <h3 style={{ marginTop: 0 }}>Film Timeline</h3>
      {filmsQuery.isLoading ? <p style={{ color: "#9ca3af" }}>Loading films...</p> : null}
      {!filmsQuery.isLoading && !latestFilm ? <p style={{ color: "#9ca3af" }}>No films found yet.</p> : null}
      {latestFilm ? (
        <p style={{ color: "#9ca3af", marginTop: 0 }}>
          Showing latest film: <strong style={{ color: "#e5e7eb" }}>{latestFilm.title}</strong> ({latestFilm.year})
        </p>
      ) : null}
      {shotsQuery.data?.data?.length ? (
        <div style={{ display: "grid", gap: "0.55rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#9ca3af", fontSize: "0.82rem" }}>Use mouse wheel/trackpad or drag to scrub timeline.</span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                onClick={() => scrollByAmount(-360)}
                style={{
                  border: "1px solid #2d3748",
                  background: "#0b1220",
                  color: "#e5e7eb",
                  borderRadius: 8,
                  padding: "0.3rem 0.55rem",
                  cursor: "pointer",
                }}
              >
                ◀
              </button>
              <button
                onClick={() => scrollByAmount(360)}
                style={{
                  border: "1px solid #2d3748",
                  background: "#0b1220",
                  color: "#e5e7eb",
                  borderRadius: 8,
                  padding: "0.3rem 0.55rem",
                  cursor: "pointer",
                }}
              >
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
            style={{
              display: "grid",
              gridAutoFlow: "column",
              gridAutoColumns: "minmax(220px, 260px)",
              gap: "0.65rem",
              overflowX: "auto",
              overflowY: "hidden",
              maxWidth: "100%",
              overscrollBehaviorX: "contain",
              paddingBottom: "0.35rem",
              cursor: dragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
          >
            {shotsQuery.data.data.map((shot: FilmShotRow) => (
              <article
                key={shot.id}
                style={{ border: "1px solid #1f2937", borderRadius: 10, overflow: "hidden", background: "#0b1220" }}
              >
                <img
                  src={shot.thumbnail_url}
                  alt={`Shot ${shot.shot_index}`}
                  draggable={false}
                  style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
                />
                <div style={{ padding: "0.55rem 0.65rem", fontSize: "0.8rem" }}>
                  <div style={{ color: "#e5e7eb" }}>Shot {shot.shot_index}</div>
                  <div style={{ color: "#9ca3af" }}>
                    {shot.shot_scale} · {shot.setting}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
