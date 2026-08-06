/**
 * Node entry is opt-in during the Workers migration.
 * Prefer `npm run dev` (Vite + Cloudflare plugin) which mounts createApp().
 *
 *   PRECEPT_NODE_SERVER=1 npm run dev -w @precept/api
 */
import { createApp } from "./create-app.js";

export { createApp } from "./create-app.js";
export type { ApiBindings } from "./env.js";

// Keep a constructible app export for tests that import { app }.
export const app = createApp();

if (process.env.PRECEPT_NODE_SERVER === "1" && process.env.NODE_ENV !== "test") {
  console.warn(
    "[precept-api] PRECEPT_NODE_SERVER=1 is deprecated. Use wrangler/Vite Workers path (npm run dev)."
  );
  console.warn(
    "[precept-api] Node+Postgres serve path has been removed; start the Worker instead."
  );
}
