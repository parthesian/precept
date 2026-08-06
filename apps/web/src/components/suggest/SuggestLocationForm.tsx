"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { submitSuggestion } from "@/lib/suggest";
import { useSelectionStore } from "@/stores/selection";

export function SuggestLocationForm({
  filmId,
  filmSlug,
}: {
  filmId?: string;
  filmSlug?: string;
}) {
  const suggestMode = useSelectionStore((s) => s.suggestMode);
  const qc = useQueryClient();
  const [filmIdLocal, setFilmIdLocal] = useState(filmId ?? "");
  const [placeName, setPlaceName] = useState("");
  const [lat, setLat] = useState("41.88");
  const [lng, setLng] = useState("-87.63");
  const [locality, setLocality] = useState("");
  const [country, setCountry] = useState("US");
  const [placeKind, setPlaceKind] = useState("landmark");
  const [relationship, setRelationship] = useState("filmed_at");
  const [scene, setScene] = useState("");
  const [timecodeStart, setTimecodeStart] = useState("00:10:00");
  const [timecodeEnd, setTimecodeEnd] = useState("00:11:00");
  const [doublingFor, setDoublingFor] = useState("");
  const [existingPlaceId, setExistingPlaceId] = useState("");
  const [citation, setCitation] = useState("");
  const [evidenceType, setEvidenceType] = useState("article");
  const [autoApprove, setAutoApprove] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  if (!suggestMode) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const fid = filmIdLocal || filmId;
    if (!fid) {
      setMessage("film id is required");
      return;
    }
    if (!citation.trim()) {
      setMessage("At least one evidence citation is required");
      return;
    }

    const payload: Record<string, unknown> = {
      film_id: fid,
      relationship,
      scene_description: scene,
      timecode_start: timecodeStart,
      timecode_end: timecodeEnd,
      is_doubling_for: doublingFor || null,
      evidence: [
        {
          evidence_type: evidenceType,
          citation_text: citation,
          excerpt: "Location evidence excerpt under fifteen words.",
        },
      ],
    };

    if (existingPlaceId.trim()) {
      payload.place_id = existingPlaceId.trim();
    } else {
      if (!placeName.trim()) {
        setMessage("Provide a new place name or an existing place id");
        return;
      }
      payload.place = {
        name: placeName,
        lat: Number(lat),
        lng: Number(lng),
        locality: locality || null,
        country: country || null,
        place_kind: placeKind,
        still_extant: true,
      };
    }

    const result = await submitSuggestion({
      target_type: "film_location",
      operation: "create",
      auto_approve: autoApprove,
      payload,
      evidence: payload.evidence,
    });
    setMessage(result.message);
    if (result.ok && filmSlug) {
      qc.invalidateQueries({ queryKey: ["film-locations", filmSlug] });
      qc.invalidateQueries({ queryKey: ["places"] });
    }
  }

  return (
    <form className="suggest-form" onSubmit={onSubmit}>
      <h3>Add location</h3>
      <p className="muted">Create a new place in-flow, or paste an existing place id.</p>
      <label>
        Film id
        <input
          className="search-input"
          value={filmIdLocal}
          onChange={(e) => setFilmIdLocal(e.target.value)}
          required
        />
      </label>
      <label>
        Existing place id (optional)
        <input
          className="search-input"
          value={existingPlaceId}
          onChange={(e) => setExistingPlaceId(e.target.value)}
          placeholder="leave blank to create a place"
        />
      </label>
      {!existingPlaceId ? (
        <>
          <label>
            New place name
            <input
              className="search-input"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
            />
          </label>
          <label>
            Kind
            <select value={placeKind} onChange={(e) => setPlaceKind(e.target.value)}>
              {["building", "street", "landmark", "natural", "studio_backlot", "neighborhood", "region"].map(
                (k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                )
              )}
            </select>
          </label>
          <label>
            Lat
            <input className="search-input" value={lat} onChange={(e) => setLat(e.target.value)} />
          </label>
          <label>
            Lng
            <input className="search-input" value={lng} onChange={(e) => setLng(e.target.value)} />
          </label>
          <label>
            Locality
            <input className="search-input" value={locality} onChange={(e) => setLocality(e.target.value)} />
          </label>
          <label>
            Country
            <input className="search-input" value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>
        </>
      ) : null}
      <label>
        Relationship
        <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
          <option value="filmed_at">filmed_at</option>
          <option value="set_in">set_in</option>
          <option value="both">both</option>
        </select>
      </label>
      <label>
        Scene description
        <textarea className="search-input" value={scene} onChange={(e) => setScene(e.target.value)} required />
      </label>
      <label>
        Timecode start
        <input className="search-input" value={timecodeStart} onChange={(e) => setTimecodeStart(e.target.value)} />
      </label>
      <label>
        Timecode end
        <input className="search-input" value={timecodeEnd} onChange={(e) => setTimecodeEnd(e.target.value)} />
      </label>
      <label>
        Doubling for place id (optional)
        <input className="search-input" value={doublingFor} onChange={(e) => setDoublingFor(e.target.value)} />
      </label>
      <label>
        Evidence type
        <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
          {["article", "interview", "commentary", "wiki", "other"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label>
        Evidence citation
        <input className="search-input" value={citation} onChange={(e) => setCitation(e.target.value)} required />
      </label>
      <label className="suggest-toggle">
        <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
        Self-approve (admin/moderator)
      </label>
      <button className="button" type="submit">
        Submit location
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
