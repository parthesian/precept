import type { Context } from "hono";
import type { ApiEnvelope } from "@precept/shared";

export function ok<T>(c: Context, data: T, meta?: Record<string, unknown>, status = 200) {
  const body: ApiEnvelope<T> = { data, meta: meta ?? {} };
  return c.json(body, status);
}

export function fail(
  c: Context,
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  const body: ApiEnvelope<null> = {
    data: null,
    errors: [{ code, message, details }],
  };
  return c.json(body, status);
}
