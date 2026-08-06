"use client";

import { useState } from "react";
import { submitSuggestion } from "@/lib/suggest";
import { useSelectionStore } from "@/stores/selection";

export function SuggestConnectionForm({
  sourceFilmId,
  targetFilmId,
}: {
  sourceFilmId: string;
  targetFilmId?: string;
}) {
  const suggestMode = useSelectionStore((s) => s.suggestMode);
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [target, setTarget] = useState(targetFilmId ?? "");
  const [type, setType] = useState("homage");
  const [tier, setTier] = useState("proposed");
  const [evidenceType, setEvidenceType] = useState("article");
  const [citation, setCitation] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [url, setUrl] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  if (!suggestMode) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const evidence = citation
      ? [
          {
            evidence_type: evidenceType,
            citation_text: citation,
            excerpt: excerpt || null,
            url: url || null,
          },
        ]
      : [];
    const result = await submitSuggestion({
      target_type: "connection",
      operation: "create",
      auto_approve: autoApprove,
      payload: {
        source_film_id: sourceFilmId,
        target_film_id: target,
        is_directed: true,
        connection_type: type,
        confidence_tier: tier,
        title,
        rationale,
      },
      evidence,
    });
    setMessage(result.message);
  }

  return (
    <form className="suggest-form" onSubmit={submit}>
      <h3>Propose connection</h3>
      <label>
        Target film id
        <input className="search-input" value={target} onChange={(e) => setTarget(e.target.value)} required />
      </label>
      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {[
            "homage",
            "shot_for_shot_quotation",
            "visual_motif",
            "shared_technique",
            "subversion_parody",
            "narrative_structure",
            "remake_adaptation",
            "audiovisual_parallel",
            "stated_influence",
            "crew_lineage",
            "soundtrack_reference",
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label>
        Confidence
        <select value={tier} onChange={(e) => setTier(e.target.value)}>
          <option value="proposed">proposed</option>
          <option value="highly_likely">highly_likely</option>
          <option value="confirmed">confirmed</option>
        </select>
      </label>
      <label>
        Title
        <input className="search-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Rationale
        <textarea className="search-input" value={rationale} onChange={(e) => setRationale(e.target.value)} required />
      </label>
      <label>
        Evidence type
        <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
          {["interview", "commentary", "book", "article", "video_essay", "wiki", "other"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label>
        Citation
        <input className="search-input" value={citation} onChange={(e) => setCitation(e.target.value)} />
      </label>
      <label>
        Excerpt (≤15 words)
        <input className="search-input" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      </label>
      <label>
        URL
        <input className="search-input" value={url} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <label className="suggest-toggle">
        <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
        Self-approve (admin/moderator)
      </label>
      <button className="button" type="submit">
        Submit
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
