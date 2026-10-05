import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool, makeDb } from "../src/db";
import { resetDb, seed } from "../src/db/seed-data";
import { resolveNow } from "../src/lib/today";

export default async function globalSetup() {
  const pool = createPool(process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/uniid_test");
  const database = makeDb(pool);
  await migrate(database, { migrationsFolder: "drizzle" });
  await resetDb(database);
  await seed(database, resolveNow("2026-10-05"));
  await pool.end();
}
