import type { Request, Response } from "express";
import { getSyncCheckpoint } from "../services/sync-checkpoints.service";
import { getInventoryAdjustmentsSettings } from "../services/settings.service";
import { getStoreConfigForDomain } from "../services/store-configs.service";

const checkpointKey = (shopDomain: string) => `inventory_adjustments:${shopDomain}`;

export async function getInventoryAdjustmentsCheckpoint(req: Request, res: Response) {
  try {
    const shopDomain = typeof req.query.shopDomain === "string" ? req.query.shopDomain.trim() : "";
    const checkpoint = await getSyncCheckpoint(shopDomain ? checkpointKey(shopDomain) : "inventory_adjustments");
    const settings = await getInventoryAdjustmentsSettings();
    let intervalMinutes = settings.enabled ? settings.intervalMinutes : 0;
    if (shopDomain) {
      const store = await getStoreConfigForDomain(shopDomain).catch(() => null);
      if (store?.rules?.inventoryAdjustmentsEnabled === false) {
        intervalMinutes = 0;
      } else if (store?.rules?.inventoryAdjustmentsIntervalMinutes) {
        intervalMinutes = store.rules.inventoryAdjustmentsIntervalMinutes;
      }
    }
    const intervalMs = intervalMinutes > 0 ? intervalMinutes * 60 * 1000 : 0;
    res.status(200).json({ checkpoint, intervalMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}
