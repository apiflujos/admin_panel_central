import type { NextFunction, Request, Response } from "express";
import { AUTH_COOKIE_NAME, getSessionUser } from "../services/auth.service";

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

export async function requirePageSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getAuthToken(req);
  const user = await getSessionUser(token);
  const ok = user && user.role === "super_admin" && user.is_super_admin;
  if (!ok) {
    res.status(302).setHeader("Location", "/login.html");
    res.end();
    return;
  }
  (req as { user?: typeof user }).user = user;
  next();
}
