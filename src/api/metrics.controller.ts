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
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
    await safeCreateLog({
      entity: "metrics_list",
      direction: "shopify->alegra",
      status: "fail",
      message,
    });
  }
}
