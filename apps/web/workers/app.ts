import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { createDb } from "@precept/db";
import { importFilmFull } from "@precept/importer";
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

type TmdbImportMessage = {
  tmdbId: number;
  userId?: string;
  autoApprove?: boolean;
};

export default {
  fetch: app.fetch.bind(app),
  async queue(batch, env) {
    const db = createDb(env.DB);
    const key = env.TMDB_API_KEY;
    for (const msg of batch.messages) {
      try {
        const body = msg.body as TmdbImportMessage;
        if (!key) {
          console.error("tmdb-import: TMDB_API_KEY missing");
          msg.retry();
          continue;
        }
        if (!body?.tmdbId) {
          msg.ack();
          continue;
        }
        const result = await importFilmFull(db, body.tmdbId, key, { backfill: true });
        console.log("tmdb-import ok", result.filmId, result.title, {
          created: result.created,
          credits: result.creditsImported,
        });
        msg.ack();
      } catch (err) {
        console.error("tmdb-import failed", err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<ApiBindings>;
