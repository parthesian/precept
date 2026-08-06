import { lazy, Suspense } from "react";
import { ClientOnly } from "@/components/ClientOnly";

const VistaPaneClient = lazy(() =>
  import("./VistaPaneClient").then((m) => ({ default: m.VistaPaneClient }))
);

export function VistaPane(props: { filmSlug?: string; placeSlug?: string }) {
  return (
    <ClientOnly fallback={<p className="muted page">Loading map…</p>}>
      <Suspense fallback={<p className="muted page">Loading map…</p>}>
        <VistaPaneClient {...props} />
      </Suspense>
    </ClientOnly>
  );
}
