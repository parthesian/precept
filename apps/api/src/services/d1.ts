export function toSqliteBool(value: boolean): number {
  return value ? 1 : 0;
}

export function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as T[];
  } catch {
    return [];
  }
}

export function nowIsoString(): string {
  return new Date().toISOString();
}

export function generateId(): string {
  // Use Web Crypto so ID generation works in Cloudflare Workers and wrangler dev.
  return crypto.randomUUID();
}
