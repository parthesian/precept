/** Crockford Base32 (ULID alphabet). */
const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(now: number, len: number): string {
  let str = "";
  for (let i = len; i > 0; i--) {
    const mod = now % 32;
    str = ENCODING.charAt(mod) + str;
    now = (now - mod) / 32;
  }
  return str;
}

function encodeRandom(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let str = "";
  for (let i = 0; i < len; i++) {
    str += ENCODING.charAt(bytes[i] % 32);
  }
  return str;
}

/** Workers-safe ULID (no `ulid` package — its import-time detectPrng uses Math.random). */
export function newId(): string {
  return encodeTime(Date.now(), TIME_LEN) + encodeRandom(RANDOM_LEN);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80) || "item";
}

export function countWords(value: string | null | undefined): number {
  if (!value) return 0;
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function assertExcerptCap(excerpt: string | null | undefined): void {
  if (excerpt != null && countWords(excerpt) > 15) {
    throw new Error("excerpt must be at most 15 words");
  }
}
