import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/** Optimistic route guard. Every page checks the session and role again on the server. */
export async function proxy(req: NextRequest) {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.redirect(new URL("/login", req.url));
  const p = req.nextUrl.pathname;
  if ((p.startsWith("/scan") || p.startsWith("/courses")) && s.role !== "lecturer") return NextResponse.redirect(new URL("/card", req.url));
  if (p.startsWith("/card") && s.role !== "student") return NextResponse.redirect(new URL("/scan", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|verify|api/health|_next|images|logo.svg|icon.svg|favicon.ico).*)"],
};
