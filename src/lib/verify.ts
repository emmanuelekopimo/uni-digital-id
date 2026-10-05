import type { ScanResult } from "@/db/schema";
import { daysBetween } from "./today";

export type StudentLike = {
  regNo: string;
  department: string;
  status: "active" | "suspended" | "graduated";
  idExpiresOn: string;
  cardVersion: number;
};
export type CourseLike = { code: string; department: string };

export type Verdict = {
  result: ScanResult;
  tone: "green" | "amber" | "red";
  headline: string;
  detail: string;
  /** True when the person is a known UniUyo student, whatever the class outcome. */
  isUniuyo: boolean;
};

/**
 * Decide what the lecturer sees after a scan. Order matters: a forged or unknown card is
 * rejected first, then card problems (replaced, suspended, expired), then class membership.
 */
export function verifyForCourse(input: {
  token: { ok: true; cardVersion: number } | { ok: false };
  student: StudentLike | null;
  course: CourseLike;
  enrolled: boolean;
  today: string;
}): Verdict {
  const { token, student, course, enrolled, today } = input;
  if (!token.ok) return { result: "invalid", tone: "red", headline: "Not a UniUyo ID", detail: "This QR code was not issued by the university ID system.", isUniuyo: false };
  if (!student) return { result: "unknown", tone: "red", headline: "Student not found", detail: "The card is signed but the registration number is not in the student register.", isUniuyo: false };
  if (token.cardVersion !== student.cardVersion)
    return { result: "revoked", tone: "red", headline: "Old card", detail: "This card was replaced. Ask the student to show their current ID.", isUniuyo: true };
  if (student.status === "suspended") return { result: "suspended", tone: "red", headline: "Student suspended", detail: "The register shows this student as suspended.", isUniuyo: true };
  if (student.status === "graduated" || daysBetween(student.idExpiresOn, today) > 0)
    return { result: "expired", tone: "amber", headline: "ID card expired", detail: `The card expired on ${student.idExpiresOn}. The student should renew it at the ICT Centre.`, isUniuyo: true };
  if (enrolled) return { result: "in_class", tone: "green", headline: `Belongs to ${course.code}`, detail: `Registered for ${course.code} this semester.`, isUniuyo: true };
  if (student.department === course.department)
    return { result: "same_department", tone: "amber", headline: `Not registered for ${course.code}`, detail: `UniUyo student in ${student.department}, but not on the ${course.code} class list.`, isUniuyo: true };
  return { result: "other_department", tone: "amber", headline: "UniUyo student, not in this class", detail: `Department of ${student.department}. Not on the ${course.code} class list.`, isUniuyo: true };
}

/** Days until the card expires (negative when expired). */
export function daysToExpiry(idExpiresOn: string, today: string) {
  return daysBetween(today, idExpiresOn);
}

export function cardState(s: StudentLike, today: string): "valid" | "expiring" | "expired" | "suspended" {
  if (s.status === "suspended") return "suspended";
  const d = daysToExpiry(s.idExpiresOn, today);
  if (d < 0 || s.status === "graduated") return "expired";
  if (d <= 30) return "expiring";
  return "valid";
}

export function fullName(s: { firstName: string; lastName: string; otherName?: string | null }) {
  return [s.lastName.toUpperCase(), s.firstName, s.otherName].filter(Boolean).join(" ");
}

/** Normalise a typed registration number: upper case, single slashes, no spaces. */
export function normaliseRegNo(v: string) {
  return v.toUpperCase().replace(/\s+/g, "").replace(/\\/g, "/").replace(/\/+/g, "/");
}

export const REG_NO_RE = /^UU\/\d{2}\/[A-Z]{3}\/\d{3}$/;
