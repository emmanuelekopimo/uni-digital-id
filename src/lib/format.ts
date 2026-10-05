import { CAMPUS_TZ } from "./today";

export const fmtDate = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
export const fmtTime = (d: Date) => new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: CAMPUS_TZ }).format(d);
export const fmtStamp = (d: Date) =>
  new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: CAMPUS_TZ }).format(d);
