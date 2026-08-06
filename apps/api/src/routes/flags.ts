import { Hono } from "hono";
import type { Db } from "@precept/db";
import { flags, newId } from "@precept/db";
import { flagSchema } from "@precept/shared";
import { fail, ok } from "../lib/envelope.js";
import type { AppEnv } from "../middleware/auth.js";
import { requireUser, unauthorized } from "../middleware/auth.js";

export function flagRoutes() {
  const app = new Hono<AppEnv>();

  app.post("/flags", async (c) => {
    const db = c.get("db");
    const user = requireUser(c);
    if (!user) return unauthorized(c);
    const parsed = flagSchema.safeParse(await c.req.json());
    if (!parsed.success) return fail(c, 400, "validation_error", parsed.error.message);
    const id = newId();
    await db.insert(flags).values({
      id,
      targetType: parsed.data.target_type,
      targetId: parsed.data.target_id,
      reason: parsed.data.reason,
      note: parsed.data.note ?? null,
      submittedBy: user.id,
    });
    return ok(c, { id }, {}, 201);
  });

  return app;
}
