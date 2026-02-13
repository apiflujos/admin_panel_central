import type { Request, Response } from "express";
import { listSyncLogs, retryFailedLogs } from "../services/logs.service";

export async function listLogs(req: Request, res: Response) {
  const { status, orderId, from, to, entity, direction } = req.query;
  try {
    const data = await listSyncLogs({
      status: status as string | undefined,
      orderId: orderId as string | undefined,
      entity: entity as string | undefined,
      direction: direction as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    });
    res.status(200).json({ ...data, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cargar logs";
    res
      .status(200)
      .json({ items: [], filters: { status, orderId, entity, direction, from, to }, error: message });
  }
}

export async function retryFailed(_req: Request, res: Response) {
  try {
    const result = await retryFailedLogs();
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo reintentar";
    res.status(500).json({ error: message });
  }
}
