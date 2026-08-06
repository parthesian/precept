import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { api } from "@/lib/api";
import { ClientOnly } from "@/components/ClientOnly";
import { SuggestConnectionForm } from "@/components/suggest/SuggestConnectionForm";
import { SuggestFilmForm } from "@/components/suggest/SuggestFilmForm";
import { SideList } from "./SideList";

const HomageGraph = lazy(() =>
  import("./HomageGraph").then((m) => ({ default: m.HomageGraph }))
);

export function HomagePane({
  centerType = "film",
  centerSlug = "the-dark-knight",
}: {
  centerType?: "film" | "person" | "collection";
  centerSlug?: string;
}) {
  const filmQuery = useQuery({
    queryKey: ["film", centerSlug],
    queryFn: () => api.getFilm(centerSlug),
    enabled: centerType === "film",
  });

  return (
    <div className="homage-pane">
      <header className="pane-header">
        <h1>{filmQuery.data?.title ?? centerSlug.replace(/-/g, " ")}</h1>
        <p className="muted">
          {centerType === "film" && filmQuery.data
            ? `${filmQuery.data.release_year} · ${filmQuery.data.connection_count} connections`
            : "Influence graph"}
        </p>
      </header>
      <div className="homage-body">
        <ClientOnly fallback={<p className="muted">Loading graph…</p>}>
          <Suspense fallback={<p className="muted">Loading graph…</p>}>
            <HomageGraph centerType={centerType} centerSlug={centerSlug} />
          </Suspense>
        </ClientOnly>
        <div className="homage-sidebar">
          <SideList centerType={centerType} centerSlug={centerSlug} />
          <SuggestConnectionForm defaultSourceFilmId={filmQuery.data?.id} />
          <SuggestFilmForm />
        </div>
      </div>
    </div>
  );
}
