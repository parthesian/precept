import { factory, type PRNG } from "ulid";

/** Workers-safe PRNG — never fall back to Math.random (forbidden on CF). */
const webPrng: PRNG = () => {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 255;
};

const makeUlid = factory(webPrng);

export function newId(): string {
  return makeUlid();
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
