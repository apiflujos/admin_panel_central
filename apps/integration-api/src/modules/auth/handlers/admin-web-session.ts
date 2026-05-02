import type { Request, Response } from "express";

import { toAuthSessionDto } from "../../../../../../packages/domain/src/auth";

export async function getAdminWebSessionHandler(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  res.status(200).json(toAuthSessionDto(req.user));
}
