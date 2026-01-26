import type { Request, Response } from "express";
import { getSyncCheckpoint } from "../services/sync-checkpoints.service";

export async function getInventoryAdjustmentsCheckpoint(_req: Request, res: Response) {
  try {
    const checkpoint = await getSyncCheckpoint("inventory_adjustments");
    const intervalSeconds = Number(process.env.INVENTORY_ADJUSTMENTS_POLL_SECONDS || 0);
    const intervalMs =
      intervalSeconds > 0
        ? intervalSeconds * 1000
        : Number(process.env.INVENTORY_ADJUSTMENTS_POLL_MS || 0);
    res.status(200).json({ checkpoint, intervalMs });
  } catch (error) {
    res.status(400).json({ error: error.message || "No disponible" });
  }
}
