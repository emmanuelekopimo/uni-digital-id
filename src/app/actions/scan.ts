"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { verifyScan } from "@/lib/queries";
import { getSession } from "@/lib/session";
import { campusDay, now } from "@/lib/today";
import { avatarUri } from "@/lib/avatar";
import { fullName } from "@/lib/verify";
import { fmtDate } from "@/lib/format";
import type { Verdict } from "@/lib/verify";

const scanSchema = z.object({
  courseId: z.coerce.number().int().positive("Pick a course"),
  input: z.string().trim().min(3, "Scan a card, paste the code or type a registration number like UU/23/CSC/045").max(400, "That code is too long"),
});

export type ScanResponse =
  | { ok: false; error: string; field?: "input" | "courseId" }
  | {
      ok: true;
      input: string;
      method: "qr" | "regno";
      course: string;
      verdict: Verdict;
      student: null | { name: string; regNo: string; department: string; faculty: string; level: number; photo: string; expires: string };
    };

export async function verifyAction(courseId: number, input: string): Promise<ScanResponse> {
  const s = await getSession();
  if (!s || s.role !== "lecturer") return { ok: false, error: "Sign in as a lecturer to verify students" };
  const parsed = scanSchema.safeParse({ courseId, input });
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: i.message, field: i.path[0] as "input" | "courseId" };
  }
  const r = await verifyScan(db(), s.userId, parsed.data.courseId, parsed.data.input, campusDay(now()));
  if (!r) return { ok: false, error: "You do not teach that course", field: "courseId" };
  revalidatePath("/", "layout");
  return {
    ok: true,
    input: parsed.data.input,
    method: r.method,
    course: `${r.course.code} ${r.course.title}`,
    verdict: r.verdict,
    student: r.student && {
      name: fullName(r.student),
      regNo: r.student.regNo,
      department: r.student.department,
      faculty: r.student.faculty,
      level: r.student.level,
      photo: avatarUri(r.student.regNo, r.student.gender),
      expires: fmtDate(r.student.idExpiresOn),
    },
  };
}
