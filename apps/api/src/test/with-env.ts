import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy, type PlatformProxy } from "wrangler";
import { createApp } from "../create-app.js";
import type { ApiBindings } from "../env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

export type TestApp = ReturnType<typeof createApp>;

/** Build a Hono app wired to local D1/KV/Queue bindings for Vitest. */
export async function openTestApp(overrides: Partial<ApiBindings> = {}): Promise<{
  app: TestApp;
  env: ApiBindings;
  proxy: PlatformProxy;
  request: (path: string, init?: RequestInit) => Promise<Response>;
}> {
  const proxy = await getPlatformProxy({
    configPath: path.join(root, "apps/web/wrangler.jsonc"),
    persist: { path: path.join(root, "apps/web/.wrangler/state/v3") },
  });
  const env = {
    ...(proxy.env as unknown as ApiBindings),
    ...overrides,
  };
  const app = createApp();
  return {
    app,
    env,
    proxy,
    request: (urlPath: string, init?: RequestInit) =>
      app.request(`http://localhost${urlPath}`, init, env),
  };
}
