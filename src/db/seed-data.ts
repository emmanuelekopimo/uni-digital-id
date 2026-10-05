import { sql } from "drizzle-orm";
import type { DB } from "./index";
import { courses, enrollments, scans, students, users, type ScanResult } from "./schema";
import { addDays, campusDay } from "@/lib/today";
import { hashPassword } from "@/lib/auth";

export const DEMO_STUDENT = { email: "student@uniuyo.edu.ng", password: "student123" };
export const DEMO_LECTURER = { email: "lecturer@uniuyo.edu.ng", password: "lecturer123" };
export const DEMO_OUTSIDER = { email: "uduak.etuk@student.uniuyo.edu.ng" };

const DEPTS = {
  CSC: { department: "Computer Science", faculty: "Faculty of Science" },
  LAW: { department: "Law", faculty: "Faculty of Law" },
  ECO: { department: "Economics", faculty: "Faculty of Social Sciences" },
  EEE: { department: "Electrical/Electronic Engineering", faculty: "Faculty of Engineering" },
  MCB: { department: "Microbiology", faculty: "Faculty of Science" },
} as const;
type Dept = keyof typeof DEPTS;

type SeedStudent = {
  last: string;
  first: string;
  other?: string;
  gender: "M" | "F";
  dept: Dept;
  level: number;
  num: number;
  courses: string[];
  status?: "active" | "suspended" | "graduated";
  /** Days from today until the ID expires (negative means expired). */
  expiresIn?: number;
  cardVersion?: number;
  blood?: string;
  email?: string;
};

