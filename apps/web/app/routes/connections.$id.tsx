import { Link, useParams } from "react-router";
import { ConnectionDetail } from "../../src/components/ConnectionDetail";

export default function ConnectionPage() {
  const { id = "" } = useParams();
  return (
    <div className="app-root">
      <header className="top-bar">
        <Link to="/homage" className="wordmark">
          PRECEPT
        </Link>
        <Link to="/homage">← Homage</Link>
      </header>
      <main className="page">
        <ConnectionDetail id={id} />
      </main>
    </div>
  );
}
