/**
 * Reset local D1: delete local DB state by re-applying migrations after wrangler d1 delete is impractical.
 * Practical approach: remove .wrangler/state D1 files then re-migrate + seed.
 */
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("../../..", import.meta.url).pathname);
const stateDir = resolve(root, "apps/web/.wrangler/state");

if (existsSync(stateDir)) {
  console.log("removing", stateDir);
  rmSync(stateDir, { recursive: true, force: true });
}

function run(cmd: string, args: string[]) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npx", ["tsx", "packages/db/src/migrate.ts"]);
run("npx", ["tsx", "packages/db/src/seed/load.ts"]);
console.log("local D1 reset complete");
