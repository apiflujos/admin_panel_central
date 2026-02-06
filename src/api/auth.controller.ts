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
    const message =
      process.env.NODE_ENV === "production"
        ? "No se pudo iniciar sesion."
        : error instanceof Error
          ? error.message
          : "No se pudo iniciar sesion.";
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
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as { user?: { role?: string; email?: string; is_super_admin?: boolean } }).user as any;
  const requiredEmail = getSuperAdminEmail();
  const email = String(user?.email || "").trim().toLowerCase();
  const ok = Boolean(user) && user.role === "super_admin" && Boolean(user.is_super_admin) && email === requiredEmail;
  if (!ok) {
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
  if (user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const rawMinutes = Number(req.body?.ttlMinutes);
  const ttlMinutes = Number.isFinite(rawMinutes) ? rawMinutes : 30;
  const clamped = Math.min(120, Math.max(5, Math.round(ttlMinutes)));
  const result = await createTempToken(user.id, clamped);
  res.json({
    ok: true,
    token: result.token,
    expiresAt: result.expiresAt,
    ttlMinutes: clamped,
  });
}
