import { cookies } from "next/headers";

import { getSessionUser } from "../../../src/services/auth.service";

export type RouteUser = {
  id: number;
  email: string;
  role: string;
  is_super_admin?: boolean;
  name?: string | null;
  organization_id?: unknown;
  phone?: unknown;
  photo_base64?: unknown;
};

export class RouteAuthError extends Error {
  constructor(
    public readonly status: 401 | 403,
    message: string
  ) {
    super(message);
    this.name = "RouteAuthError";
  }
}

async function readSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("os_session")?.value ?? null;
}

export async function getRouteUser(): Promise<RouteUser | null> {
  const token = await readSessionToken();
  if (!token) return null;
  return (await getSessionUser(token)) as RouteUser | null;
}

export async function requireRouteUser(): Promise<RouteUser> {
  const user = await getRouteUser();
  if (!user) throw new RouteAuthError(401, "unauthorized");
  return user;
}

export async function requireRouteAdmin(): Promise<RouteUser> {
  const user = await requireRouteUser();
  const role = String(user.role || "");
  if (role !== "admin" && role !== "super_admin") {
    throw new RouteAuthError(403, "forbidden");
  }
  return user;
}

export async function requireRouteSuperAdmin(): Promise<RouteUser> {
  const user = await requireRouteUser();
  const role = String(user.role || "");
  if (role !== "super_admin" || !user.is_super_admin) {
    throw new RouteAuthError(403, "forbidden");
  }
  return user;
}
