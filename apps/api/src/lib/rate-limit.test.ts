import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy, type PlatformProxy } from "wrangler";
import { rateLimit } from "./rate-limit.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("KV rate limits", () => {
  let proxy: PlatformProxy;
  let kv: KVNamespace;

  beforeAll(async () => {
    proxy = await getPlatformProxy({
      configPath: path.join(root, "apps/web/wrangler.jsonc"),
      persist: { path: path.join(root, "apps/web/.wrangler/state/v3") },
    });
    kv = proxy.env.RATE_LIMIT as KVNamespace;
  }, 60_000);

  afterAll(async () => {
    await proxy?.dispose();
  });

  it("allows up to limit then rejects within the hour bucket", async () => {
    const key = `test-rl-${Date.now()}`;
    expect(await rateLimit(kv, key, 2)).toBe(true);
    expect(await rateLimit(kv, key, 2)).toBe(true);
    expect(await rateLimit(kv, key, 2)).toBe(false);
  });

  it("isolates counters per key", async () => {
    const a = `test-rl-a-${Date.now()}`;
    const b = `test-rl-b-${Date.now()}`;
    expect(await rateLimit(kv, a, 1)).toBe(true);
    expect(await rateLimit(kv, a, 1)).toBe(false);
    expect(await rateLimit(kv, b, 1)).toBe(true);
  });
});