export const SEED_STUDENTS: SeedStudent[] = [
  // Computer Science 300 level: the CSC 311 / CSC 305 class
  { last: "Akpan", first: "Ubong", other: "Daniel", gender: "M", dept: "CSC", level: 300, num: 45, courses: ["CSC 311", "CSC 305"], blood: "O+", email: DEMO_STUDENT.email },
  { last: "Bassey", first: "Ekemini", gender: "F", dept: "CSC", level: 300, num: 12, courses: ["CSC 311", "CSC 305"], blood: "A+" },
  { last: "Etim", first: "Aniekan", gender: "M", dept: "CSC", level: 300, num: 17, courses: ["CSC 311", "CSC 305"], blood: "O+" },
  { last: "Essien", first: "Ifiok", gender: "M", dept: "CSC", level: 300, num: 21, courses: ["CSC 311", "CSC 305"], blood: "B+" },
  { last: "Okon", first: "Mfon", gender: "F", dept: "CSC", level: 300, num: 23, courses: ["CSC 311", "CSC 305"], blood: "O-" },
  { last: "Inyang", first: "Nsikak", gender: "M", dept: "CSC", level: 300, num: 27, courses: ["CSC 311", "CSC 305"] },
  { last: "Umoh", first: "Idara", gender: "F", dept: "CSC", level: 300, num: 31, courses: ["CSC 311", "CSC 305"], blood: "A-" },
  { last: "Ekanem", first: "Emem", gender: "F", dept: "CSC", level: 300, num: 34, courses: ["CSC 311", "CSC 305"] },
  { last: "Edet", first: "Ubong", gender: "M", dept: "CSC", level: 300, num: 38, courses: ["CSC 311", "CSC 305"], blood: "O+" },
  { last: "Archibong", first: "Eno", gender: "F", dept: "CSC", level: 300, num: 40, courses: ["CSC 311", "CSC 305"] },
  { last: "Okafor", first: "Chiamaka", gender: "F", dept: "CSC", level: 300, num: 51, courses: ["CSC 311", "CSC 305"], blood: "B+" },
  { last: "Adeyemi", first: "Tunde", gender: "M", dept: "CSC", level: 300, num: 56, courses: ["CSC 311", "CSC 305"] },
  { last: "Nwosu", first: "Emeka", gender: "M", dept: "CSC", level: 300, num: 60, courses: ["CSC 311", "CSC 305"], blood: "AB+" },
  { last: "Yusuf", first: "Zainab", gender: "F", dept: "CSC", level: 300, num: 63, courses: ["CSC 311", "CSC 305"] },
  { last: "Eze", first: "Chinedu", gender: "M", dept: "CSC", level: 300, num: 67, courses: ["CSC 311", "CSC 305"] },
  { last: "Obi", first: "Ngozi", gender: "F", dept: "CSC", level: 300, num: 70, courses: ["CSC 311", "CSC 305"], blood: "O+" },
  { last: "Ogunleye", first: "Seun", gender: "M", dept: "CSC", level: 300, num: 74, courses: ["CSC 311"] },
  { last: "Abubakar", first: "Halima", gender: "F", dept: "CSC", level: 300, num: 78, courses: ["CSC 311", "CSC 305"], expiresIn: 18 },
  { last: "Adebayo", first: "Tobi", gender: "M", dept: "CSC", level: 300, num: 81, courses: ["CSC 311", "CSC 305"], status: "suspended" },
  { last: "Udoh", first: "Godswill", gender: "M", dept: "CSC", level: 300, num: 85, courses: ["CSC 311", "CSC 305"], cardVersion: 2 },
  // Computer Science, not registered for CSC 311
  { last: "Nnaji", first: "Amaka", gender: "F", dept: "CSC", level: 300, num: 88, courses: ["CSC 305"] },
  { last: "Musa", first: "Ibrahim", gender: "M", dept: "CSC", level: 400, num: 7, courses: ["CSC 401"], blood: "A+" },
  { last: "Ogbu", first: "Blessing", gender: "F", dept: "CSC", level: 400, num: 9, courses: ["CSC 401"] },
  { last: "Uche", first: "Kelechi", gender: "M", dept: "CSC", level: 200, num: 102, courses: ["CSC 201"] },
  { last: "Alade", first: "Funmilayo", gender: "F", dept: "CSC", level: 200, num: 105, courses: ["CSC 201"] },
  { last: "Danjuma", first: "Yusuf", gender: "M", dept: "CSC", level: 200, num: 109, courses: ["CSC 201"] },
  { last: "Ibe", first: "Adaeze", gender: "F", dept: "CSC", level: 200, num: 113, courses: ["CSC 201"] },
  { last: "Oladipo", first: "Femi", gender: "M", dept: "CSC", level: 500, num: 3, courses: [], status: "graduated", expiresIn: -40 },
  // Law
  { last: "Etuk", first: "Uduak", gender: "F", dept: "LAW", level: 300, num: 112, courses: ["LAW 301"], blood: "O+", email: DEMO_OUTSIDER.email },
  { last: "Ekong", first: "Ruth", gender: "F", dept: "LAW", level: 300, num: 115, courses: ["LAW 301"] },
  { last: "Asuquo", first: "Emmanuel", gender: "M", dept: "LAW", level: 300, num: 118, courses: ["LAW 301"] },
  { last: "Udofia", first: "Esther", gender: "F", dept: "LAW", level: 300, num: 121, courses: ["LAW 301"] },
  { last: "Obot", first: "Patrick", gender: "M", dept: "LAW", level: 300, num: 124, courses: ["LAW 301"], expiresIn: -9 },
  { last: "Ikpe", first: "Comfort", gender: "F", dept: "LAW", level: 300, num: 127, courses: ["LAW 301"] },
  // Economics
  { last: "Ekpenyong", first: "Michael", gender: "M", dept: "ECO", level: 200, num: 201, courses: ["ECO 211"] },
  { last: "Udo", first: "Favour", gender: "F", dept: "ECO", level: 200, num: 204, courses: ["ECO 211"] },
  { last: "Akpan", first: "Joshua", gender: "M", dept: "ECO", level: 200, num: 207, courses: ["ECO 211"] },
  { last: "Ita", first: "Deborah", gender: "F", dept: "ECO", level: 200, num: 210, courses: ["ECO 211"] },
  { last: "Ukpong", first: "Victor", gender: "M", dept: "ECO", level: 200, num: 213, courses: ["ECO 211"] },
  { last: "Ekwere", first: "Mercy", gender: "F", dept: "ECO", level: 200, num: 216, courses: ["ECO 211"] },
  // Electrical/Electronic Engineering
  { last: "Offiong", first: "Grace", gender: "F", dept: "EEE", level: 300, num: 301, courses: ["EEE 305"] },
  { last: "Ebong", first: "Daniel", gender: "M", dept: "EEE", level: 300, num: 304, courses: ["EEE 305"] },
  { last: "Nkanta", first: "Joy", gender: "F", dept: "EEE", level: 300, num: 307, courses: ["EEE 305"] },
  { last: "Akpanudo", first: "Samuel", gender: "M", dept: "EEE", level: 300, num: 310, courses: ["EEE 305", "CSC 311"] },
  { last: "Etuk", first: "Precious", gender: "F", dept: "EEE", level: 300, num: 313, courses: ["EEE 305"] },
  // Microbiology
  { last: "Bello", first: "Fatima", gender: "F", dept: "MCB", level: 300, num: 401, courses: [] },
  { last: "Archibong", first: "Itoro", gender: "M", dept: "MCB", level: 300, num: 404, courses: [] },
  { last: "Udoh", first: "Kufre", gender: "M", dept: "MCB", level: 300, num: 407, courses: [] },
];

