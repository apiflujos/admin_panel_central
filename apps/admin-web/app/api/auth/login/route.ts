import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, authenticateUser } from "../../../../../../src/services/auth.service";
import { getSuperAdminEmail } from "../../../../../../src/sa/sa.bootstrap";
import { routeHandler } from "../../../../lib/route-handler";

function parseBooleanLike(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (["1", "true", "yes", "on", "si", "sí"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

export const POST = routeHandler(async (req: Request) => {
  const body = (await req.json()) as Record<string, unknown>;
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const remember = parseBooleanLike(body.remember, false);
  const normalizedEmail = email.trim().toLowerCase();
  const superAdminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const superAdminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
  if (!superAdminEmail || !superAdminPassword) {
    return new NextResponse("Missing ADMIN_EMAIL or ADMIN_PASSWORD", { status: 500 });
  }
  const isSuperAdminAttempt = normalizedEmail === getSuperAdminEmail();
  try {
    const result = await authenticateUser(email, password, remember);
    if (!result) {
      return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
    }
    const response = NextResponse.json({
      ok: true,
      user: {
        id: result.user.id,
        organizationId: result.user.organization_id,
        email: result.user.email,
        role: result.user.role,
        isSuperAdmin: Boolean(result.user.is_super_admin),
        name: result.user.name,
        phone: result.user.phone,
        photoBase64: result.user.photo_base64,
      },
    });
    response.cookies.set(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(result.maxAgeMs / 1000),
    });
    return response;
  } catch (error) {
    console.error("[auth] login failed:", error);
    const rawMessage = error instanceof Error ? error.message : "";
    const lower = rawMessage.toLowerCase();
    const code =
      lower.includes("database_url is required") || lower.includes("database_url")
        ? "AUTH_DB_MISSING"
        : lower.includes("permission denied")
          ? "AUTH_DB_PERMS"
          : lower.includes("connect econnrefused") || lower.includes("econnrefused")
            ? "AUTH_DB_REFUSED"
            : lower.includes("getaddrinfo enotfound") || lower.includes("enotfound")
              ? "AUTH_DB_DNS"
              : lower.includes("password authentication failed")
                ? "AUTH_DB_AUTH"
                : lower.includes("no pg_hba.conf entry")
                  ? "AUTH_DB_HBA"
                  : lower.includes("self signed certificate") || lower.includes("certificate")
                    ? "AUTH_DB_SSL"
                    : lower.includes("does not exist") && (lower.includes("relation") || lower.includes("column"))
                      ? "AUTH_DB_SCHEMA"
                      : "AUTH_LOGIN_FAILED";

    const isProd = process.env.NODE_ENV === "production";
    const message =
      isProd && !isSuperAdminAttempt
        ? `No se pudo iniciar sesion. (${code})`
        : rawMessage
          ? rawMessage
          : `No se pudo iniciar sesion. (${code})`;
    return new NextResponse(message, { status: 500 });
  }
});
