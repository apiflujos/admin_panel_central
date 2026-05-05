import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, clearSession } from "../../../../../../src/services/auth.service";

function resolveAdminWebOrigin(request: NextRequest) {
  const explicit = String(process.env.ADMIN_WEB_URL || "").trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const session = request.cookies.get(AUTH_COOKIE_NAME);
  if (session?.value) {
    await clearSession(session.value);
  }

  const response = NextResponse.redirect(new URL("/auth/login", resolveAdminWebOrigin(request)));
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
