import { describe, expect, it } from "vitest";
import { cardState, daysToExpiry, fullName, normaliseRegNo, verifyForCourse, REG_NO_RE, type StudentLike } from "@/lib/verify";
import { addDays, campusDay, daysBetween, resolveNow } from "@/lib/today";
import { signSession, verifySession } from "@/lib/auth";

const today = "2026-10-05";
const cs: StudentLike = { regNo: "UU/23/CSC/045", department: "Computer Science", status: "active", idExpiresOn: "2027-04-23", cardVersion: 1 };
const course = { code: "CSC 311", department: "Computer Science" };
const run = (o: Partial<Parameters<typeof verifyForCourse>[0]>) =>
  verifyForCourse({ token: { ok: true, cardVersion: 1 }, student: cs, course, enrolled: true, today, ...o });

describe("verifyForCourse", () => {
  it("green when registered for the course", () => expect(run({})).toMatchObject({ result: "in_class", tone: "green", headline: "Belongs to CSC 311", isUniuyo: true }));
  it("amber for a same-department student not on the list", () => expect(run({ enrolled: false })).toMatchObject({ result: "same_department", tone: "amber" }));
  it("amber for a UniUyo student from another department", () => {
    const v = run({ enrolled: false, student: { ...cs, department: "Law" } });
    expect(v).toMatchObject({ result: "other_department", tone: "amber", headline: "UniUyo student, not in this class", isUniuyo: true });
    expect(v.detail).toContain("Law");
  });
  it("red for forged codes and unknown students", () => {
    expect(run({ token: { ok: false } })).toMatchObject({ result: "invalid", tone: "red", isUniuyo: false });
    expect(run({ student: null })).toMatchObject({ result: "unknown", tone: "red", isUniuyo: false });
  });
  it("red for replaced cards even if enrolled", () => expect(run({ token: { ok: true, cardVersion: 1 }, student: { ...cs, cardVersion: 2 } }).result).toBe("revoked"));
  it("red for suspended students before checking enrolment", () => expect(run({ student: { ...cs, status: "suspended" } }).result).toBe("suspended"));
  it("amber for expired or graduated cards", () => {
    expect(run({ student: { ...cs, idExpiresOn: "2026-10-04" } }).result).toBe("expired");
    expect(run({ student: { ...cs, idExpiresOn: "2026-10-05" } }).result).toBe("in_class");
    expect(run({ student: { ...cs, status: "graduated" } }).result).toBe("expired");
  });
});

describe("card state", () => {
  it("valid, expiring within 30 days, expired, suspended", () => {
    expect(cardState(cs, today)).toBe("valid");
    expect(cardState({ ...cs, idExpiresOn: addDays(today, 20) }, today)).toBe("expiring");
    expect(cardState({ ...cs, idExpiresOn: addDays(today, -1) }, today)).toBe("expired");
    expect(cardState({ ...cs, status: "suspended" }, today)).toBe("suspended");
    expect(daysToExpiry(addDays(today, 20), today)).toBe(20);
  });
});

describe("helpers", () => {
  it("normalises typed reg numbers", () => {
    expect(normaliseRegNo(" uu/23/csc/045 ")).toBe("UU/23/CSC/045");
    expect(normaliseRegNo("UU\\23\\CSC\\045")).toBe("UU/23/CSC/045");
    expect(REG_NO_RE.test(normaliseRegNo("uu//23/csc/045"))).toBe(true);
    expect(REG_NO_RE.test("UU/23/CS/045")).toBe(false);
  });
  it("formats names surname first", () => expect(fullName({ firstName: "Ubong", lastName: "Akpan", otherName: "Daniel" })).toBe("AKPAN Ubong Daniel"));
  it("supports UNIID_TODAY and campus dates", () => {
    expect(resolveNow("2026-10-05").toISOString()).toBe("2026-10-05T09:00:00.000Z");
    expect(campusDay(new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06");
    expect(daysBetween("2026-10-01", "2026-10-05")).toBe(4);
  });
  it("signs sessions with roles", async () => {
    const t = await signSession({ userId: 1, role: "lecturer", name: "Dr" });
    expect((await verifySession(t))?.role).toBe("lecturer");
    expect(await verifySession(t.slice(0, -2) + "xx")).toBeNull();
  });
});
