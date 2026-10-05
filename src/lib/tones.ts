import type { ScanResult } from "@/db/schema";

export const TONE: Record<ScanResult, { color: string; label: string; tone: "green" | "amber" | "red" }> = {
  in_class: { color: "#10a37f", label: "In class", tone: "green" },
  same_department: { color: "#d97706", label: "Same department, not registered", tone: "amber" },
  other_department: { color: "#d97706", label: "Other department", tone: "amber" },
  expired: { color: "#d97706", label: "Expired card", tone: "amber" },
  suspended: { color: "#dc2626", label: "Suspended", tone: "red" },
  revoked: { color: "#dc2626", label: "Old card", tone: "red" },
  unknown: { color: "#dc2626", label: "Not in register", tone: "red" },
  invalid: { color: "#dc2626", label: "Invalid code", tone: "red" },
};