export const SEED_COURSES = [
  { code: "CSC 311", title: "Operating Systems", dept: "CSC" as Dept, level: 300, units: 3, venue: "Faculty of Science LT 2", lecturer: 0 },
  { code: "CSC 305", title: "Database Systems", dept: "CSC" as Dept, level: 300, units: 3, venue: "ICT Centre, Lab 1", lecturer: 0 },
  { code: "CSC 201", title: "Computer Programming II", dept: "CSC" as Dept, level: 200, units: 3, venue: "Faculty of Science LT 1", lecturer: 0 },
  { code: "CSC 401", title: "Software Engineering", dept: "CSC" as Dept, level: 400, units: 3, venue: "ICT Centre, Lab 2", lecturer: 1 },
  { code: "LAW 301", title: "Law of Contract", dept: "LAW" as Dept, level: 300, units: 4, venue: "Faculty of Law Moot Court", lecturer: 2 },
  { code: "ECO 211", title: "Microeconomic Theory", dept: "ECO" as Dept, level: 200, units: 3, venue: "Social Sciences Hall B", lecturer: 2 },
  { code: "EEE 305", title: "Electronic Circuits", dept: "EEE" as Dept, level: 300, units: 3, venue: "Engineering LT 3", lecturer: 1 },
];

const LECTURERS = [
  { name: "Dr. Aniefiok Ekong", email: DEMO_LECTURER.email, department: "Computer Science" },
  { name: "Engr. Nkereuwem Etim", email: "n.etim@uniuyo.edu.ng", department: "Electrical/Electronic Engineering" },
  { name: "Barr. Iquo Bassey", email: "i.bassey@uniuyo.edu.ng", department: "Law" },
];

export const regNoOf = (s: Pick<SeedStudent, "level" | "dept" | "num">, todayYear: number) =>
  `UU/${String((todayYear - s.level / 100) % 100).padStart(2, "0")}/${s.dept}/${String(s.num).padStart(3, "0")}`;

export async function isEmpty(database: DB) {
  const r = await database.execute(sql`select count(*)::int as n from students`);
  return Number((r.rows[0] as { n: number }).n) === 0;
}

export async function resetDb(database: DB) {
  await database.execute(sql`truncate table scans, enrollments, courses, users, students restart identity cascade`);
}

