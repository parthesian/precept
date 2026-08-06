import type { Context, Next } from "hono";

type AuthBindings = {
  API_KEY: string;
};

export async function ingestAuth(c: Context<{ Bindings: AuthBindings }>, next: Next) {
  const token = c.req.header("x-api-key");
  if (!token || token !== c.env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
}
