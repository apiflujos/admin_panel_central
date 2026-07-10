import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, authenticateUser } from "../../../../../../src/services/auth.service";

type BodyValue = string | File | null;

function parseBooleanLike(value: BodyValue, fallback = false) {
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

async function parseLoginBody(request: NextRequest): Promise<{
  email: string;
  password: string;
  remember: boolean;
}> {
  const contentType = request.headers.get("content-type") || "";
  let email = "";
  let password = "";
  let remember = false;

  try {
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as Record<string, unknown>;
      email = String(json.email || "").trim();
      password = String(json.password || "");
      remember = parseBooleanLike(json.remember as BodyValue, false);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      email = String(params.get("email") || "").trim();
      password = String(params.get("password") || "");
      remember = parseBooleanLike(params.get("remember"), false);
    } else {
      // Fallback to formData for multipart/form-data.
      const formData = await request.formData();
      email = String(formData.get("email") || "").trim();
      password = String(formData.get("password") || "");
      remember = parseBooleanLike(formData.get("remember"), false);
    }
  } catch (error) {
    console.error("[session/login] failed to parse request body:", error);
  }

  return { email, password, remember };
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, remember } = await parseLoginBody(request);

    console.log("[session/login] received email=", email, "password_len=", password.length, "remember=", remember);

    if (!email || !password) {
      console.warn("[session/login] missing email or password");
      return NextResponse.redirect(new URL("/auth/login?error=missing", resolveAdminWebOrigin(request)), 303);
    }

    const result = await authenticateUser(email, password, remember);
    console.log("[session/login] authenticateUser result=", result ? "ok" : "null");
    if (!result) {
      console.warn("[session/login] authentication failed for", email);
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
    console.log("[session/login] cookie set, redirecting to /");
    return response;
  } catch (error) {
    console.error("[session/login] unexpected error:", error);
    return NextResponse.redirect(new URL("/auth/login?error=exception", resolveAdminWebOrigin(request)), 303);
  }
}
