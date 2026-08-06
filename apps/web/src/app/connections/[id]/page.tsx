import { ConnectionDetail } from "@/components/ConnectionDetail";
import { Link } from "react-router";

export default async function ConnectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="app-root">
      <header className="top-bar">
        <Link to="/homage" className="wordmark">
          PRECEPT
        </Link>
        <Link to="/homage">← Homage</Link>
      </header>
      <ConnectionDetail id={id} />
    </div>
  );
}
