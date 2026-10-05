import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * QR payload printed on each ID card:  UU1.<base64url reg no>.<card version>.<signature>
 * The signature is the first 16 bytes of HMAC-SHA256 over the rest, so a QR code cannot be
 * forged or edited without the server secret. Bumping card_version invalidates older cards.
 */
const PREFIX = "UU1";

function secret(s = process.env.SESSION_SECRET) {
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (16+ characters)");
  return `idcard:${s}`;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

function sign(body: string, key: string) {
  return createHmac("sha256", key).update(body).digest().subarray(0, 16).toString("base64url");
}

export function makeIdToken(regNo: string, cardVersion: number, key?: string): string {
  const body = `${PREFIX}.${b64(regNo)}.${cardVersion}`;
  return `${body}.${sign(body, secret(key))}`;
}

export type ParsedToken = { ok: true; regNo: string; cardVersion: number } | { ok: false; reason: "format" | "signature" };

export function readIdToken(raw: string, key?: string): ParsedToken {
  const token = extractToken(raw);
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX || !/^\d+$/.test(parts[2])) return { ok: false, reason: "format" };
  const body = parts.slice(0, 3).join(".");
  const expected = Buffer.from(sign(body, secret(key)));
  const given = Buffer.from(parts[3]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "signature" };
  return { ok: true, regNo: unb64(parts[1]), cardVersion: Number(parts[2]) };
}

/** Accept either the bare token or the full verify URL encoded in the QR code. */
export function extractToken(raw: string): string {
  const t = raw.trim();
  const m = t.match(/\/verify\/([A-Za-z0-9._-]+)\/?$/);
  return m ? m[1] : t;
}

export function verifyUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/verify/${token}`;
}
