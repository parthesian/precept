import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy, type PlatformProxy } from "wrangler";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Shared local D1 proxy settings — must match `wrangler d1 … --local` persist layout. */
export async function openLocalD1(): Promise<PlatformProxy> {
  return getPlatformProxy({
    configPath: path.join(root, "apps/web/wrangler.jsonc"),
    persist: { path: path.join(root, "apps/web/.wrangler/state/v3") },
  });
}

export function workspaceRoot() {
  return root;
}
