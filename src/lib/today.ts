export const CAMPUS_TZ = "Africa/Lagos";
export const CAMPUS_OFFSET = "+01:00";
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "Now" for business rules. UNIID_TODAY=YYYY-MM-DD freezes the clock at 10:00 Lagos time on that day. */
export function resolveNow(override: string | undefined = process.env.UNIID_TODAY, real: Date = new Date()): Date {
  if (override && DAY_RE.test(override)) return new Date(`${override}T10:00:00${CAMPUS_OFFSET}`);
  return real;
}
export const now = () => resolveNow();

/** YYYY-MM-DD in campus time. */
export function campusDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAMPUS_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Add days to a YYYY-MM-DD string. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