export async function seed(database: DB, now: Date) {
  const today = campusDay(now);
  const year = Number(today.slice(0, 4));
  const hash = await hashPassword(DEMO_STUDENT.password);
  const lecturerHash = await hashPassword(DEMO_LECTURER.password);

  const lecturerRows = await database
    .insert(users)
    .values(LECTURERS.map((l) => ({ ...l, role: "lecturer" as const, passwordHash: lecturerHash })))
    .returning({ id: users.id });

  const courseRows = await database
    .insert(courses)
    .values(SEED_COURSES.map((c) => ({ code: c.code, title: c.title, department: DEPTS[c.dept].department, level: c.level, units: c.units, venue: c.venue, lecturerId: lecturerRows[c.lecturer].id })))
    .returning({ id: courses.id, code: courses.code });
  const courseId = new Map(courseRows.map((c) => [c.code, c.id]));

  const studentRows = await database
    .insert(students)
    .values(
      SEED_STUDENTS.map((s, i) => {
        const entryYear = year - s.level / 100;
        return {
          regNo: regNoOf(s, year),
          firstName: s.first,
          lastName: s.last,
          otherName: s.other ?? null,
          gender: s.gender,
          faculty: DEPTS[s.dept].faculty,
          department: DEPTS[s.dept].department,
          level: s.level,
          entryYear,
          status: s.status ?? "active",
          idIssuedOn: s.cardVersion && s.cardVersion > 1 ? addDays(today, -21) : `${entryYear}-11-15`,
          idExpiresOn: addDays(today, s.expiresIn ?? 200 + ((i * 53) % 700)),
          cardVersion: s.cardVersion ?? 1,
          bloodGroup: s.blood ?? null,
        };
      }),
    )
    .returning({ id: students.id, regNo: students.regNo });

  await database.insert(users).values(
    SEED_STUDENTS.map((s, i) => ({
      name: `${s.first} ${s.last}`,
      email: s.email ?? `${s.first}.${s.last}`.toLowerCase().replace(/[^a-z.]/g, "") + `${s.num}@student.uniuyo.edu.ng`,
      passwordHash: hash,
      role: "student" as const,
      department: DEPTS[s.dept].department,
      studentId: studentRows[i].id,
    })),
  );

  const enrollRows = SEED_STUDENTS.flatMap((s, i) => s.courses.map((c) => ({ studentId: studentRows[i].id, courseId: courseId.get(c)! })));
  await database.insert(enrollments).values(enrollRows);

  // Scan history for the demo lecturer's classes over the last two weeks.
  const lecturerId = lecturerRows[0].id;
  const pick = (regs: string[]) => regs.map((r) => studentRows.find((x) => x.regNo === r)!.id);
  const csc311 = SEED_STUDENTS.map((s, i) => ({ s, id: studentRows[i].id })).filter((x) => x.s.courses.includes("CSC 311") && !x.s.status);
  const history: { courseId: number; studentId: number | null; result: ScanResult; daysAgo: number; minute: number }[] = [];
  [12, 9, 5, 2].forEach((daysAgo, k) => {
    csc311.slice(k, k + 7).forEach((x, j) => history.push({ courseId: courseId.get("CSC 311")!, studentId: x.id, result: "in_class", daysAgo, minute: j * 2 }));
  });
  history.push({ courseId: courseId.get("CSC 311")!, studentId: pick([regNoOf({ level: 300, dept: "LAW", num: 115 }, year)])[0], result: "other_department", daysAgo: 5, minute: 20 });
  history.push({ courseId: courseId.get("CSC 311")!, studentId: pick([regNoOf({ level: 300, dept: "CSC", num: 81 }, year)])[0], result: "suspended", daysAgo: 2, minute: 18 });
  history.push({ courseId: courseId.get("CSC 311")!, studentId: null, result: "invalid", daysAgo: 2, minute: 22 });
  history.push({ courseId: courseId.get("CSC 305")!, studentId: pick([regNoOf({ level: 300, dept: "CSC", num: 88 }, year)])[0], result: "in_class", daysAgo: 1, minute: 3 });
  history.push({ courseId: courseId.get("CSC 305")!, studentId: pick([regNoOf({ level: 300, dept: "CSC", num: 74 }, year)])[0], result: "same_department", daysAgo: 1, minute: 6 });
  history.push({ courseId: courseId.get("CSC 305")!, studentId: pick([regNoOf({ level: 500, dept: "CSC", num: 3 }, year)])[0], result: "expired", daysAgo: 1, minute: 9 });
  history.push({ courseId: courseId.get("CSC 201")!, studentId: pick([regNoOf({ level: 200, dept: "CSC", num: 102 }, year)])[0], result: "in_class", daysAgo: 3, minute: 4 });
  history.push({ courseId: courseId.get("CSC 201")!, studentId: pick([regNoOf({ level: 300, dept: "MCB", num: 404 }, year)])[0], result: "other_department", daysAgo: 3, minute: 7 });
  await database.insert(scans).values(
    history.map((h) => ({ lecturerId, courseId: h.courseId, studentId: h.studentId, result: h.result, scannedAt: new Date(now.getTime() - h.daysAgo * 86_400_000 - 3_600_000 + h.minute * 60_000) })),
  );

  return { students: studentRows.length, lecturers: lecturerRows.length, courses: courseRows.length, enrollments: enrollRows.length, scans: history.length };
}
