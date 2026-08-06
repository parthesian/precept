"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { submitSuggestion } from "@/lib/suggest";
import { useSelectionStore } from "@/stores/selection";

export function SuggestPreceptForm({ filmId }: { filmId?: string }) {
  const suggestMode = useSelectionStore((s) => s.suggestMode);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("shot_type");
  const [shortDefinition, setShortDefinition] = useState("");
  const [description, setDescription] = useState("");
  const [exampleFilmId, setExampleFilmId] = useState(filmId ?? "");
  const [exampleDescription, setExampleDescription] = useState("");
  const [relatedPreceptId, setRelatedPreceptId] = useState("");
  const [relationType, setRelationType] = useState("see_also");
  const [autoApprove, setAutoApprove] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  if (!suggestMode) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const precept = await submitSuggestion({
      target_type: "precept",
      operation: "create",
      auto_approve: autoApprove,
      payload: {
        name,
        category,
        short_definition: shortDefinition,
        description: description || shortDefinition,
        aliases: [],
        popularized_by_film_ids: exampleFilmId ? [exampleFilmId] : [],
      },
    });
    if (!precept.ok) {
      setMessage(precept.message);
      return;
    }

    const preceptId = precept.data?.targetId as string | undefined;
    const notes: string[] = [precept.message];

    if (preceptId && exampleFilmId && exampleDescription) {
      const example = await submitSuggestion({
        target_type: "precept_example",
        operation: "create",
        auto_approve: autoApprove,
        payload: {
          precept_id: preceptId,
          film_id: exampleFilmId,
          description: exampleDescription,
          is_canonical_example: true,
          timecode_start: "00:05:00",
          timecode_end: "00:05:20",
        },
      });
      notes.push(example.message);
    }

    if (preceptId && relatedPreceptId) {
      const relation = await submitSuggestion({
        target_type: "precept_relation",
        operation: "create",
        auto_approve: autoApprove,
        payload: {
          source_precept_id: preceptId,
          target_precept_id: relatedPreceptId,
          relation_type: relationType,
        },
      });
      notes.push(relation.message);
    }

    setMessage(notes.join(" · "));
    qc.invalidateQueries({ queryKey: ["precepts"] });
  }

  return (
    <form className="suggest-form" onSubmit={onSubmit}>
      <h3>Create precept</h3>
      <label>
        Name
        <input className="search-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {[
            "shot_type",
            "camera_movement",
            "lens_optics",
            "lighting",
            "editing",
            "sound_audiovisual",
            "color",
            "staging_blocking",
            "narrative_device",
            "genre_convention",
            "vfx",
          ].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        Short definition
        <input
          className="search-input"
          value={shortDefinition}
          onChange={(e) => setShortDefinition(e.target.value)}
          required
        />
      </label>
      <label>
        Long description
        <textarea className="search-input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        Example film id
        <input
          className="search-input"
          value={exampleFilmId}
          onChange={(e) => setExampleFilmId(e.target.value)}
        />
      </label>
      <label>
        Example description
        <input
          className="search-input"
          value={exampleDescription}
          onChange={(e) => setExampleDescription(e.target.value)}
        />
      </label>
      <label>
        Related precept id (optional)
        <input
          className="search-input"
          value={relatedPreceptId}
          onChange={(e) => setRelatedPreceptId(e.target.value)}
        />
      </label>
      <label>
        Relation type
        <select value={relationType} onChange={(e) => setRelationType(e.target.value)}>
          {["broader", "narrower", "opposite_of", "commonly_paired_with", "see_also"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="suggest-toggle">
        <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
        Self-approve (admin/moderator)
      </label>
      <button className="button" type="submit">
        Submit precept
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
