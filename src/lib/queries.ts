import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { courses, enrollments, scans, students, users, type Course, type Student } from "@/db/schema";
import { readIdToken } from "./idtoken";
import { normaliseRegNo, verifyForCourse, type Verdict } from "./verify";
import { addDays } from "./today";

export async function findUserByEmail(database: DB, email: string) {
  const [u] = await database.select().from(users).where(eq(users.email, email));
  return u ?? null;
}

/** The signed-in student's own register entry and courses. */
export async function myStudentRecord(database: DB, userId: number) {
  const [row] = await database.select({ s: students }).from(users).innerJoin(students, eq(students.id, users.studentId)).where(eq(users.id, userId));
  if (!row) return null;
  const list = await database
    .select({ code: courses.code, title: courses.title, units: courses.units, venue: courses.venue, lecturer: users.name })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(users, eq(users.id, courses.lecturerId))
    .where(eq(enrollments.studentId, row.s.id))
    .orderBy(asc(courses.code));
  return { student: row.s, courses: list };
}

/** Courses taught by the signed-in lecturer, with class sizes. */
export async function lecturerCourses(database: DB, lecturerId: number) {
  return database
    .select({
      course: courses,
      enrolled: sql<number>`(select count(*)::int from enrollments e where e.course_id = "courses"."id")`,
    })
    .from(courses)
    .where(eq(courses.lecturerId, lecturerId))
    .orderBy(desc(courses.level), desc(courses.code));
}

export type ScanOutcome = { verdict: Verdict; student: Student | null; course: Course; method: "qr" | "regno" };

/**
 * Verify a scanned QR (or a typed registration number) for one of the lecturer's courses and
 * log the result. Returns null if the course does not belong to this lecturer.
 */
export async function verifyScan(database: DB, lecturerId: number, courseId: number, input: string, today: string): Promise<ScanOutcome | null> {
  const [course] = await database.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.lecturerId, lecturerId)));
  if (!course) return null;
  const typed = normaliseRegNo(input);
  const isRegNo = /^UU\/\d{2}\/[A-Z]{3}\/\d{3}$/.test(typed);
  let student: Student | null = null;
  let token: { ok: true; cardVersion: number } | { ok: false };
  if (isRegNo) {
    [student] = await database.select().from(students).where(eq(students.regNo, typed));
    student ??= null;
    token = { ok: true, cardVersion: student?.cardVersion ?? 1 };
  } else {
    const parsed = readIdToken(input);
    if (parsed.ok) {
      [student] = await database.select().from(students).where(eq(students.regNo, parsed.regNo));
      student ??= null;
      token = { ok: true, cardVersion: parsed.cardVersion };
    } else token = { ok: false };
  }
  let enrolled = false;
  if (student) {
    const e = await database.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.studentId, student.id), eq(enrollments.courseId, course.id)));
    enrolled = e.length > 0;
  }
  const verdict = verifyForCourse({ token, student, course, enrolled, today });
  await database.insert(scans).values({ lecturerId, courseId: course.id, studentId: student?.id ?? null, result: verdict.result });
  return { verdict, student, course, method: isRegNo ? "regno" : "qr" };
}

/** The signed-in lecturer's recent scans. */
export async function recentScans(database: DB, lecturerId: number, limit = 30) {
  return database
    .select({
      id: scans.id,
      result: scans.result,
      at: scans.scannedAt,
      code: courses.code,
      firstName: students.firstName,
      lastName: students.lastName,
      regNo: students.regNo,
    })
    .from(scans)
    .innerJoin(courses, eq(courses.id, scans.courseId))
    .leftJoin(students, eq(students.id, scans.studentId))
    .where(eq(scans.lecturerId, lecturerId))
    .orderBy(desc(scans.scannedAt))
    .limit(limit);
}

