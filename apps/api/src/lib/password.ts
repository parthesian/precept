/** Web Crypto PBKDF2 password hashing (Workers-friendly). */

const ITERATIONS = 100_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      // Copy into a fresh ArrayBuffer-backed view for DOM lib typings.
      salt: new Uint8Array(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    HASH_BYTES * 8
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${hash}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;

  // Legacy bcrypt hashes (if any) — best-effort under nodejs_compat.
  if (stored.startsWith("$2")) {
    try {
      const bcrypt = await import("bcryptjs");
      const ok = await bcrypt.compare(password, stored);
      return ok;
    } catch {
      return false;
    }
  }

  if (!stored.startsWith("pbkdf2$")) return false;
  const [, iterStr, saltHex, hashHex] = stored.split("$");
  const iterations = Number(iterStr);
  if (!iterations || !saltHex || !hashHex) return false;
  const computed = await pbkdf2(password, fromHex(saltHex), iterations);
  if (computed.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}

/** True when stored hash should be upgraded to PBKDF2 on next successful login. */
export function needsRehash(stored: string | null | undefined): boolean {
  return Boolean(stored && stored.startsWith("$2"));
}
