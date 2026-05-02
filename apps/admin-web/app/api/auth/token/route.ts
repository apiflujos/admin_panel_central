import { NextResponse } from "next/server";

import { createTempToken } from "../../../../../../src/services/auth.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../lib/route-auth";

export const POST = routeHandler(async (req: Request) => {
  const user = await requireRouteAdmin();
  const body = (await req.json()) as Record<string, unknown>;
  const rawMinutes = body.ttlMinutes;
  const rawNumber = Number(rawMinutes);
  const wantsNever = rawMinutes === "never" || rawMinutes === "0" || rawMinutes === 0 || rawNumber === 0;
  const ttlMinutes = Number.isFinite(rawNumber) ? rawNumber : 30;
  const clamped = wantsNever ? null : Math.min(120, Math.max(5, Math.round(ttlMinutes)));
  const scopes =
    Array.isArray(body.scopes) && body.scopes.length
      ? body.scopes.map((scope: unknown) => String(scope || "").trim()).filter(Boolean)
      : ["general"];
  const result = await createTempToken(user.id, clamped);
  return NextResponse.json({
    ok: true,
    token: result.token,
    expiresAt: result.expiresAt,
    ttlMinutes: clamped ?? null,
    scopes,
  });
});
