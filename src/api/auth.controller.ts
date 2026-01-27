import type { Request, Response } from "express";
import {
  AUTH_COOKIE_NAME,
  authenticateUser,
  clearSession,
  isValidSession,
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

export function authMe(_req: Request, res: Response) {
  res.json({ ok: true });
}

export async function loginHandler(req: Request, res: Response) {
  const email = String(req.body?.email || "").trim();
  const password = String(req.body?.password || "");
  const remember = Boolean(req.body?.remember);
  const token = await authenticateUser(email, password);
  if (!token) {
    res.status(401).json({ error: "Credenciales invalidas" });
    return;
  }
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: remember ? 1000 * 60 * 60 * 24 * 30 : undefined,
  });
  res.json({ ok: true });
}

export function logoutHandler(req: Request, res: Response) {
  const token = getCookie(req, AUTH_COOKIE_NAME);
  if (token) {
    clearSession();
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
  try {
    const result = await updatePassword(currentPassword, newPassword);
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
  const token = getCookie(req, AUTH_COOKIE_NAME);
  if (!isValidSession(token)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

export function isAuthenticatedRequest(req: Request) {
  const token = getCookie(req, AUTH_COOKIE_NAME);
  return isValidSession(token);
}
