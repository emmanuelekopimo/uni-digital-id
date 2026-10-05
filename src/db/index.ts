import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { uniIdPool?: Pool };

export function createPool(url: string) {
  return new Pool({ connectionString: url, max: 10 });
}

function getPool() {
  if (!globalForDb.uniIdPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.uniIdPool = createPool(url);
  }
  return globalForDb.uniIdPool;
}

export function makeDb(pool: Pool): DB {
  return drizzle(pool, { schema });
}

let cached: DB | undefined;
export function db(): DB {
  if (!cached) cached = makeDb(getPool());
  return cached;
}

export async function pingDb() {
  await getPool().query("select 1");
}
