import type { Request, Response } from "express";
import { getMetrics, type MetricsRange } from "../services/metrics.service";
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
    const raw = typeof req.query.range === "string" ? req.query.range : "";
    const range = isMetricsRange(raw) ? (raw as MetricsRange) : undefined;
    const result = await getMetrics({ range });
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

function isMetricsRange(value: string): value is MetricsRange {
  return value === "day" || value === "week" || value === "month";
}
