import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1>Not found</h1>
      <p className="muted">That page does not exist.</p>
      <Link href="/">Back to Spotlight</Link>
    </main>
  );
}
