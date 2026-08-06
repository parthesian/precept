import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@precept/db";
import { sessions, users } from "@precept/db";
import { fail } from "../lib/envelope.js";
import type { ApiBindings } from "../env.js";

export type AuthedUser = typeof users.$inferSelect;

export type AppEnv = {
  Bindings: ApiBindings;
  Variables: {
    db: Db;
    user: AuthedUser | null;
  };
};

export function createAuthMiddleware() {
  return async (c: Context<AppEnv>, next: Next) => {
    const db = c.get("db");
    const token = getCookie(c, "precept_session") || c.req.header("x-session-token");
    if (!token) {
      c.set("user", null);
      return next();
    }
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, Date.now())));
    if (!session) {
      c.set("user", null);
      return next();
    }
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    c.set("user", user ?? null);
    return next();
  };
}

export function requireUser(c: Context<AppEnv>) {
  const user = c.get("user");
  if (!user || user.role === "anon") {
    return null;
  }
  return user;
}

export function requireRole(c: Context<AppEnv>, roles: Array<AuthedUser["role"]>) {
  const user = requireUser(c);
  if (!user || !roles.includes(user.role)) return null;
  return user;
}

export function unauthorized(c: Context) {
  return fail(c, 401, "unauthorized", "Login required");
}

export function forbidden(c: Context) {
  return fail(c, 403, "forbidden", "Insufficient role");
}
