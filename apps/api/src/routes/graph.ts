import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Db } from "@precept/db";
import { collections, films, people } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";
import { buildGraph } from "../services/graph.js";

export function graphRoutes(db: Db) {
  const app = new Hono();

  app.get("/graph", async (c) => {
    const centerType = c.req.query("center_type") as "film" | "person" | "collection" | undefined;
    let centerId = c.req.query("center_id") ?? undefined;
    const centerSlug = c.req.query("center_slug");
    const depth = Number(c.req.query("depth") ?? "1");
    const limit = Number(c.req.query("limit") ?? "150");
    const edgeClasses = (c.req.query("edge_classes") ?? "curated")
      .split(",")
      .filter(Boolean) as Array<"curated" | "derived" | "computed">;

    if (!centerType) return fail(c, 400, "bad_request", "center_type is required");

    if (!centerId && centerSlug) {
      if (centerType === "film") {
        const [row] = await db.select().from(films).where(eq(films.slug, centerSlug));
        centerId = row?.id;
      } else if (centerType === "person") {
        const [row] = await db.select().from(people).where(eq(people.slug, centerSlug));
        centerId = row?.id;
      } else {
        const [row] = await db.select().from(collections).where(eq(collections.slug, centerSlug));
        centerId = row?.id;
      }
    }

    if (!centerId) return fail(c, 400, "bad_request", "center_id or center_slug is required");

    const payload = await buildGraph(db, {
      centerType,
      centerId,
      depth,
      limit,
      edgeClasses,
    });
    return ok(c, payload, { center_type: centerType, center_id: centerId, edge_classes: edgeClasses });
  });

  return app;
}
