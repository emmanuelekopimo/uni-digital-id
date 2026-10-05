import { describe, expect, it } from "vitest";
import { extractToken, makeIdToken, readIdToken, verifyUrl } from "@/lib/idtoken";

describe("ID QR tokens", () => {
  const t = makeIdToken("UU/23/CSC/045", 1);
  it("has a readable, compact format", () => expect(t).toMatch(/^UU1\.[A-Za-z0-9_-]+\.1\.[A-Za-z0-9_-]{22}$/));
  it("round-trips the reg number and card version", () => expect(readIdToken(t)).toEqual({ ok: true, regNo: "UU/23/CSC/045", cardVersion: 1 }));
  it("rejects a changed reg number", () => {
    const parts = t.split(".");
    parts[1] = Buffer.from("UU/23/CSC/046").toString("base64url");
    expect(readIdToken(parts.join("."))).toEqual({ ok: false, reason: "signature" });
  });
  it("rejects a bumped card version", () => expect(readIdToken(t.replace(".1.", ".2.")).ok).toBe(false));
  it("rejects tokens signed with another key", () => expect(readIdToken(makeIdToken("UU/23/CSC/045", 1, "some-other-secret-value"))).toEqual({ ok: false, reason: "signature" }));
  it("rejects junk", () => {
    expect(readIdToken("hello")).toEqual({ ok: false, reason: "format" });
    expect(readIdToken("UU1.abc.x.def")).toEqual({ ok: false, reason: "format" });
  });
  it("reads the token out of the verify URL in the QR code", () => {
    const url = verifyUrl("https://id.example.com/", t);
    expect(url).toBe(`https://id.example.com/verify/${t}`);
    expect(extractToken(url)).toBe(t);
    expect(readIdToken(`  ${url}  `).ok).toBe(true);
  });
});
