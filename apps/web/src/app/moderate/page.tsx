"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

async function modFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.errors?.[0]?.message ?? "Request failed");
  return json.data as T;
}

export default function ModeratePage() {
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const queue = useQuery({
    queryKey: ["mod-queue"],
    queryFn: () => modFetch<any[]>("/api/suggestions?status=pending&sort=score"),
  });

  const rows = queue.data ?? [];
  const current = rows[index];

  const approve = useMutation({
    mutationFn: (id: string) =>
      modFetch(`/api/suggestions/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ review_note: "approved from queue" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mod-queue"] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) =>
      modFetch(`/api/suggestions/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: "low_quality", review_note: "rejected from queue" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mod-queue"] }),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "j") setIndex((i) => Math.min(rows.length - 1, i + 1));
      if (e.key === "k") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "a" && current) approve.mutate(current.id);
      if (e.key === "r" && current) reject.mutate(current.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="app-root">
      <header className="top-bar">
        <Link href="/" className="wordmark">
          PRECEPT
        </Link>
        <span className="muted">Moderation · j/k navigate · a approve · r reject</span>
        <Link href="/login">Login</Link>
      </header>
      <main className="page" style={{ display: "grid", gridTemplateColumns: "18rem 1fr", gap: "1rem" }}>
        <aside>
          <h2>Queue ({rows.length})</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {rows.map((row, i) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={i === index ? "side-list-row active" : "side-list-row"}
                  style={{ position: "relative", width: "100%", height: "auto", padding: "0.5rem" }}
                  onClick={() => setIndex(i)}
                >
                  <span className="row-title">
                    {row.source === "ai" ? "AI · " : ""}
                    {row.target_type} / {row.operation}
                  </span>
                  <span className="row-meta">score {row.community_score}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section>
          {!current ? (
            <p className="empty-invite">Queue empty. Nice work.</p>
          ) : (
            <>
              <h1>
                {current.target_type} · {current.operation}
                {current.source === "ai" ? <span className="badge">AI</span> : null}
              </h1>
              <p className="muted">Submitter {current.submitted_by}</p>
              <pre className="anchor">{JSON.stringify(current.payload, null, 2)}</pre>
              <div style={{ marginTop: "1rem" }}>
                <button type="button" className="button" onClick={() => approve.mutate(current.id)}>
                  Approve
                </button>
                <button type="button" className="button ghost" onClick={() => reject.mutate(current.id)}>
                  Reject
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
