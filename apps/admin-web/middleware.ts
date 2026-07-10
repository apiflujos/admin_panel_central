import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("os_session");
  if (!session?.value) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Validate the session with the backend so an invalid/stale cookie never
  // reaches a protected page and flashes the logged-in shell.
  try {
    const authUrl = new URL("/api/auth/me", request.nextUrl.origin);
    const authRes = await fetch(authUrl, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    });
    if (!authRes.ok) {
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // If the auth check itself fails, still allow the request through and let
    // the page handle it gracefully rather than hard-locking the user.
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!auth/|api/|_next/static|_next/image|favicon).*)",
  ],
};
