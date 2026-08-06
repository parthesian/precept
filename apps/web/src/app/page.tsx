import { Link } from "react-router";
import { SpotlightTools } from "@/components/spotlight/SpotlightTools";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SpotlightLandingPage() {
  let spotlight: any = null;
  try {
    spotlight = await api.getSpotlight();
  } catch {
    spotlight = null;
  }

  const filmSlug = spotlight?.film?.slug ?? "the-dark-knight";
  const featuredId = spotlight?.featured_connection_ids?.[0];

  return (
    <div className="app-root">
      <header className="top-bar">
        <Link to="/" className="wordmark">
          PRECEPT
        </Link>
        <nav className="pane-tabs">
          <Link to="/vista">Vista</Link>
          <Link to={`/homage/film/${filmSlug}`}>Homage</Link>
          <Link to="/focus">Focus</Link>
        </nav>
        <Link to="/login">Login</Link>
        <Link to="/moderate">Moderate</Link>
      </header>
      <main className="page spotlight">
        <p className="eyebrow">Spotlight</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>
          {spotlight?.headline ?? "Community graph of cinematic influence"}
        </h1>
        {spotlight?.film ? (
          <p className="muted">
            Featuring{" "}
            <Link to={`/homage/film/${spotlight.film.slug}`}>{spotlight.film.title}</Link> (
            {spotlight.film.release_year})
          </p>
        ) : null}
        <article className="spotlight-body">
          <pre className="markdown-fallback">{spotlight?.body_markdown ?? "Seed a spotlight to begin."}</pre>
        </article>
        <div className="spotlight-cta">
          <Link className="button" to={`/homage/film/${filmSlug}`}>
            Open in Homage
          </Link>
          <Link className="button ghost" to={`/vista/film/${filmSlug}`}>
            See locations
          </Link>
          <Link className="button ghost" to={`/focus/film/${filmSlug}`}>
            Browse precepts
          </Link>
          {featuredId ? (
            <Link className="button" to={`/connections/${featuredId}`}>
              Jump to a confirmed connection
            </Link>
          ) : null}
        </div>
        <SpotlightTools filmId={spotlight?.film?.id} />
      </main>
    </div>
  );
}
