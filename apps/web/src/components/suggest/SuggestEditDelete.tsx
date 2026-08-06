"use client";

import { useState } from "react";
import { submitSuggestion } from "@/lib/suggest";
import { useSelectionStore } from "@/stores/selection";

export function SuggestEditDelete({
  targetType,
  targetId,
  editFields,
}: {
  targetType: string;
  targetId: string;
  /** Initial field values shown for edit */
  editFields?: Record<string, string>;
}) {
  const suggestMode = useSelectionStore((s) => s.suggestMode);
  const [fields, setFields] = useState(editFields ?? {});
  const [autoApprove, setAutoApprove] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  if (!suggestMode) return null;

  async function submitUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const result = await submitSuggestion({
      target_type: targetType,
      target_id: targetId,
      operation: "update",
      auto_approve: autoApprove,
      payload: fields,
    });
    setMessage(result.message);
  }

  async function submitDelete() {
    setMessage(null);
    const result = await submitSuggestion({
      target_type: targetType,
      target_id: targetId,
      operation: "delete",
      auto_approve: autoApprove,
      payload: {},
    });
    setMessage(result.message);
  }

  return (
    <div className="suggest-form">
      <h3>Edit / delete</h3>
      <form onSubmit={submitUpdate} style={{ display: "grid", gap: "0.5rem" }}>
        {Object.keys(fields).map((key) => (
          <label key={key}>
            {key}
            <input
              className="search-input"
              value={fields[key] ?? ""}
              onChange={(e) => setFields({ ...fields, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="suggest-toggle">
          <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
          Self-approve
        </label>
        <button className="button" type="submit">
          Submit update
        </button>
      </form>
      <button className="button ghost" type="button" onClick={submitDelete}>
        Submit delete
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
