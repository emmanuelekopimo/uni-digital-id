CREATE TYPE "public"."role" AS ENUM('student', 'lecturer');--> statement-breakpoint
CREATE TYPE "public"."scan_result" AS ENUM('in_class', 'same_department', 'other_department', 'expired', 'suspended', 'revoked', 'unknown', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('active', 'suspended', 'graduated');--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(12) NOT NULL,
	"title" varchar(140) NOT NULL,
	"department" varchar(120) NOT NULL,
	"level" integer NOT NULL,
	"units" integer DEFAULT 3 NOT NULL,
	"venue" varchar(120),
	"lecturer_id" integer NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	CONSTRAINT "enrollments_student_course_unique" UNIQUE("student_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"lecturer_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"student_id" integer,
	"result" "scan_result" NOT NULL,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"reg_no" varchar(24) NOT NULL,
	"first_name" varchar(60) NOT NULL,
	"last_name" varchar(60) NOT NULL,
	"other_name" varchar(60),
	"gender" varchar(1) NOT NULL,
	"faculty" varchar(120) NOT NULL,
	"department" varchar(120) NOT NULL,
	"level" integer NOT NULL,
	"entry_year" integer NOT NULL,
	"status" "student_status" DEFAULT 'active' NOT NULL,
	"id_issued_on" date NOT NULL,
	"id_expires_on" date NOT NULL,
	"card_version" integer DEFAULT 1 NOT NULL,
	"blood_group" varchar(4),
	CONSTRAINT "students_reg_no_unique" UNIQUE("reg_no")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"department" varchar(120),
	"student_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_lecturer_id_users_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_lecturer_id_users_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scans_lecturer_time_idx" ON "scans" USING btree ("lecturer_id","scanned_at");--> statement-breakpoint
CREATE INDEX "scans_course_idx" ON "scans" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "students_department_idx" ON "students" USING btree ("department");