import type { Request, Response } from "express";

import {
  AUTH_COOKIE_NAME,
  authenticateUser,
  clearSession,
  updatePassword,
  getSessionUser,
} from "../../../../../../src/services/auth.service";
import { getSuperAdminEmail } from "../../../../../../src/sa/sa.bootstrap";
import { createCsrfToken } from "../../../../../../src/utils/csrf";

export function parseBooleanLike(value: unknown, fallback = false) {
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

export function getCookie(req: Request, name: string) {
  const header = req.headers.cookie || "";
  const parts = header.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (!part) continue;
    const [key, ...valueParts] = part.split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }
  return null;
}

export function getAuthToken(req: Request) {
  const auth = String(req.headers.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  return getCookie(req, AUTH_COOKIE_NAME);
}

export async function authMe(req: Request, res: Response) {
  const user = await getSessionUser(getAuthToken(req));
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({
    ok: true,
    user: {
      id: user.id,
      organizationId: user.organization_id,
      email: user.email,
      role: user.role,
      isSuperAdmin: Boolean(user.is_super_admin),
      name: user.name,
      phone: user.phone,
      photoBase64: user.photo_base64,
    },
  });
}

export async function loginHandler(req: Request, res: Response) {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  const remember = parseBooleanLike(req.body?.remember, false);
  const normalizedEmail = email.trim().toLowerCase();
  const superAdminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const superAdminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
  if (!superAdminEmail || !superAdminPassword) {
    res.status(500).send("Missing ADMIN_EMAIL or ADMIN_PASSWORD");
    return;
  }
  const isSuperAdminAttempt = normalizedEmail === getSuperAdminEmail();
  try {
    const result = await authenticateUser(email, password, remember);
    if (!result) {
      res.status(401).json({ error: "Credenciales invalidas" });
      return;
    }
    res.cookie(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: result.maxAgeMs,
    });
    res.json({
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
    res.status(500).send(message);
  }
}

export async function logoutHandler(req: Request, res: Response) {
  const token = getAuthToken(req);
  if (token) {
    await clearSession(token);
  }
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
}

export async function changePasswordHandler(req: Request, res: Response) {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Datos incompletos" });
    return;
  }
  const sessionUser = await getSessionUser(getAuthToken(req));
  if (!sessionUser) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const result = await updatePassword(sessionUser.id, currentPassword, newPassword);
    if (!result.ok) {
      res.status(400).json({ error: result.message || "No se pudo actualizar" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function csrfTokenHandler(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const csrf = createCsrfToken(token);
  if (!csrf) {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      res.status(500).json({ error: "csrf_unavailable" });
      return;
    }
  }
  res.json({ ok: true, token: csrf || "" });
}
