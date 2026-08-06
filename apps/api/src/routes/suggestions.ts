import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import {
  approveSuggestion,
  createSuggestion,
  rejectSuggestion,
  suggestions,
  withdrawSuggestion,
  type Db,
} from "@precept/db";
import { approveSuggestionSchema, rejectSuggestionSchema, suggestionCreateSchema } from "@precept/shared";
import { fail, ok } from "../lib/envelope.js";
import { rateLimit } from "../lib/rate-limit.js";
import type { AppEnv } from "../middleware/auth.js";
import { forbidden, requireRole, requireUser, unauthorized } from "../middleware/auth.js";

export function suggestionRoutes(db: Db) {
  const app = new Hono<AppEnv>();
  const suggestionLimit = Number(process.env.RATE_LIMIT_SUGGESTIONS_PER_HOUR ?? "60");

  app.post("/suggestions", async (c) => {
    const user = requireUser(c);
    if (!user) return unauthorized(c);
    if (!rateLimit(`suggest:${user.id}`, suggestionLimit)) {
      return fail(c, 429, "rate_limited", "Too many suggestions this hour");
    }
    const parsed = suggestionCreateSchema.safeParse(await c.req.json());
    if (!parsed.success) return fail(c, 400, "validation_error", parsed.error.message);

    // AI source cannot self-approve via client
    const source = parsed.data.source ?? "user";
    try {
      const result = await createSuggestion(db, {
        target_type: parsed.data.target_type,
        target_id: parsed.data.target_id,
        operation: parsed.data.operation,
        payload: parsed.data.payload,
        source,
        ai_metadata: parsed.data.ai_metadata ?? null,
        evidence: parsed.data.evidence,
        submitter_note: parsed.data.submitter_note,
        submitted_by: user.id,
        auto_approve: parsed.data.auto_approve === true && source !== "ai",
      });
      return ok(c, result, {}, 201);
    } catch (err) {
      return fail(c, 400, "suggestion_error", err instanceof Error ? err.message : "Failed");
    }
  });

  app.get("/suggestions", async (c) => {
    const user = requireRole(c, ["moderator", "admin"]);
    if (!user) return forbidden(c);
    const status = c.req.query("status") ?? "pending";
    const targetType = c.req.query("target_type");
    const sort = c.req.query("sort") ?? "score";

    let rows = await db
      .select()
      .from(suggestions)
      .where(eq(suggestions.status, status as any))
      .orderBy(sort === "age" ? desc(suggestions.createdAt) : desc(suggestions.communityScore))
      .limit(100);

    if (targetType) rows = rows.filter((r) => r.targetType === targetType);

    // crude duplicate detector: same target_type + similar title in payload
    const titles = new Map<string, string[]>();
    for (const r of rows) {
      const title = String((r.payload as any)?.title ?? "");
      if (!title) continue;
      const key = `${r.targetType}:${title.toLowerCase().slice(0, 40)}`;
      const list = titles.get(key) ?? [];
      list.push(r.id);
      titles.set(key, list);
    }
    const duplicateGroups = [...titles.values()].filter((g) => g.length > 1);

    return ok(
      c,
      rows.map((r) => ({
        id: r.id,
        target_type: r.targetType,
        target_id: r.targetId,
        operation: r.operation,
        payload: r.payload,
        source: r.source,
        ai_metadata: r.aiMetadata,
        submitter_note: r.submitterNote,
        status: r.status,
        submitted_by: r.submittedBy,
        community_score: r.communityScore,
        created_at: r.createdAt,
      })),
      { duplicate_groups: duplicateGroups }
    );
  });

  app.post("/suggestions/:id/approve", async (c) => {
    const user = requireRole(c, ["moderator", "admin"]);
    if (!user) return forbidden(c);
    const parsed = approveSuggestionSchema.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return fail(c, 400, "validation_error", parsed.error.message);
    try {
      const result = await approveSuggestion(db, {
        suggestionId: c.req.param("id"),
        reviewerId: user.id,
        reviewNote: parsed.data.review_note,
        edits: parsed.data.edits,
      });
      return ok(c, result);
    } catch (err) {
      return fail(c, 400, "approve_error", err instanceof Error ? err.message : "Failed");
    }
  });

  app.post("/suggestions/:id/reject", async (c) => {
    const user = requireRole(c, ["moderator", "admin"]);
    if (!user) return forbidden(c);
    const parsed = rejectSuggestionSchema.safeParse(await c.req.json());
    if (!parsed.success) return fail(c, 400, "validation_error", parsed.error.message);
    try {
      const result = await rejectSuggestion(db, {
        suggestionId: c.req.param("id"),
        reviewerId: user.id,
        rejection_reason: parsed.data.rejection_reason,
        review_note: parsed.data.review_note,
      });
      return ok(c, result);
    } catch (err) {
      return fail(c, 400, "reject_error", err instanceof Error ? err.message : "Failed");
    }
  });

  app.post("/suggestions/:id/withdraw", async (c) => {
    const user = requireUser(c);
    if (!user) return unauthorized(c);
    try {
      const result = await withdrawSuggestion(db, {
        suggestionId: c.req.param("id"),
        userId: user.id,
      });
      return ok(c, result);
    } catch (err) {
      return fail(c, 400, "withdraw_error", err instanceof Error ? err.message : "Failed");
    }
  });

  return app;
}
