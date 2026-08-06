import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => [
  { title: "Precept" },
  { name: "description", content: "Community-curated graph of cinematic influence" },
];

export default function Index() {
  return (
    <main className="page spotlight" style={{ padding: "2rem" }}>
      <p className="eyebrow">Precept</p>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}>
        Cloudflare Workers shell
      </h1>
      <p className="muted">
        React Router v7 + Hono scaffold. API health: <code>/api/health</code>
      </p>
    </main>
  );
}
