import type { Context, Next } from "hono";

async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-1", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function etagMiddleware(c: Context, next: Next) {
  await next();
  if (c.req.method !== "GET") return;
  const res = c.res;
  if (!res || res.status !== 200) return;
  const clone = res.clone();
  const body = await clone.text();
  const etag = `"${await sha1Hex(body)}"`;
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
