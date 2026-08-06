import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema/index.js";

export type Db = ReturnType<typeof createDb>;

/** Create a Drizzle client bound to a Cloudflare D1 database. */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export { schema };
