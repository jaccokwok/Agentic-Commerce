import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/jwt";

// Route protection for the App Router (Next.js 16's replacement for
// middleware.ts). The proxy only checks that a session cookie exists —
// the token itself is fully verified server-side in /account.

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account"],
};
