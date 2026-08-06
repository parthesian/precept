import Link from "next/link";

export default function SpotlightLandingPage() {
  return (
    <div className="app-root">
      <header className="top-bar">
        <Link href="/" className="wordmark">
          PRECEPT
        </Link>
        <input className="search-input" placeholder="Search films, people, places, precepts…" disabled />
        <span className="muted">Scaffold — Homage shell lands in Milestone 4</span>
      </header>
      <main className="page">
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>Spotlight</h1>
        <p className="muted">
          Community-curated graph of cinematic influence. Seed data and the three-pane explorer arrive
          in the next milestones.
        </p>
        <p>
          <Link href="/homage">Open Homage →</Link>
        </p>
      </main>
    </div>
  );
}
