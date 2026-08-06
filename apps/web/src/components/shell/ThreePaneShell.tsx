"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useSelectionStore } from "@/stores/selection";
import type { Pane } from "@precept/shared";

const PANES: Pane[] = ["vista", "homage", "focus"];

function paneFromPath(pathname: string): Pane {
  if (pathname.startsWith("/vista")) return "vista";
  if (pathname.startsWith("/focus")) return "focus";
  return "homage";
}

function pathForPane(pane: Pane, selection: { type: string; slug: string } | null): string {
  if (!selection) return `/${pane}`;
  if (pane === "vista") {
    if (selection.type === "place") return `/vista/place/${selection.slug}`;
    if (selection.type === "film") return `/vista/film/${selection.slug}`;
    return `/vista`;
  }
  if (pane === "focus") {
    if (selection.type === "precept") return `/focus/${selection.slug}`;
    if (selection.type === "film") return `/focus/film/${selection.slug}`;
    return `/focus`;
  }
  if (selection.type === "person") return `/homage/person/${selection.slug}`;
  if (selection.type === "collection") return `/homage/collection/${selection.slug}`;
  if (selection.type === "film") return `/homage/film/${selection.slug}`;
  return `/homage`;
}

export function ThreePaneShell({
  vista,
  homage,
  focus,
}: {
  vista: React.ReactNode;
  homage: React.ReactNode;
  focus: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { selection, setPane, suggestMode, setSuggestMode, pane } = useSelectionStore();
  const active = useMemo(() => paneFromPath(pathname), [pathname]);
  const [mobileIndex, setMobileIndex] = useState(() => PANES.indexOf(active));
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setPane(active);
    setMobileIndex(PANES.indexOf(active));
  }, [active, setPane]);

  function go(paneName: Pane) {
    router.push(pathForPane(paneName, selection));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "[") {
        const idx = Math.max(0, PANES.indexOf(active) - 1);
        go(PANES[idx]);
      }
      if (e.key === "]") {
        const idx = Math.min(PANES.length - 1, PANES.indexOf(active) + 1);
        go(PANES[idx]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const offset = -PANES.indexOf(active) * 100;

  return (
    <div className="app-root shell">
      <header className="top-bar">
        <Link href="/" className="wordmark">
          PRECEPT
        </Link>
        <GlobalSearch />
        <label className="suggest-toggle">
          <input
            type="checkbox"
            checked={suggestMode}
            onChange={(e) => setSuggestMode(e.target.checked)}
          />
          Suggest
        </label>
        <nav className="pane-tabs" aria-label="Panes">
          {PANES.map((p) => (
            <button
              key={p}
              type="button"
              className={p === active ? "active" : ""}
              onClick={() => go(p)}
            >
              {p}
            </button>
          ))}
        </nav>
      </header>

      <div className="shell-body">
        <button
          type="button"
          className="chevron left desktop-only"
          aria-label="Previous pane"
          onClick={() => go(PANES[Math.max(0, PANES.indexOf(active) - 1)])}
        >
          ‹
        </button>

        <div
          className="pane-viewport"
          onTouchStart={(e) => {
            touchStartX.current = e.changedTouches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current == null) return;
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            if (Math.abs(dx) < 50) return;
            const idx = PANES.indexOf(active);
            if (dx < 0) go(PANES[Math.min(PANES.length - 1, idx + 1)]);
            else go(PANES[Math.max(0, idx - 1)]);
            touchStartX.current = null;
          }}
        >
          <div className="pane-track" style={{ transform: `translate3d(${offset}%, 0, 0)` }}>
            <section className={`pane ${active === "vista" ? "active" : "neighbor"}`} data-pane="vista">
              {active === "vista" || Math.abs(PANES.indexOf(active) - 0) <= 1 ? vista : <PanePlaceholder name="Vista" />}
            </section>
            <section className={`pane ${active === "homage" ? "active" : "neighbor"}`} data-pane="homage">
              {active === "homage" || Math.abs(PANES.indexOf(active) - 1) <= 1 ? homage : <PanePlaceholder name="Homage" />}
            </section>
            <section className={`pane ${active === "focus" ? "active" : "neighbor"}`} data-pane="focus">
              {active === "focus" || Math.abs(PANES.indexOf(active) - 2) <= 1 ? focus : <PanePlaceholder name="Focus" />}
            </section>
          </div>
        </div>

        <button
          type="button"
          className="chevron right desktop-only"
          aria-label="Next pane"
          onClick={() => go(PANES[Math.min(PANES.length - 1, PANES.indexOf(active) + 1)])}
        >
          ›
        </button>
      </div>

      <div className="mobile-dots" aria-hidden>
        {PANES.map((p, i) => (
          <span key={p} className={i === mobileIndex ? "on" : ""} />
        ))}
      </div>
    </div>
  );
}

function PanePlaceholder({ name }: { name: string }) {
  return <div className="pane-placeholder muted">{name}</div>;
}
