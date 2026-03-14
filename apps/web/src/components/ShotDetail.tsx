import { useEffect, useMemo, useRef, useState, type MouseEventHandler } from "react";
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

function toTimecode(value: number): string {
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((total % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function toDisplayShotNumber(shotIndex: number): number {
  return shotIndex + 1;
}

function normalizeColorToken(color: string): string | null {
  if (!color) return null;
  const token = color.trim();
  if (/^#([a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/.test(token)) return token;
  return null;
}

function barsForWaveform(seed: string, count = 120): number[] {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = (state * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    values.push(((state % 26) + 6) | 0);
  }
  return values;
}

function resolveMediaUrl(assetPath: string | null | undefined): string {
  if (!assetPath) return "";
  if (/^https?:\/\//i.test(assetPath) || assetPath.startsWith("/")) {
    return resolveApiUrl(assetPath);
  }
  return resolveApiUrl(`/api/assets?key=${encodeURIComponent(assetPath)}`);
}

interface ShotDetailProps {
  initialShotId?: string;
  onShotChange?: (shotId: string) => void;
}

export function ShotDetail({ initialShotId, onShotChange }: ShotDetailProps) {
  const shotListQuery = useQuery({
    queryKey: ["shot-selector-list"],
    queryFn: () => api.searchTags("?limit=200"),
  });
  const [selectedShotId, setSelectedShotId] = useState<string>("");
  const shotOptions = useMemo(() => {
    const rows = [...(shotListQuery.data?.data ?? [])];
    rows.sort((a, b) => {
      if (a.film_title !== b.film_title) return a.film_title.localeCompare(b.film_title);
      if (a.film_year !== b.film_year) return a.film_year - b.film_year;
      return a.shot_index - b.shot_index;
    });
    return rows;
  }, [shotListQuery.data?.data]);

  useEffect(() => {
    if (!selectedShotId && shotOptions.length > 0) {
      setSelectedShotId(shotOptions[0].id);
    }
  }, [selectedShotId, shotOptions]);

  useEffect(() => {
    if (!initialShotId || initialShotId === selectedShotId) return;
    setSelectedShotId(initialShotId);
  }, [initialShotId, selectedShotId]);

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
  const audioUrl = useMemo(() => resolveMediaUrl(shot?.audio_clip ?? null), [shot?.audio_clip]);

  useEffect(() => {
    if (!shot) return;
    setSelectedImageUrl(resolveApiUrl(`/api/assets?key=${encodeURIComponent(shot.thumbnail)}`));
  }, [shot?.id]);

  const visualTags = useMemo(() => {
    if (!shot) return [];
    return [
      shot.shot_scale,
      shot.camera_angle,
      ...parseJsonArray(shot.camera_movement),
      ...parseJsonArray(shot.composition),
      shot.lighting,
      shot.setting,
      shot.location_type,
      shot.time_of_day,
      ...parseJsonArray(shot.color_palette),
    ].filter(Boolean);
  }, [shot]);

  const audioTags = useMemo(() => {
    if (!shot) return [];
    return [
      shot.sound_design,
      shot.music_present ? "music present" : "no score",
      shot.music_type,
      shot.music_mood,
      shot.music_diegetic === 1 ? "diegetic" : shot.music_diegetic === 0 ? "non-diegetic" : "",
      shot.dialogue_present ? "dialogue" : "no dialogue",
    ].filter(Boolean);
  }, [shot]);

  const semanticTags = useMemo(() => {
    if (!shot) return [];
    return [shot.narrative_function, ...parseJsonArray(shot.subject_actions), ...parseJsonArray(shot.emotional_register), shot.props_or_motifs ?? ""].filter(
      Boolean
    );
  }, [shot]);

  const dominantColors = useMemo(() => {
    if (!shot) return [];
    const fromDominant = parseJsonArray(shot.dominant_colors).map(normalizeColorToken).filter((item): item is string => Boolean(item));
    if (fromDominant.length > 0) return fromDominant.slice(0, 5);
    const fallback = parseJsonArray(shot.color_palette).map(normalizeColorToken).filter((item): item is string => Boolean(item));
    return fallback.slice(0, 5);
  }, [shot]);

  const [playhead, setPlayhead] = useState(0.45);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformBars = useMemo(() => barsForWaveform(shot?.id ?? "precept"), [shot?.id]);
  const audioVisualLabel = shot?.audio_visual_relationship?.replaceAll("_", " ").toUpperCase();
  const selectedListItem = shotOptions.find((item) => item.id === shot?.id);

  useEffect(() => {
    if (!shot || !selectedListItem) return;
    document.title = `Shot ${toDisplayShotNumber(shot.shot_index)} - ${selectedListItem.film_title} (${selectedListItem.film_year}) - Precept`;
  }, [selectedListItem, shot]);

  useEffect(() => {
    setPlayhead(0);
    setIsPlaying(false);
    setAudioDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [shot?.id]);

  const seekToRatio = (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    setPlayhead(clamped);
    if (!audioRef.current) return;
    if (!Number.isFinite(audioRef.current.duration) || audioRef.current.duration <= 0) return;
    audioRef.current.currentTime = clamped * audioRef.current.duration;
  };

  const handleWaveformClick: MouseEventHandler<HTMLDivElement> = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    seekToRatio(ratio);
  };

  const togglePlayPause = async () => {
    if (!audioRef.current || !audioUrl) return;
    if (audioRef.current.paused) {
      await audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section className="shot-detail-shell">
      <h3 className="section-title">Shot Detail</h3>
      {shotListQuery.isLoading ? <p style={{ color: "#9ca3af" }}>Loading shots...</p> : null}
      {!shotListQuery.isLoading && shotOptions.length === 0 ? <p style={{ color: "#9ca3af" }}>No shots found yet.</p> : null}
      {shotOptions.length > 0 ? (
        <label style={{ display: "grid", gap: "0.45rem", maxWidth: 560 }}>
          <span className="meta-line">Select Shot</span>
          <select
            value={selectedShotId}
            onChange={(e) => {
              setSelectedShotId(e.target.value);
              onShotChange?.(e.target.value);
            }}
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              borderRadius: 2,
              padding: "0.55rem 0.7rem",
            }}
          >
            {shotOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.film_title} ({item.film_year}) - Shot {toDisplayShotNumber(item.shot_index)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {shotDetailQuery.isLoading ? <p style={{ color: "#9ca3af" }}>Loading shot detail...</p> : null}
      {shot ? (
        <div style={{ display: "grid", gap: "8px" }}>
          <div className="shot-main-frame">
            <img src={mainImageUrl} alt={`Shot ${toDisplayShotNumber(shot.shot_index)}`} />
          </div>

          <div className="filmstrip">
            {frameUrls.slice(0, 10).map((url, index) => (
              <button key={url} type="button" className={`filmstrip-thumb ${url === mainImageUrl ? "active" : ""}`} onClick={() => setSelectedImageUrl(url)}>
                <img src={url} alt={`Frame ${index + 1}`} />
              </button>
            ))}
          </div>

          {audioUrl ? (
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onLoadedMetadata={() => {
                if (!audioRef.current) return;
                setAudioDuration(audioRef.current.duration);
              }}
              onTimeUpdate={() => {
                if (!audioRef.current || !audioRef.current.duration) return;
                setPlayhead(audioRef.current.currentTime / audioRef.current.duration);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" className="tag" onClick={togglePlayPause} disabled={!audioUrl}>
              {isPlaying ? "Pause audio" : "Play audio"}
            </button>
            <span className="meta-mono">
              {toTimecode((playhead || 0) * (audioDuration || 0))} / {toTimecode(audioDuration || 0)}
            </span>
            {!audioUrl ? <span className="meta-line">No audio clip available.</span> : null}
          </div>

          <div className="waveform" onClick={handleWaveformClick} role="presentation">
            {waveformBars.map((value, index) => (
              <div
                key={`${value}-${index}`}
                className={`waveform-bar ${index / waveformBars.length <= playhead ? "active" : ""}`}
                style={{ height: `${value}px` }}
              />
            ))}
          </div>

          <div style={{ display: "grid", gap: "4px" }}>
            <div>
              <span className="film-title">{selectedListItem?.film_title ?? "Unknown Film"}</span>{" "}
              <span className="film-year">({selectedListItem?.film_year ?? "?"})</span>
            </div>
            <div className="meta-mono">
              {toTimecode(shot.timecode_start)} - {toTimecode(shot.timecode_end)} · {shot.duration_seconds.toFixed(1)}s
            </div>
          </div>

          <div className="tag-flow">
            <span className="label">Visual</span>
            {visualTags.join(" · ")}
          </div>
          <div className="tag-flow">
            <span className="label">Audio</span>
            {audioTags.join(" · ")}
          </div>
          {audioVisualLabel ? (
            <div className="tag-flow mono" style={{ borderLeft: "1px solid var(--accent-dim)", paddingLeft: "8px", color: "var(--text-primary)" }}>
              ⟷ {audioVisualLabel}
            </div>
          ) : null}
          <div className="tag-flow">
            <span className="label">Semantic</span>
            {semanticTags.join(" · ")}
          </div>

          {dominantColors.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="label" style={{ color: "var(--text-tertiary)", fontSize: "var(--text-xs)" }}>
                COLOR
              </span>
              {dominantColors.map((color) => (
                <span key={color} className="color-swatch" title={color} style={{ background: color }} />
              ))}
            </div>
          ) : null}

          <p className="section-subtitle" style={{ marginTop: "2px", maxWidth: "75ch" }}>
            {shot.llm_description}
          </p>
        </div>
      ) : null}
    </section>
  );
}
