import type { Request, Response } from "express";
import { getMetrics } from "../services/metrics.service";
import { createSyncLog } from "../services/logs.service";

const safeCreateLog = async (payload: Parameters<typeof createSyncLog>[0]) => {
  try {
    await createSyncLog(payload);
  } catch {
    // ignore logging failures
  }
};

export async function listMetrics(req: Request, res: Response) {
  try {
    const days = Number(req.query.days || 30);
    const result = await getMetrics(Number.isFinite(days) ? days : 30);
    res.status(200).json(result);
    await safeCreateLog({
      entity: "metrics_list",
      direction: "shopify->alegra",
      status: "success",
      message: "Metricas cargadas",
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "No disponible" });
    await safeCreateLog({
      entity: "metrics_list",
      direction: "shopify->alegra",
      status: "fail",
      message: error.message || "No disponible",
    });
  }
}
