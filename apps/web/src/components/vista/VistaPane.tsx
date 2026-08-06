"use client";

import dynamic from "next/dynamic";

export const VistaPane = dynamic(
  () => import("./VistaPaneClient").then((m) => m.VistaPaneClient),
  {
    ssr: false,
    loading: () => <p className="muted page">Loading map…</p>,
  }
);
