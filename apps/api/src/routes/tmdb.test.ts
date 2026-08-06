import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../index.js";

const originalFetch = globalThis.fetch;
const originalKey = process.env.TMDB_API_KEY;

async function json(res: Response) {
  return { res, json: await res.json() };
}

async function registerSession() {
  const handle = `tmdb_${Date.now().toString(36)}`;
  const res = await app.request("http://localhost/api/auth/register", {
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

describe("TMDB routes", () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("requires auth for GET /api/tmdb/search", async () => {
    const { res, json: body } = await json(
      await app.request("http://localhost/api/tmdb/search?q=inception")
    );
    expect(res.status).toBe(401);
    expect(body.errors?.[0]?.code).toBe("unauthorized");
  });

  it("returns 503 when TMDB_API_KEY unset for authenticated user", async () => {
    delete process.env.TMDB_API_KEY;
    const { cookie, res: reg } = await registerSession();
    expect(reg.status).toBe(201);
    const { res, json: body } = await json(
      await app.request("http://localhost/api/tmdb/search?q=x", {
        headers: { cookie },
      })
    );
    expect(res.status).toBe(503);
    expect(body.errors?.[0]?.code).toBe("tmdb_unavailable");
  });

  it("proxies TMDB search without writing to DB", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.themoviedb.org") && url.includes("/search/movie")) {
        return new Response(
          JSON.stringify({
            page: 1,
            total_pages: 1,
            total_results: 1,
            results: [
              {
                id: 999001,
                title: "Obscure Test Film",
                release_date: "1999-01-01",
                overview: "A mock result",
                poster_path: "/poster.jpg",
                popularity: 1.2,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      return originalFetch(input as any);
    }) as typeof fetch;

    const { cookie } = await registerSession();
    const { res, json: body } = await json(
      await app.request("http://localhost/api/tmdb/search?q=obscure", {
        headers: { cookie },
      })
    );
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      tmdb_id: 999001,
      title: "Obscure Test Film",
      release_year: 1999,
    });
    expect(body.data[0].poster_url).toContain("image.tmdb.org");
    expect(body.meta.page).toBe(1);
    expect(body.meta.total_pages).toBe(1);
  });

  it("POST /api/films/import requires auth", async () => {
    const { res, json: body } = await json(
      await app.request("http://localhost/api/films/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tmdb_id: 155 }),
      })
    );
    expect(res.status).toBe(401);
    expect(body.errors?.[0]?.code).toBe("unauthorized");
  });

  it("POST /api/films/import validates tmdb_id", async () => {
    const { cookie } = await registerSession();
    const { res, json: body } = await json(
      await app.request("http://localhost/api/films/import", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ tmdb_id: "nope" }),
      })
    );
    expect(res.status).toBe(400);
    expect(body.errors?.[0]?.code).toBe("validation_error");
  });

  it("POST /api/films/import queues suggestion for regular users", async () => {
    const { cookie } = await registerSession();
    const { res, json: body } = await json(
      await app.request("http://localhost/api/films/import", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ tmdb_id: 888001 }),
      })
    );
    expect(res.status).toBe(201);
    expect(body.data.status).toBe("pending");
    expect(body.data.suggestionId).toBeTruthy();
    expect(body.data.film).toBeNull();
  });
});
