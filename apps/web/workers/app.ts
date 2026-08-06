import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { createApp } from "../../api/src/create-app";
import type { ApiBindings } from "../../api/src/env";

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: ApiBindings;
      ctx: ExecutionContext;
    };
  }
}

const app = new Hono<{ Bindings: ApiBindings }>();

// Mount Precept API (routes already prefixed with /api)
app.route("/", createApp());

app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE
  );
  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

export default app;
