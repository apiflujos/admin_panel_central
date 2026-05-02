import type { Request, Response } from "express";

import { toAdminWebMarketingOverviewDto } from "../../../../../../packages/domain/src/marketing";
import { getMarketingExecutiveDashboard } from "../../../../../../src/marketing/reports/marketing-reports.service";
import { resolveMarketingDashboardFilters } from "./support/marketing-dashboard-filters";

export async function getAdminWebMarketingOverviewHandler(req: Request, res: Response) {
  try {
    const filters = await resolveMarketingDashboardFilters(req.query || {}, { autofillShopDomain: true });
    const result = await getMarketingExecutiveDashboard(filters);
    res.status(200).json(toAdminWebMarketingOverviewDto(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "dashboard_error";
    const status = message === "shopDomain requerido" ? 400 : 500;
    res.status(status).json({ error: message });
  }
}
