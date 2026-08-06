import { Hono } from "hono";
import type { Db } from "@precept/db";
import { createSuggestion } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";
import type { AppEnv } from "../middleware/auth.js";
import { requireRole, unauthorized } from "../middleware/auth.js";

/**
 * Milestone 8 optional endpoint.
 * When the vision pipeline is unavailable, queues a clearly-labeled stub AI suggestion
 * so the product never depends on a running model.
 */
export function aiRoutes() {
  const app = new Hono<AppEnv>();

  app.post("/ai/propose", async (c) => {
    const db = c.get("db");
    const user = requireRole(c, ["contributor", "trusted", "moderator", "admin"]);
    if (!user) return unauthorized(c);

    const body = await c.req.json<{ film_id: string; mode?: string }>();
    if (!body.film_id) return fail(c, 400, "bad_request", "film_id is required");

    // Stub path — never auto-approves; always ai_suggested
    const result = await createSuggestion(db, {
      target_type: "connection",
      operation: "create",
      source: "ai",
      submitted_by: user.id,
      auto_approve: false,
      ai_metadata: {
        model: "stub",
        prompt_version: "m8-stub",
        generated_at: new Date().toISOString(),
        raw_response: { note: "Vision pipeline not wired; stub proposal only", mode: body.mode ?? "default" },
        token_cost: 0,
      },
      payload: {
        source_film_id: body.film_id,
        target_film_id: body.film_id,
        is_directed: true,
        connection_type: "visual_motif",
        confidence_tier: "ai_suggested",
        title: "AI stub proposal (replace via pipeline)",
        rationale: "Placeholder AI proposal. Wire packages/pipeline in Milestone 8 for real candidates.",
        tags: ["ai", "stub"],
        evidence: [],
      },
      submitter_note: "Queued by /api/ai/propose stub",
    });

    return ok(c, { suggestion_ids: [result.suggestionId], status: "queued_stub" }, {}, 202);
  });

  return app;
}
