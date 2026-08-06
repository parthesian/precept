/** Workers KV hourly counters. Keys: rl:{bucket}:{userId}:{yyyyMMddHH} */

function hourKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}${m}${day}${h}`;
}

export async function rateLimit(
  kv: KVNamespace | undefined,
  key: string,
  limit: number
): Promise<boolean> {
  // Fallback in-memory for tests without KV binding (single-isolate only).
  if (!kv) {
    return memoryRateLimit(key, limit);
  }
  const fullKey = `rl:${key}:${hourKey()}`;
  const current = Number((await kv.get(fullKey)) ?? "0");
  if (current >= limit) return false;
  await kv.put(fullKey, String(current + 1), { expirationTtl: 2 * 60 * 60 });
  return true;
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function memoryRateLimit(key: string, limit: number, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
