import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool, makeDb } from "@/db";
import { resetDb, seed } from "@/db/seed-data";

export const TEST_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/uniid_test";
export const NOW = new Date("2026-10-05T09:00:00Z");

export async function freshDb() {
  const pool = createPool(TEST_URL);
  const database = makeDb(pool);
  await migrate(database, { migrationsFolder: "drizzle" });
  await resetDb(database);
  const counts = await seed(database, NOW);
  return { pool, database, counts };
}
