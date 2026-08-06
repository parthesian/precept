import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPlatformProxy, type PlatformProxy } from "wrangler";
import { createDb, type Db } from "./client.js";
import { films } from "./schema/index.js";
import { eq } from "drizzle-orm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("FTS5 search (D1)", () => {
  let proxy: PlatformProxy;
  let db: Db;

  beforeAll(async () => {
    proxy = await getPlatformProxy({
      configPath: path.join(root, "apps/web/wrangler.jsonc"),
      persist: { path: path.join(root, "apps/web/.wrangler/state/v3") },
    });
    db = createDb(proxy.env.DB as D1Database);
  }, 60_000);

  afterAll(async () => {
    await proxy?.dispose();
  });

  it("films_fts matches seeded Dark Knight title", async () => {
    const d1 = proxy.env.DB as D1Database;
    const hits = await d1
      .prepare(`SELECT film_id as id FROM films_fts WHERE films_fts MATCH ? LIMIT 5`)
      .bind("dark")
      .all<{ id: string }>();
    const ids = (hits.results ?? []).map((r) => r.id);
    expect(ids).toContain("film_the_dark_knight");

    const [row] = await db.select().from(films).where(eq(films.id, "film_the_dark_knight"));
    expect(row?.title).toBe("The Dark Knight");
  });

  it("people_fts and precepts_fts tables respond", async () => {
    const d1 = proxy.env.DB as D1Database;
    const people = await d1
      .prepare(`SELECT count(*) as n FROM people_fts`)
      .first<{ n: number }>();
    const precepts = await d1
      .prepare(`SELECT count(*) as n FROM precepts_fts`)
      .first<{ n: number }>();
    expect(Number(people?.n ?? 0)).toBeGreaterThan(0);
    expect(Number(precepts?.n ?? 0)).toBeGreaterThan(0);
  });
});
