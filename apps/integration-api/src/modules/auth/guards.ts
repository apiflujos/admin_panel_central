import type { NextFunction, Request, Response } from "express";

import { getSessionUser } from "../../../../../src/services/auth.service";
import { createCsrfToken, verifyCsrfToken } from "../../../../../src/utils/csrf";
import { getAuthToken } from "./handlers/core-auth";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getAuthToken(req);
  const user = await getSessionUser(token);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  req.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
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
  const user = req.user;
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
    if (process.env.NODE_ENV === "production") {
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
