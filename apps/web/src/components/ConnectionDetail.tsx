"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { SuggestEditDelete } from "@/components/suggest/SuggestEditDelete";
import { api } from "@/lib/api";
import { useSelectionStore } from "@/stores/selection";

export function ConnectionDetail({ id }: { id: string }) {
  const suggestMode = useSelectionStore((s) => s.suggestMode);
  const query = useQuery({
    queryKey: ["connection", id],
    queryFn: () => api.getConnection(id),
  });

  if (query.isLoading) return <p className="muted page">Loading connection…</p>;
  if (query.error || !query.data) {
    return (
      <p className="error page">
        Connection not found. <Link to="/homage">Back to Homage</Link>
      </p>
    );
  }

  const c = query.data;
  if (c.confidence_tier === "ai_suggested" && !suggestMode) {
    return (
      <main className="page">
        <p className="muted">AI-suggested connections are hidden while Suggest mode is off.</p>
        <Link to="/homage">Back to Homage</Link>
      </main>
    );
  }

  return (
    <main className="page connection-detail">
      <p className="eyebrow">
        {c.connection_type.replace(/_/g, " ")} · {c.confidence_tier.replace(/_/g, " ")}
        {c.confidence_tier === "ai_suggested" ? " · AI" : ""}
      </p>
      <h1>{c.title}</h1>
      <p>{c.rationale}</p>

      <div className="detail-grid">
        <section>
          <h2>Source</h2>
          {c.source_film ? (
            <Link to={`/homage/film/${c.source_film.slug}`}>{c.source_film.title}</Link>
          ) : null}
          <pre className="anchor">{JSON.stringify(c.source_anchor, null, 2)}</pre>
        </section>
        <section>
          <h2>Target</h2>
          {c.target_film ? (
            <Link to={`/homage/film/${c.target_film.slug}`}>{c.target_film.title}</Link>
          ) : null}
          <pre className="anchor">{JSON.stringify(c.target_anchor, null, 2)}</pre>
        </section>
      </div>

      <section>
        <h2>Evidence</h2>
        <ul>
          {(c.evidence ?? []).map((e: any) => (
            <li key={e.id}>
              <strong>{e.evidence_type}</strong> — {e.citation_text}
              {e.url ? (
                <>
                  {" "}
                  <a href={e.url} target="_blank" rel="noreferrer">
                    link
                  </a>
                </>
              ) : null}
              {e.excerpt ? <em> “{e.excerpt}”</em> : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Provenance</h2>
        <ul>
          {(c.contributors ?? []).map((u: any) => (
            <li key={u.id}>
              {u.display_name} (@{u.handle}) · {u.role}
            </li>
          ))}
        </ul>
        <p className="muted">
          Approved {c.approved_at ? new Date(c.approved_at).toLocaleString() : "—"}
        </p>
        <h3>Revisions</h3>
        <ol>
          {(c.revisions ?? []).map((r: any) => (
            <li key={r.id}>
              #{r.revision_number} · {new Date(r.created_at).toLocaleString()}
            </li>
          ))}
        </ol>
      </section>

      <SuggestEditDelete
        targetType="connection"
        targetId={c.id}
        editFields={{ title: c.title, rationale: c.rationale }}
      />
    </main>
  );
}
