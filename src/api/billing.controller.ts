import type { Request, Response } from "express";
import { z } from "zod";
import { getTenantMonthlySummary } from "../sa/sa.admin.service";

const PeriodKey = z.string().regex(/^\d{4}-\d{2}$/);

export async function billingSummaryHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as { organization_id?: number; role?: string } | undefined;
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const orgId = Number(user.organization_id);
    const period = typeof req.query.period === "string" ? req.query.period : "";
    const periodKey = period ? PeriodKey.parse(period) : undefined;
    const summary = await getTenantMonthlySummary(orgId, periodKey);
    res.status(200).json(summary);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "billing_error" });
  }
}

