import { Hono } from "hono";
import type { ApiBindings } from "./env.js";
import { ok } from "./lib/envelope.js";

export type AppEnv = {
  Bindings: ApiBindings;
  Variables: {
    // Populated in Phase 2 when D1 client is injected per-request.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user?: any;
  };
};

/**
 * Workers-facing Hono app. Phase 0: health only.
 * Phase 2 mounts the full /api/* route surface against D1.
 */
export function createApp() {
  const app = new Hono<AppEnv>();

  app.get("/api/health", (c) =>
    ok(c, {
      ok: true,
      runtime: "workers",
      hasDb: Boolean(c.env?.DB),
      hasKv: Boolean(c.env?.RATE_LIMIT),
      hasQueue: Boolean(c.env?.TMDB_IMPORT_QUEUE),
    })
  );

  return app;
}

export default createApp;
