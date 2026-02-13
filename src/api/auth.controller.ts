import type { NextFunction, Request, Response } from "express";
import {
  AUTH_COOKIE_NAME,
  authenticateUser,
  clearSession,
  createTempToken,
  getSessionUser,
  updatePassword,
} from "../services/auth.service";
import { getSuperAdminEmail } from "../sa/sa.bootstrap";
import { createCsrfToken, verifyCsrfToken } from "../utils/csrf";

function getCookie(req: Request, name: string) {
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

function getAuthToken(req: Request) {
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
      organizationId: (user as any).organization_id,
      email: user.email,
      role: user.role,
      isSuperAdmin: Boolean((user as any).is_super_admin),
      name: user.name,
      phone: user.phone,
      photoBase64: user.photo_base64,
    },
  });
}

export async function loginHandler(req: Request, res: Response) {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  const remember = Boolean(req.body?.remember);
  const normalizedEmail = email.trim().toLowerCase();
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
        organizationId: (result.user as any).organization_id,
        email: result.user.email,
        role: result.user.role,
        isSuperAdmin: Boolean((result.user as any).is_super_admin),
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
      lower.includes("database_url is required") || lower.includes("database_url") ? "AUTH_DB_MISSING" : //
      lower.includes("permission denied") ? "AUTH_DB_PERMS" : //
      lower.includes("connect econnrefused") || lower.includes("econnrefused") ? "AUTH_DB_REFUSED" : //
      lower.includes("getaddrinfo enotfound") || lower.includes("enotfound") ? "AUTH_DB_DNS" : //
      lower.includes("password authentication failed") ? "AUTH_DB_AUTH" : //
      lower.includes("no pg_hba.conf entry") ? "AUTH_DB_HBA" : //
      lower.includes("self signed certificate") || lower.includes("certificate") ? "AUTH_DB_SSL" : //
      lower.includes("does not exist") && (lower.includes("relation") || lower.includes("column")) ? "AUTH_DB_SCHEMA" : //
      "AUTH_LOGIN_FAILED";

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

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getAuthToken(req);
  const user = await getSessionUser(token);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  (req as { user?: typeof user }).user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as { user?: { role?: string } }).user;
  if (!user) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const role = String(user.role || "");
  if (role !== "admin" && role !== "super_admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as { user?: { role?: string; email?: string; is_super_admin?: boolean } }).user as any;
  if (!user) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const role = String(user.role || "");
  if (role !== "super_admin" || !user.is_super_admin) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}

export async function isAuthenticatedRequest(req: Request) {
  const token = getAuthToken(req);
  const user = await getSessionUser(token);
  return Boolean(user);
}

export async function createAuthTokenHandler(req: Request, res: Response) {
  const user = (req as { user?: { id: number; role?: string } }).user;
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const rawMinutes = req.body?.ttlMinutes;
  const rawNumber = Number(rawMinutes);
  const wantsNever =
    rawMinutes === "never" ||
    rawMinutes === "0" ||
    rawMinutes === 0 ||
    rawNumber === 0;
  const ttlMinutes = Number.isFinite(rawNumber) ? rawNumber : 30;
  const clamped = wantsNever ? null : Math.min(120, Math.max(5, Math.round(ttlMinutes)));
  const scopes =
    Array.isArray(req.body?.scopes) && req.body.scopes.length
      ? req.body.scopes.map((scope: unknown) => String(scope || "").trim()).filter(Boolean)
      : ["general"];
  const result = await createTempToken(user.id, clamped);
  res.json({
    ok: true,
    token: result.token,
    expiresAt: result.expiresAt,
    ttlMinutes: clamped ?? null,
    scopes,
  });
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    next();
    return;
  }
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const expected = createCsrfToken(token);
  if (!expected) {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd) {
      res.status(500).json({ error: "csrf_unavailable" });
      return;
    }
    next();
    return;
  }
  const header = String(req.headers["x-csrf-token"] || "");
  if (!verifyCsrfToken(token, header)) {
    res.status(403).json({ error: "csrf_invalid" });
    return;
  }
  next();
}
