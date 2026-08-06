"use client";

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { api, type TmdbSearchHit } from "@/lib/api";
import { useSelectionStore } from "@/stores/selection";

const TMDB_ATTR = {
  href: "https://www.themoviedb.org/",
  text: "This product uses the TMDB API but is not endorsed or certified by TMDB.",
};

export function TmdbAttribution({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`tmdb-attribution${compact ? " compact" : ""}`}>
      <a href={TMDB_ATTR.href} target="_blank" rel="noreferrer">
        TMDB
      </a>
      {compact ? " data" : ` — ${TMDB_ATTR.text}`}
    </p>
  );
}

type Props = {
  /** When true, show auto-approve checkbox (admin/mod pattern). */
  showAutoApprove?: boolean;
  /** Called after a successful import that produced a film. */
  onImported?: (film: { id: string; slug: string; title: string }) => void;
  /** Compact layout for GlobalSearch dropdown. */
  compact?: boolean;
  placeholder?: string;
  /** Minimum query length before searching. */
  minChars?: number;
  /**
   * When set, drives the TMDB query (e.g. GlobalSearch).
   * Hides the local input in compact mode.
   */
  externalQuery?: string;
  /** Default auto-approve for compact import buttons. */
  defaultAutoApprove?: boolean;
};

export function TmdbFilmSearch({
  showAutoApprove = true,
  onImported,
  compact = false,
  placeholder = "Search TMDB for a film…",
  minChars = 2,
  externalQuery,
  defaultAutoApprove = true,
}: Props) {
  const navigate = useNavigate();
  const pane = useSelectionStore((s) => s.pane);
  const setSelection = useSelectionStore((s) => s.setSelection);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [autoApprove, setAutoApprove] = useState(defaultAutoApprove);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const controlled = externalQuery !== undefined;
  const activeQuery = controlled ? externalQuery.trim() : debounced;

  useEffect(() => {
    if (controlled) return;
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, controlled]);

  const search = useQuery({
    queryKey: ["tmdb-search", activeQuery],
    queryFn: () => api.tmdbSearch(activeQuery),
    enabled: activeQuery.length >= minChars,
  });

  async function importHit(hit: TmdbSearchHit) {
    setBusyId(hit.tmdb_id);
    setMessage(null);
    try {
      const result = await api.importFilm(hit.tmdb_id, autoApprove);
      if (result.film) {
        setSelection({
          type: "film",
          id: result.film.id,
          slug: result.film.slug,
          label: result.film.title,
        });
        onImported?.({
          id: result.film.id,
          slug: result.film.slug,
          title: result.film.title,
        });
        const base = pane === "focus" ? "homage" : pane;
        navigate(`/${base}/film/${result.film.slug}`);
        setMessage(`Opened ${result.film.title}`);
      } else {
        setMessage(
          result.status === "pending"
            ? `Queued import suggestion ${result.suggestionId ?? ""}`.trim()
            : `Import status: ${result.status}`
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusyId(null);
    }
  }

  const hits = search.data?.results ?? [];

  return (
    <div className={`tmdb-film-search${compact ? " compact" : ""}`}>
      {!compact ? <h3>Import from TMDB</h3> : null}
      {!controlled || !compact ? (
        <label className="tmdb-search-label">
          {!compact ? "Search" : null}
          <input
            className="search-input"
            value={controlled ? externalQuery : q}
            onChange={(e) => {
              if (!controlled) setQ(e.target.value);
            }}
            readOnly={controlled}
            placeholder={placeholder}
            aria-label="Search TMDB films"
          />
        </label>
      ) : null}
      {showAutoApprove && !compact ? (
        <label className="suggest-toggle">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
          />
          Self-approve (admin/moderator)
        </label>
      ) : null}
      {search.isFetching ? <p className="muted">Searching TMDB…</p> : null}
      {search.isError ? (
        <p className="muted">{(search.error as Error).message}</p>
      ) : null}
      {hits.length ? (
        <ul className="tmdb-results">
          {hits.map((hit) => (
            <li key={hit.tmdb_id} className="tmdb-result-row">
              {hit.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hit.poster_url} alt="" width={40} height={60} className="tmdb-thumb" />
              ) : (
                <span className="tmdb-thumb placeholder" aria-hidden />
              )}
              <div className="tmdb-result-meta">
                <strong>{hit.title}</strong>
                <span className="muted">{hit.release_year ?? "—"}</span>
              </div>
              <button
                type="button"
                className="button"
                disabled={busyId === hit.tmdb_id}
                onClick={() => importHit(hit)}
              >
                {busyId === hit.tmdb_id ? "Importing…" : compact ? "Import" : "Import & open"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!search.isFetching &&
      activeQuery.length >= minChars &&
      hits.length === 0 &&
      !search.isError ? (
        <p className="muted">No TMDB results.</p>
      ) : null}
      {message ? <p className="muted">{message}</p> : null}
      <TmdbAttribution compact={compact} />
    </div>
  );
}
