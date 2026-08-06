"use client";

import { useState } from "react";
import { submitSuggestion } from "@/lib/suggest";
import { useSelectionStore } from "@/stores/selection";

export function SuggestSpotlightForm({ defaultFilmId }: { defaultFilmId?: string }) {
  const suggestMode = useSelectionStore((s) => s.suggestMode);
  const [filmId, setFilmId] = useState(defaultFilmId ?? "");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [featured, setFeatured] = useState("");
  const [slug, setSlug] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  if (!suggestMode) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const result = await submitSuggestion({
      target_type: "spotlight",
      operation: "create",
      auto_approve: autoApprove,
      payload: {
        film_id: filmId,
        headline,
        body_markdown: body,
        slug: slug || undefined,
        featured_connection_ids: featured
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        published_at: new Date().toISOString(),
      },
    });
    setMessage(result.message);
  }

  return (
    <form className="suggest-form" onSubmit={onSubmit}>
      <h3>Publish Spotlight</h3>
      <label>
        Film id
        <input className="search-input" value={filmId} onChange={(e) => setFilmId(e.target.value)} required />
      </label>
      <label>
        Slug (optional)
        <input className="search-input" value={slug} onChange={(e) => setSlug(e.target.value)} />
      </label>
      <label>
        Headline
        <input className="search-input" value={headline} onChange={(e) => setHeadline(e.target.value)} required />
      </label>
      <label>
        Body (markdown)
        <textarea className="search-input" value={body} onChange={(e) => setBody(e.target.value)} required />
      </label>
      <label>
        Featured connection ids (comma-separated)
        <input className="search-input" value={featured} onChange={(e) => setFeatured(e.target.value)} />
      </label>
      <label className="suggest-toggle">
        <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
        Self-approve (admin/moderator)
      </label>
      <button className="button" type="submit">
        Publish
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
