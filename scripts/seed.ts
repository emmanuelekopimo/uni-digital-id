import "dotenv/config";
import { createPool, makeDb } from "../src/db";
import { isEmpty, resetDb, seed } from "../src/db/seed-data";
import { now } from "../src/lib/today";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = createPool(url);
  const database = makeDb(pool);
  const ifEmpty = process.argv.includes("--if-empty");
  if (ifEmpty && !(await isEmpty(database))) {
    console.log("Database already has data, skipping seed");
  } else {
    if (!ifEmpty) await resetDb(database);
    const r = await seed(database, now());
    console.log(`Seeded ${r.students} students, ${r.lecturers} lecturers, ${r.courses} courses, ${r.enrollments} enrollments, ${r.scans} scans`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
