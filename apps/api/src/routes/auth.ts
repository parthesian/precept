import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import type { Db } from "@precept/db";
import { newId, sessions, users } from "@precept/db";
import { fail, ok } from "../lib/envelope.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import type { AppEnv } from "../middleware/auth.js";
import { requireUser, unauthorized } from "../middleware/auth.js";

function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    handle: user.handle,
    display_name: user.displayName,
    email: user.email,
    role: user.role,
    reputation: user.reputation,
    contribution_counts: user.contributionCounts,
    avatar_url: user.avatarUrl,
  };
}

export function authRoutes() {
  const app = new Hono<AppEnv>();

  app.get("/me", async (c) => {
    const db = c.get("db");
    const user = c.get("user");
    if (!user) return ok(c, null);
    return ok(c, publicUser(user));
  });

  app.post("/auth/register", async (c) => {
    const db = c.get("db");
    const body = await c.req.json<{ email: string; password: string; handle: string; display_name?: string }>();
    if (!body.email || !body.password || !body.handle) {
      return fail(c, 400, "bad_request", "email, password, and handle are required");
    }
    const existing = await db.select().from(users).where(eq(users.email, body.email));
    if (existing[0]) return fail(c, 409, "conflict", "Email already registered");

    const id = newId();
    await db.insert(users).values({
      id,
      email: body.email,
      handle: body.handle,
      displayName: body.display_name ?? body.handle,
      passwordHash: await hashPassword(body.password),
      role: "contributor",
      createdAt: Date.now(),
    });
    const token = newId() + newId();
    await db.insert(sessions).values({
      id: newId(),
      userId: id,
      token,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
      createdAt: Date.now(),
    });
    setCookie(c, "precept_session", token, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      secure: c.env.ENVIRONMENT === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return ok(c, publicUser(user), {}, 201);
  });

  app.post("/auth/login", async (c) => {
    const db = c.get("db");
    const body = await c.req.json<{ email: string; password: string }>();
    const [user] = await db.select().from(users).where(eq(users.email, body.email));
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return fail(c, 401, "unauthorized", "Invalid credentials");
    }
    const token = newId() + newId();
    await db.insert(sessions).values({
      id: newId(),
      userId: user.id,
      token,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30,
      createdAt: Date.now(),
    });
    setCookie(c, "precept_session", token, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      secure: c.env.ENVIRONMENT === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    return ok(c, publicUser(user));
  });

  app.post("/auth/logout", async (c) => {
    const db = c.get("db");
    const user = requireUser(c);
    if (!user) return unauthorized(c);
    deleteCookie(c, "precept_session", { path: "/" });
    return ok(c, { ok: true });
  });

  return app;
}
