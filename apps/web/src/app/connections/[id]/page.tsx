import { ConnectionDetail } from "@/components/ConnectionDetail";
import Link from "next/link";

export default async function ConnectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="app-root">
      <header className="top-bar">
        <Link href="/homage" className="wordmark">
          PRECEPT
        </Link>
        <Link href="/homage">← Homage</Link>
      </header>
      <ConnectionDetail id={id} />
    </div>
  );
}
