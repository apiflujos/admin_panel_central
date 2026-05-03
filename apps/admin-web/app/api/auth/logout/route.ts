import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, clearSession } from "../../../../../../src/services/auth.service";
import { routeHandler } from "../../../../lib/route-handler";

function getCookie(req: Request, name: string) {
  const header = req.headers.get("cookie") || "";
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

export const POST = routeHandler(async (req: Request) => {
  const token = getCookie(req, AUTH_COOKIE_NAME);
  if (token) {
    await clearSession(token);
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
});
