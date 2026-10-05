import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const ROLES = ["student", "lecturer"] as const;
export type Role = (typeof ROLES)[number];

export const SESSION_COOKIE = "uniid_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = { userId: number; role: Role; name: string };

function key(secret = process.env.SESSION_SECRET) {
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET must be set (16+ characters)");
  return new TextEncoder().encode(secret);
}

export async function signSession(p: SessionPayload, secret?: string): Promise<string> {
  return new SignJWT({ role: p.role, name: p.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(p.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key(secret));
}

export async function verifySession(token: string | undefined, secret?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    const userId = Number(payload.sub);
    const role = payload.role;
    if (!Number.isInteger(userId) || (!ROLES.includes(role as Role))) return null;
    return { userId, role: role as Role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
