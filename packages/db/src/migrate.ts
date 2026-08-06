/**
 * Apply D1 migrations via Wrangler.
 * Usage: npm run db:migrate [-- --remote]
 */
import { spawnSync } from "node:child_process";

const remote = process.argv.includes("--remote");
const args = [
  "d1",
  "migrations",
  "apply",
  "precept",
  remote ? "--remote" : "--local",
  "-c",
  "apps/web/wrangler.jsonc",
];

console.log(`wrangler ${args.join(" ")}`);
const result = spawnSync("npx", ["wrangler", ...args], {
  stdio: "inherit",
  cwd: new URL("../../..", import.meta.url).pathname,
  shell: false,
});
process.exit(result.status ?? 1);