/** Class list for one of the lecturer's courses, with when each student was last verified. */
export async function classRoster(database: DB, lecturerId: number, courseId: number, today: string) {
  const [course] = await database.select().from(courses).where(and(eq(courses.id, courseId), eq(courses.lecturerId, lecturerId)));
  if (!course) return null;
  const roster = await database
    .select({
      student: students,
      lastSeen: sql<Date | null>`(select max(s.scanned_at) from scans s where s.student_id = "students"."id" and s.course_id = ${courseId} and s.result = 'in_class')`,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .where(eq(enrollments.courseId, courseId))
    .orderBy(asc(students.lastName), asc(students.firstName));
  const since = new Date(`${addDays(today, 0)}T00:00:00+01:00`);
  const todayScans = await database.select({ studentId: scans.studentId, result: scans.result }).from(scans).where(and(eq(scans.courseId, courseId), gte(scans.scannedAt, since)));
  const outsiders = todayScans.filter((s) => s.result !== "in_class").length;
  return { course, roster, verifiedToday: new Set(todayScans.filter((s) => s.result === "in_class").map((s) => s.studentId)), outsiders };
}

/** What anyone sees when they open the QR link with a phone camera (no login). */
export async function publicLookup(database: DB, rawToken: string) {
  const parsed = readIdToken(rawToken);
  if (!parsed.ok) return { ok: false as const };
  const [student] = await database.select().from(students).where(eq(students.regNo, parsed.regNo));
  if (!student) return { ok: false as const };
  return { ok: true as const, student, current: parsed.cardVersion === student.cardVersion };
}

export async function studentByRegNo(database: DB, regNo: string) {
  const [s] = await database.select().from(students).where(eq(students.regNo, regNo));
  return s ?? null;
}

const dayStart = (today: string) => new Date(`${today}T00:00:00+01:00`);

/** Today's checks at one of the lecturer's classes, newest first. */
export async function sessionLog(database: DB, lecturerId: number, courseId: number, today: string) {
  return database
    .select({
      id: scans.id,
      result: scans.result,
      at: scans.scannedAt,
      studentId: scans.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      regNo: students.regNo,
      department: students.department,
      gender: students.gender,
    })
    .from(scans)
    .leftJoin(students, eq(students.id, scans.studentId))
    .where(and(eq(scans.lecturerId, lecturerId), eq(scans.courseId, courseId), gte(scans.scannedAt, dayStart(today))))
    .orderBy(desc(scans.scannedAt));
}

/** Every course the lecturer teaches with class size and today's verified count. */
export async function courseOverview(database: DB, lecturerId: number, today: string) {
  const since = dayStart(today);
  return database
    .select({
      course: courses,
      enrolled: sql<number>`(select count(*)::int from enrollments e where e.course_id = "courses"."id")`,
      presentToday: sql<number>`(select count(distinct s.student_id)::int from scans s where s.course_id = "courses"."id" and s.result = 'in_class' and s.scanned_at >= ${since})`,
      flaggedToday: sql<number>`(select count(*)::int from scans s where s.course_id = "courses"."id" and s.result <> 'in_class' and s.scanned_at >= ${since})`,
      lastScan: sql<Date | null>`(select max(s.scanned_at) from scans s where s.course_id = "courses"."id")`,
    })
    .from(courses)
    .where(eq(courses.lecturerId, lecturerId))
    .orderBy(desc(courses.level), desc(courses.code));
}

/** The lecturer's full scan history, optionally filtered by course or result group. */
export async function scanLog(database: DB, lecturerId: number, opts: { courseId?: number; group?: "admitted" | "flagged" | "rejected" } = {}, limit = 200) {
  const groups = { admitted: ["in_class"], flagged: ["same_department", "other_department", "expired"], rejected: ["suspended", "revoked", "unknown", "invalid"] } as const;
  const conds = [eq(scans.lecturerId, lecturerId)];
  if (opts.courseId) conds.push(eq(scans.courseId, opts.courseId));
  if (opts.group) conds.push(sql`${scans.result} in (${sql.join(groups[opts.group].map((g) => sql`${g}`), sql`, `)})`);
  return database
    .select({ id: scans.id, result: scans.result, at: scans.scannedAt, code: courses.code, firstName: students.firstName, lastName: students.lastName, regNo: students.regNo, department: students.department })
    .from(scans)
    .innerJoin(courses, eq(courses.id, scans.courseId))
    .leftJoin(students, eq(students.id, scans.studentId))
    .where(and(...conds))
    .orderBy(desc(scans.scannedAt))
    .limit(limit);
}
