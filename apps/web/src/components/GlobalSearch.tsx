"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TmdbFilmSearch } from "@/components/tmdb/TmdbFilmSearch";
import { api } from "@/lib/api";
import { useSelectionStore } from "@/stores/selection";

/**
 * TMDB fallback appears when the user is logged in and Suggest mode is on,
 * local film hits are empty or &lt; 3, and the query is at least 3 characters.
 */
export function GlobalSearch() {
  const router = useRouter();
  const { query, setQuery, setSelection, pane, suggestMode } = useSelectionStore();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setQuery(local), 200);
    return () => clearTimeout(t);
  }, [local, setQuery]);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
    staleTime: 60_000,
  });

  const search = useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search(query),
    enabled: open && query.trim().length > 0,
  });

  const groups = useMemo(() => search.data ?? {}, [search.data]);
  const filmHits = (groups.film as any[] | undefined) ?? [];
  const loggedIn = Boolean(me.data && me.data.role && me.data.role !== "anon");
  const showTmdbFallback =
    loggedIn &&
    suggestMode &&
    open &&
    query.trim().length >= 3 &&
    !search.isFetching &&
    filmHits.length < 3;

  function choose(item: { id: string; type: string; slug: string; label: string }) {
    setSelection({
      type: item.type as any,
      id: item.id,
      slug: item.slug,
      label: item.label,
    });
    setOpen(false);
    if (item.type === "place") router.push(`/vista/place/${item.slug}`);
    else if (item.type === "precept") router.push(`/focus/${item.slug}`);
    else if (item.type === "person") router.push(`/${pane === "vista" ? "homage" : pane}/person/${item.slug}`);
    else if (item.type === "collection") router.push(`/homage/collection/${item.slug}`);
    else router.push(`/${pane === "focus" ? "homage" : pane}/film/${item.slug}`);
  }

  return (
    <div className="search-wrap">
      <input
        className="search-input"
        placeholder="Search films, people, places, precepts…"
        value={local}
        onChange={(e) => {
          setLocal(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Global search"
      />
      {open && query.trim() ? (
        <div className="search-dropdown" role="listbox">
          {Object.entries(groups).map(([type, rows]) =>
            (rows as any[]).length ? (
              <div key={type} className="search-group">
                <h4>{type}</h4>
                {(rows as any[]).map((row) => (
                  <button
                    key={`${type}-${row.id}`}
                    type="button"
                    className="search-item"
                    onClick={() => choose(row)}
                  >
                    <span>{row.label}</span>
                    <span className="muted">{row.sublabel}</span>
                  </button>
                ))}
              </div>
            ) : null
          )}
          {showTmdbFallback ? (
            <div className="search-group tmdb-fallback">
              <h4>Search TMDB…</h4>
              <TmdbFilmSearch
                compact
                showAutoApprove={false}
                defaultAutoApprove
                minChars={3}
                externalQuery={query.trim()}
                onImported={() => setOpen(false)}
              />
            </div>
          ) : null}
          {!search.isFetching &&
          Object.values(groups).every((r) => !(r as any[]).length) &&
          !showTmdbFallback ? (
            <p className="muted" style={{ padding: "0.75rem" }}>
              No results.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
