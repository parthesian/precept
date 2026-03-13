import { useState } from "react";
import { Connections } from "./pages/Connections";
import { Director } from "./pages/Director";
import { Explore } from "./pages/Explore";
import { Film } from "./pages/Film";
import { Home } from "./pages/Home";
import { Shot } from "./pages/Shot";

const pages = ["Home", "Explore", "Film", "Shot", "Connections", "Director"] as const;
type Page = (typeof pages)[number];

export default function App() {
  const [page, setPage] = useState<Page>("Explore");

  return (
    <div className="container" style={{ padding: "1.5rem 0 2rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>CineGraph</h1>
        <p style={{ margin: "0.35rem 0 0", color: "#9ca3af" }}>
          Cinematic visual genealogy platform (starter UI scaffold)
        </p>
      </header>

      <nav style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{
              border: "1px solid #2d3748",
              background: page === p ? "#1f2937" : "#111319",
              color: "#e5e7eb",
              borderRadius: 8,
              padding: "0.45rem 0.7rem",
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
      </nav>

      {page === "Home" && <Home />}
      {page === "Explore" && <Explore />}
      {page === "Film" && <Film />}
      {page === "Shot" && <Shot />}
      {page === "Connections" && <Connections />}
      {page === "Director" && <Director />}
    </div>
  );
}
