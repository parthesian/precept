import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestApp, type TestApp } from "../test/with-env.js";

describe("read API smoke (Workers/D1)", () => {
  let request: (path: string, init?: RequestInit) => Promise<Response>;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    const ctx = await openTestApp();
    request = ctx.request;
    dispose = async () => {
      await ctx.proxy.dispose();
    };
  }, 60_000);

  afterAll(async () => {
    await dispose?.();
  });

  async function get(path: string) {
    const res = await request(path);
    const json = await res.json();
    return { res, json };
  }

  it("search returns grouped results", async () => {
    const { res, json } = await get("/api/search?q=dark");
    expect(res.status).toBe(200);
    expect(json.data.film.length).toBeGreaterThan(0);
  });

  it("film detail and graph work", async () => {
    const film = await get("/api/films/the-dark-knight");
    expect(film.res.status).toBe(200);
    expect(film.json.data.slug).toBe("the-dark-knight");

    const graph = await get(
      "/api/graph?center_type=film&center_slug=the-dark-knight&edge_classes=curated,derived,computed"
    );
    expect(graph.res.status).toBe(200);
    expect(graph.json.data.nodes.length).toBeGreaterThan(1);
    expect(graph.json.data.edges.some((e: any) => e.edge_class === "curated")).toBe(true);
  });

  it("spotlight, precepts, places respond", async () => {
    expect((await get("/api/spotlight")).res.status).toBe(200);
    expect((await get("/api/precepts")).json.data.length).toBeGreaterThan(10);
    expect((await get("/api/places")).json.data.length).toBeGreaterThan(10);
  });

  it("sets cache headers on GET", async () => {
    const { res } = await get("/api/health");
    expect(res.headers.get("etag")).toBeTruthy();
    expect(res.headers.get("cache-control") ?? "").toContain("stale-while-revalidate");
  });
});
