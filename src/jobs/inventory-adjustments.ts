import { syncInventoryAdjustments } from "../services/inventory-adjustments.service";
import { createSyncLog } from "../services/logs.service";
import { getInventoryAdjustmentsSettings } from "../services/settings.service";
import { getSyncCheckpoint, saveSyncCheckpoint } from "../services/sync-checkpoints.service";

const toIsoDate = (value: Date | number) =>
  new Date(value).toISOString().slice(0, 10);

const resolveStartDate = async () => {
  const checkpoint = await getSyncCheckpoint("inventory_adjustments");
  if (checkpoint?.lastStart) {
    return toIsoDate(checkpoint.lastStart);
  }
  return toIsoDate(Date.now());
};

export function startInventoryAdjustmentsPoller() {
  if (process.env.INVENTORY_ADJUSTMENTS_POLL_DISABLED === "true") {
    return;
  }

  let lastDate = toIsoDate(Date.now());

  const run = async () => {
    const settings = await getInventoryAdjustmentsSettings();
    if (!settings.enabled || settings.intervalMinutes <= 0) {
      return;
    }
    if (!lastDate) {
      lastDate = await resolveStartDate();
    }
    const today = toIsoDate(Date.now());
    const query = new URLSearchParams();
    query.set("metadata", "true");
    query.set("date", today);
    try {
      const result = await syncInventoryAdjustments(query, {
        autoPublish: settings.autoPublish,
      });
      lastDate = today;
      await saveSyncCheckpoint({
        entity: "inventory_adjustments",
        lastStart: Date.parse(`${today}T00:00:00.000Z`),
        total: null,
      });
      try {
        await createSyncLog({
          entity: "inventory_adjustments",
          direction: "alegra->shopify",
          status: "success",
          message: "Inventory adjustments synced",
          request: { date: query.get("date") },
          response: result as Record<string, unknown>,
        });
      } catch {
        // ignore logging failures
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inventory adjustments poll failed";
      // keep lastDate so we retry the same window next time
      try {
        await createSyncLog({
          entity: "inventory_adjustments",
          direction: "alegra->shopify",
          status: "fail",
          message,
          request: { date: query.get("date") },
          response: {
            error: message,
          },
        });
      } catch {
        // ignore logging failures
      }
    }
  };

  const scheduleNext = async () => {
    const settings = await getInventoryAdjustmentsSettings();
    const intervalMinutes = settings.enabled ? settings.intervalMinutes : 0;
    if (intervalMinutes <= 0) {
      return;
    }
    setTimeout(async () => {
      await run();
      await scheduleNext();
    }, intervalMinutes * 60 * 1000);
  };

  resolveStartDate()
    .then((start) => {
      lastDate = start;
    })
    .finally(() => {
      void run();
      void scheduleNext();
    });
}
