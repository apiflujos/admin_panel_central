import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware for the admin-web.
 *
 * Responsibility: ensure the visitor has a session cookie before serving any
 * protected page. The actual token validation happens in Server Components via
 * `requireServerSessionProfile()`, which queries Postgres directly. Doing a
 * network fetch here was redundant and opened a "fail-open" window when the
 * auth check timed out.
 */
export function middleware(request: NextRequest) {
  const session = request.cookies.get("os_session");
  if (!session?.value) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except auth pages, API routes, Next.js static assets
    // and the favicon.
    "/((?!auth/|api/|_next/static|_next/image|favicon).*)",
  ],
};
