import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Connections } from "./pages/Connections";
import { Director } from "./pages/Director";
import { Explore } from "./pages/Explore";
import { Film } from "./pages/Film";
import { Home } from "./pages/Home";
import { Shot } from "./pages/Shot";
import { api } from "./lib/api";

const pages = ["Home", "Explore", "Film", "Shot", "Connections", "Director"] as const;
type Page = (typeof pages)[number];

export default function App() {
  const [page, setPage] = useState<Page>("Home");
  const [selectedShotId, setSelectedShotId] = useState<string | undefined>(undefined);
  const [isScrolled, setIsScrolled] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  const searchQuery = commandQuery.trim() ? `?q=${encodeURIComponent(commandQuery.trim())}&limit=24` : "?limit=24";
  const quickSearch = useQuery({
    queryKey: ["command-search", searchQuery],
    queryFn: () => api.searchTags(searchQuery),
    enabled: commandOpen,
  });

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 2);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const titleByPage: Record<Page, string> = {
      Home: "Precept",
      Explore: "Explore - Precept",
      Film: "Film - Precept",
      Shot: "Shot Detail - Precept",
      Connections: "Connection Graph - Precept",
      Director: "Director - Precept",
    };
    document.title = titleByPage[page];
  }, [page]);

  const quickResults = quickSearch.data?.data ?? [];
  const grouped = useMemo(() => {
    const films = new Map<string, { title: string; year: number; director: string }>();
    const directors = new Set<string>();
    for (const row of quickResults) {
      films.set(row.film_id, { title: row.film_title, year: row.film_year, director: row.film_director });
      directors.add(row.film_director);
    }
    return {
      shots: quickResults.slice(0, 8),
      films: Array.from(films.values()).slice(0, 6),
      directors: Array.from(directors).slice(0, 6),
    };
  }, [quickResults]);

  const navPages: Array<{ id: Page; label: string }> = [
    { id: "Explore", label: "Explore" },
    { id: "Film", label: "Films" },
    { id: "Director", label: "Directors" },
    { id: "Connections", label: "Graph" },
  ];

  return (
    <div className="app-shell">
      <nav className={`top-nav ${isScrolled ? "scrolled" : ""}`}>
        <button type="button" className="wordmark" onClick={() => setPage("Home")} aria-label="Go to home">
          PRECEPT
        </button>
        <div className="nav-links">
          {navPages.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-link ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className="nav-search" onClick={() => setCommandOpen(true)} aria-label="Open search">
          ⌕
        </button>
      </nav>

      <main className="page-shell">
        {page === "Home" && <Home onExplore={() => setPage("Explore")} />}
        {page === "Explore" && (
          <Explore
            onOpenShot={(shotId) => {
              setSelectedShotId(shotId);
              setPage("Shot");
            }}
          />
        )}
        {page === "Film" && <Film />}
        {page === "Shot" && <Shot selectedShotId={selectedShotId} onShotChange={setSelectedShotId} />}
        {page === "Connections" && <Connections />}
        {page === "Director" && <Director />}
      </main>

      {commandOpen ? (
        <div className="command-modal-backdrop" onClick={() => setCommandOpen(false)} role="presentation">
          <section className="command-modal" onClick={(event) => event.stopPropagation()}>
            <input
              autoFocus
              className="command-input"
              placeholder="Search shots, films, directors..."
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
            />
            <div className="command-group">
              <h4>Shots</h4>
              {grouped.shots.length === 0 ? <p className="muted">No shot results.</p> : null}
              {grouped.shots.map((item) => (
                <div key={item.id} className="command-item">
                  <span>
                    <span className="film-title-inline">{item.film_title}</span> <span className="film-year">({item.film_year})</span>
                  </span>
                  <span className="meta-mono">{item.shot_scale}</span>
                </div>
              ))}
            </div>
            <div className="command-group">
              <h4>Films</h4>
              {grouped.films.map((item) => (
                <div key={`${item.title}-${item.year}`} className="command-item">
                  <span>
                    <span className="film-title-inline">{item.title}</span> <span className="film-year">({item.year})</span>
                  </span>
                  <span className="meta-line">{item.director}</span>
                </div>
              ))}
            </div>
            <div className="command-group">
              <h4>Directors</h4>
              {grouped.directors.map((item) => (
                <div key={item} className="command-item">
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
