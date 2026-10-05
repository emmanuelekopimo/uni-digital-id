import { date, index, integer, pgEnum, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["student", "lecturer"]);
export const studentStatusEnum = pgEnum("student_status", ["active", "suspended", "graduated"]);
export const scanResultEnum = pgEnum("scan_result", ["in_class", "same_department", "other_department", "expired", "suspended", "revoked", "unknown", "invalid"]);

/** The university's existing student register. */
export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    regNo: varchar("reg_no", { length: 24 }).notNull().unique(),
    firstName: varchar("first_name", { length: 60 }).notNull(),
    lastName: varchar("last_name", { length: 60 }).notNull(),
    otherName: varchar("other_name", { length: 60 }),
    gender: varchar("gender", { length: 1 }).notNull(),
    faculty: varchar("faculty", { length: 120 }).notNull(),
    department: varchar("department", { length: 120 }).notNull(),
    level: integer("level").notNull(),
    entryYear: integer("entry_year").notNull(),
    status: studentStatusEnum("status").notNull().default("active"),
    idIssuedOn: date("id_issued_on").notNull(),
    idExpiresOn: date("id_expires_on").notNull(),
    /** Bumped when a card is reissued, which invalidates QR codes on older cards. */
    cardVersion: integer("card_version").notNull().default(1),
    bloodGroup: varchar("blood_group", { length: 4 }),
  },
  (t) => [index("students_department_idx").on(t.department)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  department: varchar("department", { length: 120 }),
  studentId: integer("student_id").references(() => students.id, { onDelete: "cascade" }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 12 }).notNull().unique(),
  title: varchar("title", { length: 140 }).notNull(),
  department: varchar("department", { length: 120 }).notNull(),
  level: integer("level").notNull(),
  units: integer("units").notNull().default(3),
  venue: varchar("venue", { length: 120 }),
  lecturerId: integer("lecturer_id")
    .notNull()
    .references(() => users.id),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
  },
  (t) => [unique("enrollments_student_course_unique").on(t.studentId, t.courseId)],
);

export const scans = pgTable(
  "scans",
  {
    id: serial("id").primaryKey(),
    lecturerId: integer("lecturer_id")
      .notNull()
      .references(() => users.id),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: integer("student_id").references(() => students.id, { onDelete: "set null" }),
    result: scanResultEnum("result").notNull(),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("scans_lecturer_time_idx").on(t.lecturerId, t.scannedAt), index("scans_course_idx").on(t.courseId)],
);

export type Student = typeof students.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type User = typeof users.$inferSelect;
export type ScanResult = (typeof scanResultEnum.enumValues)[number];
