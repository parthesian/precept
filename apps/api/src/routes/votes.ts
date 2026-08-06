import { Hono } from "hono";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@precept/db";
import { connections, filmLocations, newId, preceptExamples, suggestions, votes } from "@precept/db";
import { voteSchema } from "@precept/shared";
import { fail, ok } from "../lib/envelope.js";
import { rateLimit } from "../lib/rate-limit.js";
import type { AppEnv } from "../middleware/auth.js";
import { requireUser, unauthorized } from "../middleware/auth.js";

async function recomputeScore(db: Db, targetType: string, targetId: string) {
  const rows = await db
    .select({
      up: sql<number>`coalesce(sum(case when ${votes.value} > 0 then 1 else 0 end),0)`,
      down: sql<number>`coalesce(sum(case when ${votes.value} < 0 then 1 else 0 end),0)`,
    })
    .from(votes)
    .where(and(eq(votes.targetType, targetType), eq(votes.targetId, targetId)));
  const upvotes = Number(rows[0]?.up ?? 0);
  const downvotes = Number(rows[0]?.down ?? 0);
  const communityScore = upvotes - downvotes;

  if (targetType === "connection") {
    await db
      .update(connections)
      .set({ upvotes, downvotes, communityScore })
      .where(eq(connections.id, targetId));
  } else if (targetType === "film_location") {
    await db
      .update(filmLocations)
      .set({ upvotes, downvotes, communityScore })
      .where(eq(filmLocations.id, targetId));
  } else if (targetType === "precept_example") {
    await db
      .update(preceptExamples)
      .set({ upvotes, downvotes, communityScore })
      .where(eq(preceptExamples.id, targetId));
  } else if (targetType === "suggestion") {
    await db.update(suggestions).set({ communityScore }).where(eq(suggestions.id, targetId));
  }

  return { upvotes, downvotes, community_score: communityScore };
}

export function voteRoutes(db: Db) {
  const app = new Hono<AppEnv>();
  const voteLimit = Number(process.env.RATE_LIMIT_VOTES_PER_HOUR ?? "120");

  app.post("/votes", async (c) => {
    const user = requireUser(c);
    if (!user) return unauthorized(c);
    if (!rateLimit(`vote:${user.id}`, voteLimit)) {
      return fail(c, 429, "rate_limited", "Too many votes this hour");
    }
    const parsed = voteSchema.safeParse(await c.req.json());
    if (!parsed.success) return fail(c, 400, "validation_error", parsed.error.message);

    const existing = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.targetType, parsed.data.target_type),
          eq(votes.targetId, parsed.data.target_id),
          eq(votes.userId, user.id)
        )
      );

    if (existing[0]) {
      await db.update(votes).set({ value: parsed.data.value }).where(eq(votes.id, existing[0].id));
    } else {
      await db.insert(votes).values({
        id: newId(),
        targetType: parsed.data.target_type,
        targetId: parsed.data.target_id,
        userId: user.id,
        value: parsed.data.value,
      });
    }

    const score = await recomputeScore(db, parsed.data.target_type, parsed.data.target_id);
    return ok(c, score);
  });

  return app;
}
