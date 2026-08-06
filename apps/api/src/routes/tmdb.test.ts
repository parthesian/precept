import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { openTestApp } from "../test/with-env.js";
import type { ApiBindings } from "../env.js";

const originalFetch = globalThis.fetch;

describe("TMDB routes (Workers/D1)", () => {
  let request: (path: string, init?: RequestInit) => Promise<Response>;
  let env: ApiBindings;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    const ctx = await openTestApp({ TMDB_API_KEY: "test-key" });
    request = ctx.request;
    env = ctx.env;
    dispose = async () => {
      await ctx.proxy.dispose();
    };
  }, 60_000);

  afterAll(async () => {
    await dispose?.();
  });

  beforeEach(() => {
    env.TMDB_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  async function json(res: Response) {
    return { res, json: await res.json() };
  }

  async function registerSession() {
    const handle = `tmdb_${Date.now().toString(36)}`;
    const res = await request("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `${handle}@example.com`,
        password: "test-password-123",
        handle,
      }),
    });
    const body = await res.json();
    const cookie = res.headers.get("set-cookie") ?? "";
    return { res, body, cookie };
  }

  it("requires auth for GET /api/tmdb/search", async () => {
    const { res, json: body } = await json(await request("/api/tmdb/search?q=inception"));
    expect(res.status).toBe(401);
    expect(body.errors?.[0]?.code).toBe("unauthorized");
  });

  it("returns 503 when TMDB_API_KEY unset for authenticated user", async () => {
    delete env.TMDB_API_KEY;
    const { cookie, res: reg } = await registerSession();
    expect(reg.status).toBe(201);
    const { res, json: body } = await json(
      await request("/api/tmdb/search?q=inception", {
        headers: { cookie },
      })
    );
    expect(res.status).toBe(503);
    expect(body.errors?.[0]?.code).toBe("tmdb_unavailable");
  });

  it("proxies authenticated TMDB search", async () => {
    const { cookie, res: reg } = await registerSession();
    expect(reg.status).toBe(201);

    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            {
              id: 27205,
              title: "Inception",
              release_date: "2010-07-16",
              overview: "Dreams",
              poster_path: "/x.jpg",
              popularity: 99,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    ) as unknown as typeof fetch;

    const { res, json: body } = await json(
      await request("/api/tmdb/search?q=inception", { headers: { cookie } })
    );
    expect(res.status).toBe(200);
    expect(body.data[0].tmdb_id).toBe(27205);
    expect(body.data[0].title).toBe("Inception");
    expect(String(body.data[0].poster_url)).toContain("image.tmdb.org");
  });
});
