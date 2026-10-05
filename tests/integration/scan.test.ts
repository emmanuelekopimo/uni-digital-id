import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import type { Pool } from "pg";
import type { DB } from "@/db";
import { courses, scans, students, users } from "@/db/schema";
import { classRoster, lecturerCourses, myStudentRecord, publicLookup, recentScans, verifyScan } from "@/lib/queries";
import { makeIdToken } from "@/lib/idtoken";
import { DEMO_LECTURER, DEMO_STUDENT } from "@/db/seed-data";
import { freshDb } from "./setup";

const TODAY = "2026-10-05";
let pool: Pool;
let database: DB;
let lecturerId: number;
let csc311: number;
let counts: Awaited<ReturnType<typeof freshDb>>["counts"];
const byName = async (first: string, last: string) => (await database.select().from(students).where(and(eq(students.firstName, first), eq(students.lastName, last))))[0];
const tokenFor = async (first: string, last: string) => {
  const s = await byName(first, last);
  return makeIdToken(s.regNo, s.cardVersion);
};

beforeAll(async () => {
  ({ pool, database, counts } = await freshDb());
  lecturerId = (await database.select().from(users).where(eq(users.email, DEMO_LECTURER.email)))[0].id;
  csc311 = (await database.select().from(courses).where(eq(courses.code, "CSC 311")))[0].id;
});
afterAll(() => pool.end());

describe("seed", () => {
  it("has a realistic register", () => {
    expect(counts.students).toBeGreaterThanOrEqual(40);
    expect(counts.enrollments).toBeGreaterThan(50);
    expect(counts.scans).toBeGreaterThan(30);
  });
});

describe("verifyScan", () => {
  it("green for a registered student, and logs the scan", async () => {
    const before = (await recentScans(database, lecturerId, 100)).length;
    const r = await verifyScan(database, lecturerId, csc311, await tokenFor("Ubong", "Akpan"), TODAY);
    expect(r?.verdict.result).toBe("in_class");
    expect(r?.method).toBe("qr");
    expect((await recentScans(database, lecturerId, 100)).length).toBe(before + 1);
  });
  it("accepts the full verify URL from the QR code", async () => {
    const r = await verifyScan(database, lecturerId, csc311, `https://id.test/verify/${await tokenFor("Ekemini", "Bassey")}`, TODAY);
    expect(r?.verdict.result).toBe("in_class");
  });
  it("tells the lecturer a Law student is UniUyo but not in this class", async () => {
    const r = await verifyScan(database, lecturerId, csc311, await tokenFor("Uduak", "Etuk"), TODAY);
    expect(r?.verdict).toMatchObject({ result: "other_department", isUniuyo: true });
  });
  it("flags a CS student who did not register for CSC 311", async () => {
    expect((await verifyScan(database, lecturerId, csc311, await tokenFor("Amaka", "Nnaji"), TODAY))?.verdict.result).toBe("same_department");
  });
  it("flags suspended, expired and replaced cards", async () => {
    expect((await verifyScan(database, lecturerId, csc311, await tokenFor("Tobi", "Adebayo"), TODAY))?.verdict.result).toBe("suspended");
    expect((await verifyScan(database, lecturerId, csc311, await tokenFor("Femi", "Oladipo"), TODAY))?.verdict.result).toBe("expired");
    const g = await byName("Godswill", "Udoh");
    expect(g.cardVersion).toBe(2);
    expect((await verifyScan(database, lecturerId, csc311, makeIdToken(g.regNo, 1), TODAY))?.verdict.result).toBe("revoked");
    expect((await verifyScan(database, lecturerId, csc311, makeIdToken(g.regNo, 2), TODAY))?.verdict.result).toBe("in_class");
  });
  it("rejects forged and unknown cards", async () => {
    expect((await verifyScan(database, lecturerId, csc311, "UU1.VVUvMjMvQ1NDLzk5OQ.1.AAAAAAAAAAAAAAAAAAAAAA", TODAY))?.verdict.result).toBe("invalid");
    expect((await verifyScan(database, lecturerId, csc311, makeIdToken("UU/23/CSC/999", 1), TODAY))?.verdict.result).toBe("unknown");
  });
  it("looks students up by a typed registration number", async () => {
    const s = await byName("Ubong", "Akpan");
    const r = await verifyScan(database, lecturerId, csc311, s.regNo.toLowerCase(), TODAY);
    expect(r).toMatchObject({ method: "regno", verdict: { result: "in_class" } });
  });
  it("refuses courses the lecturer does not teach", async () => {
    const law = (await database.select().from(courses).where(eq(courses.code, "LAW 301")))[0].id;
    expect(await verifyScan(database, lecturerId, law, await tokenFor("Uduak", "Etuk"), TODAY)).toBeNull();
  });
});

describe("scoping", () => {
  it("lecturers only see their own courses, scans and rosters", async () => {
    const mine = await lecturerCourses(database, lecturerId);
    expect(mine.map((c) => c.course.code)).toEqual(["CSC 311", "CSC 305", "CSC 201"]);
    const other = (await database.select().from(users).where(eq(users.email, "i.bassey@uniuyo.edu.ng")))[0].id;
    expect(await classRoster(database, other, csc311, TODAY)).toBeNull();
    const rows = await recentScans(database, other, 100);
    const [{ n }] = (await database.execute(sql`select count(*)::int as n from scans where lecturer_id = ${other}`)).rows as { n: number }[];
    expect(rows.length).toBe(n);
  });
  it("roster lists registered students and today's verifications", async () => {
    const r = (await classRoster(database, lecturerId, csc311, TODAY))!;
    expect(r.roster.length).toBe(21);
    expect(r.verifiedToday.size).toBeGreaterThan(0);
    expect(r.outsiders).toBeGreaterThan(0);
  });
  it("students only get their own record", async () => {
    const u = (await database.select().from(users).where(eq(users.email, DEMO_STUDENT.email)))[0];
    const rec = (await myStudentRecord(database, u.id))!;
    expect(rec.student.firstName).toBe("Ubong");
    expect(rec.courses.map((c) => c.code)).toEqual(["CSC 305", "CSC 311"]);
    const lect = await myStudentRecord(database, lecturerId);
    expect(lect).toBeNull();
  });
  it("public lookup confirms genuine current cards only", async () => {
    expect((await publicLookup(database, await tokenFor("Ubong", "Akpan"))).ok).toBe(true);
    const g = await byName("Godswill", "Udoh");
    expect(await publicLookup(database, makeIdToken(g.regNo, 1))).toMatchObject({ ok: true, current: false });
    expect((await publicLookup(database, "nonsense")).ok).toBe(false);
  });
  it("scan log keeps a row per check", async () => {
    const [{ n }] = (await database.execute(sql`select count(*)::int as n from scans where result = 'revoked'`)).rows as { n: number }[];
    expect(n).toBe(1);
    expect((await database.select().from(scans).where(eq(scans.result, "invalid"))).length).toBeGreaterThanOrEqual(2);
  });
});
