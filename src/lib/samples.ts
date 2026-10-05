import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { makeIdToken } from "./idtoken";

/** A few seeded cards so the checkpoint can be rehearsed with one device. */
export async function demoCards(origin: string) {
  const want = [
    ["Ubong Akpan (CSC 311)", "Akpan", "Ubong"],
    ["Uduak Etuk (Law)", "Etuk", "Uduak"],
    ["Amaka Nnaji (CS, not in CSC 311)", "Nnaji", "Amaka"],
    ["Tobi Adebayo (suspended)", "Adebayo", "Tobi"],
    ["Femi Oladipo (expired)", "Oladipo", "Femi"],
  ] as const;
  const out: { label: string; value: string }[] = [];
  for (const [label, last, first] of want) {
    const [s] = await db().select().from(students).where(and(eq(students.lastName, last), eq(students.firstName, first)));
    if (s) out.push({ label, value: `${origin}/verify/${makeIdToken(s.regNo, s.cardVersion)}` });
  }
  out.push({ label: "Forged code", value: `${origin}/verify/UU1.VVUvMjMvQ1NDLzk5OQ.1.AAAAAAAAAAAAAAAAAAAAAA` });
  return out;
}
