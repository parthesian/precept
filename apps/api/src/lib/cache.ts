import type { Context, Next } from "hono";
import { createHash } from "node:crypto";

export async function etagMiddleware(c: Context, next: Next) {
  await next();
  if (c.req.method !== "GET") return;
  const res = c.res;
  if (!res || res.status !== 200) return;
  const clone = res.clone();
  const body = await clone.text();
  const etag = `"${createHash("sha1").update(body).digest("hex")}"`;
  const headers = new Headers(res.headers);
  headers.set("ETag", etag);
  headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  const ifNoneMatch = c.req.header("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    c.res = new Response(null, { status: 304, headers });
    return;
  }
  c.res = new Response(body, { status: res.status, headers });
}
