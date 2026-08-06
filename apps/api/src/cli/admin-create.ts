import "dotenv/config";
import bcrypt from "bcryptjs";
import { createDb, newId, users } from "@precept/db";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.argv.find((a) => a.startsWith("--email="))?.split("=")[1];
  const password = process.argv.find((a) => a.startsWith("--password="))?.split("=")[1];
  const handle = process.argv.find((a) => a.startsWith("--handle="))?.split("=")[1] ?? "admin";
  if (!email || !password) {
    console.error("Usage: npm run admin:create -- --email=you@example.com --password=secret [--handle=admin]");
    process.exit(1);
  }

  const db = createDb();
  const existing = await db.select().from(users).where(eq(users.email, email));
  const passwordHash = await bcrypt.hash(password, 10);

  if (existing[0]) {
    await db
      .update(users)
      .set({ role: "admin", passwordHash, handle, displayName: handle })
      .where(eq(users.id, existing[0].id));
    console.log(`Granted admin to existing user ${email}`);
    return;
  }

  await db.insert(users).values({
    id: newId(),
    email,
    handle,
    displayName: handle,
    passwordHash,
    role: "admin",
  });
  console.log(`Created admin user ${email} (handle=${handle})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
