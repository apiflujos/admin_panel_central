import type { Request, Response } from "express";

import { createTempToken } from "../../../../../../src/services/auth.service";

export async function createAuthTokenHandler(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const rawMinutes = req.body?.ttlMinutes;
  const rawNumber = Number(rawMinutes);
  const wantsNever = rawMinutes === "never" || rawMinutes === "0" || rawMinutes === 0 || rawNumber === 0;
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
