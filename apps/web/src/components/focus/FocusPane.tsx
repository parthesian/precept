"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SuggestPreceptForm } from "@/components/suggest/SuggestPreceptForm";
import { api } from "@/lib/api";
import { useSelectionStore } from "@/stores/selection";

export function FocusPane({
  preceptSlug,
  filmSlug,
}: {
  preceptSlug?: string;
  filmSlug?: string;
}) {
  const { filters, setFilters, setSelection } = useSelectionStore();
  const [q, setQ] = useState("");

  const list = useQuery({
    queryKey: ["precepts", filters.preceptCategory],
    queryFn: () =>
      api.getPrecepts(
        filters.preceptCategory ? `?category=${filters.preceptCategory}` : ""
      ),
  });

  const detail = useQuery({
    queryKey: ["precept", preceptSlug],
    queryFn: () => api.getPrecept(preceptSlug!),
    enabled: Boolean(preceptSlug),
  });

  const filmQuery = useQuery({
    queryKey: ["film", filmSlug],
    queryFn: () => api.getFilm(filmSlug!),
    enabled: Boolean(filmSlug),
  });

  const filmPrecepts = useQuery({
    queryKey: ["film-precepts", filmSlug],
    queryFn: () => api.getFilmPrecepts(filmSlug!),
    enabled: Boolean(filmSlug) && !preceptSlug,
  });

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    if (!q.trim()) return rows;
    const lower = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        (r.aliases ?? []).some((a: string) => String(a).toLowerCase().includes(lower))
    );
  }, [list.data, q]);

  if (preceptSlug && detail.data) {
    const p = detail.data;
    const disputed = Boolean(p.origin_claim?.is_disputed);
    return (
      <div className="focus-pane">
        <header className="pane-header">
          <p className="eyebrow">{p.category.replace(/_/g, " ")}</p>
          <h1>{p.name}</h1>
          <p>{p.short_definition}</p>
        </header>
        <div className="focus-body">
          <article>
            <p>{p.description}</p>
            <h2>
              Origin claim {disputed ? <span className="badge danger">disputed</span> : null}
            </h2>
            <pre className="anchor">{JSON.stringify(p.origin_claim, null, 2)}</pre>

            <h2>Chronological spine</h2>
            <ol className="spine">
              {(p.examples ?? []).map((ex: any) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelection({
                        type: "film",
                        id: ex.film.id,
                        slug: ex.film.slug,
                        label: ex.film.title,
                      });
                    }}
                  >
                    <Link href={`/homage/film/${ex.film.slug}`}>
                      {ex.film.release_year} — {ex.film.title}
                    </Link>
                  </button>
                  <p className="muted">
                    {ex.description}
                    {ex.is_canonical_example ? " · canonical" : ""}
                  </p>
                </li>
              ))}
            </ol>

            <h2>Related precepts</h2>
            <ul>
              {(p.relations ?? []).map((r: any) => (
                <li key={r.id}>
                  {r.relation_type.replace(/_/g, " ")} → {r.source_precept_id} / {r.target_precept_id}
                </li>
              ))}
            </ul>
            <SuggestPreceptForm filmId={filmQuery.data?.id} />
          </article>
        </div>
      </div>
    );
  }

  const browseRows = filmSlug ? filmPrecepts.data ?? [] : filtered;

  return (
    <div className="focus-pane">
      <header className="pane-header">
        <h1>Focus</h1>
        <p className="muted">
          {filmSlug
            ? `Precepts exemplified by ${filmSlug.replace(/-/g, " ")}`
            : "Dictionary of cinematic language"}
        </p>
      </header>
      <div className="focus-controls">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter names & aliases"
          aria-label="Filter precepts"
        />
        <select
          value={filters.preceptCategory ?? ""}
          onChange={(e) => setFilters({ preceptCategory: e.target.value || null })}
        >
          <option value="">All categories</option>
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
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <ul className="precept-index">
        {browseRows.map((p: any) => (
          <li key={p.id}>
            <Link
              href={`/focus/${p.slug}`}
              onClick={() =>
                setSelection({ type: "precept", id: p.id, slug: p.slug, label: p.name })
              }
            >
              <strong>{p.name}</strong>
              <span className="muted">{p.short_definition ?? p.example?.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!list.isLoading && browseRows.length === 0 ? (
        <p className="empty-invite">No precepts match. Suggest one when Suggest mode is on.</p>
      ) : null}
      <SuggestPreceptForm filmId={filmQuery.data?.id} />
    </div>
  );
}
