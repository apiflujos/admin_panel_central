import type { Request, Response } from "express";
import { getSyncCheckpoint } from "../services/sync-checkpoints.service";
import { getInventoryAdjustmentsSettings } from "../services/settings.service";

export async function getInventoryAdjustmentsCheckpoint(_req: Request, res: Response) {
  try {
    const checkpoint = await getSyncCheckpoint("inventory_adjustments");
    const settings = await getInventoryAdjustmentsSettings();
    const intervalMs = settings.enabled ? settings.intervalMinutes * 60 * 1000 : 0;
    res.status(200).json({ checkpoint, intervalMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}
