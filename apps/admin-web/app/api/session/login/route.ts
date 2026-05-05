import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, authenticateUser } from "../../../../../../src/services/auth.service";

function parseBooleanLike(value: FormDataEntryValue | null, fallback = false) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on", "si", "sí"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function resolveAdminWebOrigin(request: NextRequest) {
  const explicit = String(process.env.ADMIN_WEB_URL || "").trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const remember = parseBooleanLike(formData.get("remember"), false);

  const result = await authenticateUser(email, password, remember);
  if (!result) {
    return NextResponse.redirect(new URL("/auth/login?error=1", resolveAdminWebOrigin(request)), 303);
  }

  const response = NextResponse.redirect(new URL("/", resolveAdminWebOrigin(request)), 303);
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: result.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(result.maxAgeMs / 1000),
  });
  return response;
}
