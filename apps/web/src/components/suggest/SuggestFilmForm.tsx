"use client";

import { useState } from "react";
import { submitSuggestion } from "@/lib/suggest";
import { useSelectionStore } from "@/stores/selection";

export function SuggestFilmForm() {
  const suggestMode = useSelectionStore((s) => s.suggestMode);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("2000");
  const [runtime, setRuntime] = useState("120");
  const [synopsis, setSynopsis] = useState("");
  const [genres, setGenres] = useState("Drama");
  const [autoApprove, setAutoApprove] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  if (!suggestMode) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const result = await submitSuggestion({
      target_type: "film",
      operation: "create",
      auto_approve: autoApprove,
      payload: {
        title,
        release_year: Number(year),
        runtime_minutes: Number(runtime) || null,
        synopsis: synopsis || null,
        genres: genres.split(",").map((g) => g.trim()).filter(Boolean),
        country: [],
        popularity_score: 1,
      },
    });
    setMessage(result.message);
    if (result.ok) {
      setTitle("");
      setSynopsis("");
    }
  }

  return (
    <form className="suggest-form" onSubmit={onSubmit}>
      <h3>Add film by hand</h3>
      <label>
        Title
        <input className="search-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Year
        <input className="search-input" value={year} onChange={(e) => setYear(e.target.value)} required />
      </label>
      <label>
        Runtime (minutes)
        <input className="search-input" value={runtime} onChange={(e) => setRuntime(e.target.value)} />
      </label>
      <label>
        Genres (comma-separated)
        <input className="search-input" value={genres} onChange={(e) => setGenres(e.target.value)} />
      </label>
      <label>
        Synopsis
        <textarea className="search-input" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
      </label>
      <label className="suggest-toggle">
        <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
        Self-approve (admin/moderator)
      </label>
      <button className="button" type="submit">
        Submit film
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
