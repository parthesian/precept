import type { AppEnv } from "../middleware/auth.js";
import { Hono } from "hono";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@precept/db";
import { connections, evidence, films, revisions, users } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";
import {
  connectionDto,
  evidenceDto,
  filmDto,
  revisionDto,
} from "../lib/serialize.js";

export function connectionRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/connections/:id", async (c) => {
    const db = c.get("db");
    const [row] = await db
      .select()
      .from(connections)
      .where(eq(connections.id, c.req.param("id")));
    if (!row) return fail(c, 404, "not_found", "Connection not found");

    const [source] = await db.select().from(films).where(eq(films.id, row.sourceFilmId));
    const [target] = await db.select().from(films).where(eq(films.id, row.targetFilmId));
    const ev = await db
      .select()
      .from(evidence)
      .where(and(eq(evidence.targetType, "connection"), eq(evidence.targetId, row.id)));
    const revs = await db
      .select()
      .from(revisions)
      .where(and(eq(revisions.targetType, "connection"), eq(revisions.targetId, row.id)))
      .orderBy(asc(revisions.revisionNumber));

    const contributorIds = [...new Set([row.createdBy, row.approvedBy].filter(Boolean) as string[])];
    const contributors =
      contributorIds.length === 0
        ? []
        : await db.select().from(users).where(inArray(users.id, contributorIds));

    return ok(c, {
      ...connectionDto(row),
      source_film: source ? filmDto(source) : null,
      target_film: target ? filmDto(target) : null,
      evidence: ev.map(evidenceDto),
      revisions: revs.map(revisionDto),
      contributors: contributors.map((u) => ({
        id: u.id,
        handle: u.handle,
        display_name: u.displayName,
        role: u.role,
      })),
    });
  });

  return app;
}
