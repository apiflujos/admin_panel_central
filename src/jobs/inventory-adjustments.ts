import { syncInventoryAdjustments } from "../services/inventory-adjustments.service";
import { createSyncLog } from "../services/logs.service";
import { getSyncCheckpoint, saveSyncCheckpoint } from "../services/sync-checkpoints.service";

const buildDateRange = (start: string, end: string) => {
  if (start === end) return start;
  return `${start},${end}`;
};

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
  const intervalSeconds = Number(process.env.INVENTORY_ADJUSTMENTS_POLL_SECONDS || 0);
  const intervalMs = intervalSeconds > 0 ? intervalSeconds * 1000 : Number(process.env.INVENTORY_ADJUSTMENTS_POLL_MS || 0);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }

  let lastDate = toIsoDate(Date.now());

  const run = async () => {
    if (!lastDate) {
      lastDate = await resolveStartDate();
    }
    const today = toIsoDate(Date.now());
    const query = new URLSearchParams();
    query.set("metadata", "true");
    query.set("date", buildDateRange(lastDate, today));
    try {
      const result = await syncInventoryAdjustments(query);
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
    } catch {
      // keep lastDate so we retry the same window next time
      try {
        await createSyncLog({
          entity: "inventory_adjustments",
          direction: "alegra->shopify",
          status: "fail",
          message: "Inventory adjustments poll failed",
          request: { date: query.get("date") },
        });
      } catch {
        // ignore logging failures
      }
    }
  };

  resolveStartDate()
    .then((start) => {
      lastDate = start;
    })
    .finally(() => {
      void run();
    });
  setInterval(run, intervalMs);
}
