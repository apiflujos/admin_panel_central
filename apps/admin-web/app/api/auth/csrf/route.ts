import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "../../../../../../src/services/auth.service";
import { createCsrfToken } from "../../../../../../src/utils/csrf";
import { routeHandler } from "../../../../lib/route-handler";

export const GET = routeHandler(async (req: Request) => {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const cookieHeader = req.headers.get("cookie") || "";
  const parts = cookieHeader.split(";").map((part) => part.trim());
  let token = "";
  for (const part of parts) {
    if (!part) continue;
    const [key, ...valueParts] = part.split("=");
    if (key === AUTH_COOKIE_NAME) {
      token = decodeURIComponent(valueParts.join("="));
      break;
    }
  }
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers });
  }
  const csrf = createCsrfToken(token);
  if (!csrf && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "csrf_unavailable" }, { status: 500, headers });
  }
  return NextResponse.json({ ok: true, token: csrf || "" }, { headers });
});
