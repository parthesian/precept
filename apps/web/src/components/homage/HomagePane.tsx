"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { SuggestConnectionForm } from "@/components/suggest/SuggestConnectionForm";
import { SuggestFilmForm } from "@/components/suggest/SuggestFilmForm";
import { SideList } from "./SideList";

const HomageGraph = dynamic(() => import("./HomageGraph").then((m) => m.HomageGraph), {
  ssr: false,
  loading: () => <p className="muted">Loading graph…</p>,
});

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
        <HomageGraph centerType={centerType} centerSlug={centerSlug} />
        <div className="homage-sidebar">
          {centerType === "film" ? <SideList filmSlug={centerSlug} /> : null}
          {centerType === "film" && filmQuery.data ? (
            <SuggestConnectionForm sourceFilmId={filmQuery.data.id} />
          ) : null}
          <SuggestFilmForm />
        </div>
      </div>
    </div>
  );
}
