import "dotenv/config";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool, makeDb } from "../src/db";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = createPool(url);
  await migrate(makeDb(pool), { migrationsFolder: "drizzle" });
  console.log("Migrations applied");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
