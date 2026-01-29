import type { Request, Response } from "express";
import {
  AUTH_COOKIE_NAME,
  authenticateUser,
  clearSession,
  getSessionUser,
  updatePassword,
} from "../services/auth.service";

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

export async function authMe(req: Request, res: Response) {
  const user = await getSessionUser(getCookie(req, AUTH_COOKIE_NAME));
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
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
  const result = await authenticateUser(email, password, remember);
  if (!result) {
    res.status(401).json({ error: "Credenciales invalidas" });
    return;
  }
  res.cookie(AUTH_COOKIE_NAME, result.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: result.maxAgeMs,
  });
  res.json({
    ok: true,
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      name: result.user.name,
      phone: result.user.phone,
      photoBase64: result.user.photo_base64,
    },
  });
}

export async function logoutHandler(req: Request, res: Response) {
  const token = getCookie(req, AUTH_COOKIE_NAME);
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
  const sessionUser = await getSessionUser(getCookie(req, AUTH_COOKIE_NAME));
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

export function authMiddleware(req: Request, res: Response, next: () => void) {
  void (async () => {
    const token = getCookie(req, AUTH_COOKIE_NAME);
    const user = await getSessionUser(token);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    (req as { user?: typeof user }).user = user;
    next();
  })();
}

export function requireAdmin(req: Request, res: Response, next: () => void) {
  const user = (req as { user?: { role?: string } }).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  next();
}

export async function isAuthenticatedRequest(req: Request) {
  const token = getCookie(req, AUTH_COOKIE_NAME);
  const user = await getSessionUser(token);
  return Boolean(user);
}
