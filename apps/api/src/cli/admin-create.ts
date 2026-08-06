#!/usr/bin/env node
/**
 * Create or upgrade an admin user against local (or remote) D1.
 *
 *   npm run admin:create -- --email=you@example.com --password='…' --handle=you
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { getPlatformProxy } from "wrangler";
import { createDb, newId, users } from "@precept/db";
import { hashPassword } from "../lib/password.js";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const email = arg("email");
  const password = arg("password");
  const handle = arg("handle") ?? (email ? email.split("@")[0] : undefined);
  if (!email || !password || !handle) {
    console.error("Usage: admin:create --email=… --password=… [--handle=…]");
    process.exit(1);
  }

  // apps/api/src/cli → repo root is ../../../../
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
  const proxy = await getPlatformProxy({
    configPath: path.join(root, "apps/web/wrangler.jsonc"),
    persist: { path: path.join(root, "apps/web/.wrangler/state/v3") },
  });

  try {
    const db = createDb(proxy.env.DB as D1Database);
    const passwordHash = await hashPassword(password);
    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      await db
        .update(users)
        .set({ passwordHash, role: "admin", handle })
        .where(eq(users.id, existing.id));
      console.log(`Upgraded ${email} to admin (${existing.id})`);
    } else {
      const id = newId();
      await db.insert(users).values({
        id,
        email,
        handle,
        displayName: handle,
        passwordHash,
        role: "admin",
        createdAt: Date.now(),
      });
      console.log(`Created admin ${email} (${id})`);
    }
  } finally {
    await proxy.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
