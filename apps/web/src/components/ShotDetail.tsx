import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, resolveApiUrl } from "../lib/api";

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function ShotDetail() {
  const shotListQuery = useQuery({
    queryKey: ["shot-selector-list"],
    queryFn: () => api.searchTags("?limit=200"),
  });
  const [selectedShotId, setSelectedShotId] = useState<string>("");
  const shotOptions = shotListQuery.data?.data ?? [];

  useEffect(() => {
    if (!selectedShotId && shotOptions.length > 0) {
      setSelectedShotId(shotOptions[0].id);
    }
  }, [selectedShotId, shotOptions]);

  const shotDetailQuery = useQuery({
    queryKey: ["shot-detail", selectedShotId],
    queryFn: () => api.getShot(selectedShotId),
    enabled: Boolean(selectedShotId),
  });
  const shot = shotDetailQuery.data?.data;
  const frameUrls = useMemo(
    () => parseJsonArray(shot?.frames).map((key) => resolveApiUrl(`/api/assets?key=${encodeURIComponent(key)}`)),
    [shot?.frames]
  );
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>("");
  const mainImageUrl = selectedImageUrl || (shot ? resolveApiUrl(`/api/assets?key=${encodeURIComponent(shot.thumbnail)}`) : "");

  useEffect(() => {
    if (!shot) return;
    setSelectedImageUrl(resolveApiUrl(`/api/assets?key=${encodeURIComponent(shot.thumbnail)}`));
  }, [shot?.id]);

  const taxonomyBadges = useMemo(() => {
    if (!shot) return [];
    return [
      shot.shot_scale,
      shot.camera_angle,
      shot.lighting,
      shot.location_type,
      shot.setting,
      shot.time_of_day,
      shot.narrative_function,
      shot.audio_visual_relationship,
      shot.sound_design,
      ...parseJsonArray(shot.camera_movement),
      ...parseJsonArray(shot.composition),
      ...parseJsonArray(shot.color_palette),
      ...parseJsonArray(shot.subject_actions),
      ...parseJsonArray(shot.emotional_register),
    ].filter(Boolean);
  }, [shot]);

  return (
    <section style={{ border: "1px solid #1f2937", borderRadius: 12, padding: "1rem", background: "#111319" }}>
      <h3 style={{ marginTop: 0 }}>Shot Detail</h3>
      {shotListQuery.isLoading ? <p style={{ color: "#9ca3af" }}>Loading shots...</p> : null}
      {!shotListQuery.isLoading && shotOptions.length === 0 ? <p style={{ color: "#9ca3af" }}>No shots found yet.</p> : null}
      {shotOptions.length > 0 ? (
        <label style={{ display: "grid", gap: "0.45rem", maxWidth: 520 }}>
          <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Select Shot</span>
          <select
            value={selectedShotId}
            onChange={(e) => setSelectedShotId(e.target.value)}
            style={{
              background: "#0b1220",
              border: "1px solid #374151",
              color: "#e5e7eb",
              borderRadius: 8,
              padding: "0.55rem 0.7rem",
            }}
          >
            {shotOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.film_title} ({item.film_year}) - Shot {item.shot_index}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {shotDetailQuery.isLoading ? <p style={{ color: "#9ca3af" }}>Loading shot detail...</p> : null}
      {shot ? (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <img
            src={mainImageUrl}
            alt={`Shot ${shot.shot_index}`}
            style={{ width: "100%", maxWidth: 520, borderRadius: 10, border: "1px solid #1f2937" }}
          />
          <div style={{ color: "#e5e7eb" }}>
            <strong>
              Shot {shot.shot_index}
            </strong>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {taxonomyBadges.map((tag, index) => (
              <span key={`${tag}-${index}`} style={{ fontSize: "0.75rem", color: "#d1d5db" }}>
                #{tag}
              </span>
            ))}
          </div>
          {frameUrls.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.45rem" }}>
              {frameUrls.slice(0, 5).map((url) => (
                <button
                  key={url}
                  onClick={() => setSelectedImageUrl(url)}
                  style={{
                    border: url === mainImageUrl ? "2px solid #60a5fa" : "1px solid #1f2937",
                    background: "transparent",
                    borderRadius: 8,
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <img src={url} alt="Shot frame" style={{ width: "100%", borderRadius: 7, display: "block" }} />
                </button>
              ))}
            </div>
          ) : null}
          <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>{shot.llm_description}</div>
        </div>
      ) : null}
    </section>
  );
}
