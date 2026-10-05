import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type SessionPayload } from "./auth";

export async function createSession(p: SessionPayload) {
  const token = await signSession(p);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Load the signed-in user from the database, or redirect to the login page. */
export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  const [u] = await db().select().from(users).where(eq(users.id, s.userId));
  if (!u) redirect("/login");
  return u;
}

export async function requireRole(role: "student" | "lecturer") {
  const u = await requireUser();
  if (u.role !== role) redirect(u.role === "lecturer" ? "/scan" : "/card");
  return u;
}
