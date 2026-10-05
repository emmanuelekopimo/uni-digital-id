import type { ScanResult } from "@/db/schema";

export type Tone = "ok" | "warn" | "bad";

/** How each result looks at the checkpoint: a short instruction, colour and log label. */
export const RESULT_UI: Record<ScanResult, { big: string; tone: Tone; label: string; color: string }> = {
  in_class: { big: "ADMIT", tone: "ok", label: "In class", color: "#12805c" },
  same_department: { big: "NOT REGISTERED", tone: "warn", label: "Not registered", color: "#c27a0e" },
  other_department: { big: "NOT IN THIS CLASS", tone: "warn", label: "Other department", color: "#c27a0e" },
  expired: { big: "CARD EXPIRED", tone: "warn", label: "Expired card", color: "#c27a0e" },
  suspended: { big: "REJECT", tone: "bad", label: "Suspended", color: "#c0352b" },
  revoked: { big: "REJECT", tone: "bad", label: "Old card", color: "#c0352b" },
  unknown: { big: "REJECT", tone: "bad", label: "Not in register", color: "#c0352b" },
  invalid: { big: "REJECT", tone: "bad", label: "Forged or invalid", color: "#c0352b" },
};

export type CheckState = "pass" | "fail" | "warn" | "skip";

/** The three checks behind a verdict, for the checklist under the result. */
export function checklist(result: ScanResult, method: "qr" | "regno"): { label: string; state: CheckState; note: string }[] {
  const sig: CheckState = method === "regno" ? "skip" : result === "invalid" ? "fail" : "pass";
  const reg: CheckState =
    result === "invalid" ? "skip" : result === "unknown" || result === "suspended" || result === "revoked" ? "fail" : result === "expired" ? "warn" : "pass";
  const cls: CheckState = ["invalid", "unknown", "suspended", "revoked"].includes(result) ? "skip" : result === "in_class" ? "pass" : "warn";
  return [
    { label: "Card is genuine", state: sig, note: sig === "skip" ? "No card scanned, typed reg. number" : sig === "pass" ? "QR signature matches" : "Signature does not match" },
    {
      label: "Student in good standing",
      state: reg,
      note: { pass: "Active, card current", fail: result === "unknown" ? "Not in the register" : result === "revoked" ? "Card was replaced" : "Suspended", warn: "Card has expired", skip: "Not checked" }[reg],
    },
    { label: "Registered for this course", state: cls, note: cls === "pass" ? "On the class list" : cls === "warn" ? "Not on the class list" : "Not checked" },
  ];
}
