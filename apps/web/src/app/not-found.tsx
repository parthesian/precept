import { Link } from "react-router";

export default function NotFound() {
  return (
    <main className="page">
      <h1>Not found</h1>
      <p className="muted">That page does not exist.</p>
      <Link to="/">Back to Spotlight</Link>
    </main>
  );
}
