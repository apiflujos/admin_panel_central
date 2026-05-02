import { syncInventoryAdjustments } from "../../../../src/services/inventory-adjustments.service";
import { createSyncLog } from "../../../../src/services/logs.service";
import { getInventoryAdjustmentsSettings } from "../../../../src/services/settings.service";
import { getSyncCheckpoint, saveSyncCheckpoint } from "../../../../src/services/sync-checkpoints.service";
import { getStoreConfigForDomain } from "../../../../src/services/store-configs.service";
import { listConnectedShopifyDomains } from "../../../../src/services/store-connections.service";

const toIsoDate = (value: Date | number) => new Date(value).toISOString().slice(0, 10);
const checkpointKey = (shopDomain: string) => `inventory_adjustments:${shopDomain}`;

const resolveStartDate = async (shopDomain: string) => {
  try {
    const checkpoint = await getSyncCheckpoint(checkpointKey(shopDomain));
    if (checkpoint?.lastStart) {
      return toIsoDate(checkpoint.lastStart);
    }
  } catch (error) {
    console.error("Inventory adjustments: checkpoint read failed:", error);
  }
  return toIsoDate(Date.now());
};

const addDays = (date: string, days: number) => {
  const parsed = Date.parse(`${date}T00:00:00.000Z`);
  return toIsoDate(parsed + days * 24 * 60 * 60 * 1000);
};

export function startInventoryAdjustmentsWorker() {
  if (process.env.INVENTORY_ADJUSTMENTS_POLL_DISABLED === "true") {
    return;
  }

  const run = async () => {
    let settings: Awaited<ReturnType<typeof getInventoryAdjustmentsSettings>>;
    try {
      settings = await getInventoryAdjustmentsSettings();
    } catch (error) {
      console.error("Inventory adjustments: settings read failed:", error);
      return;
    }
    if (!settings.enabled || settings.intervalMinutes <= 0) {
      return;
    }

    const shopDomains = await listConnectedShopifyDomains();
    for (const shopDomain of shopDomains) {
      try {
        const store = await getStoreConfigForDomain(shopDomain).catch(() => null);
        const storeRules = store?.rules;
        const enabled = storeRules ? storeRules.inventoryAdjustmentsEnabled !== false : settings.enabled;
        const autoPublish = storeRules ? storeRules.inventoryAdjustmentsAutoPublish !== false : settings.autoPublish;
        if (!enabled) {
          continue;
        }

        let currentDate = await resolveStartDate(shopDomain);
        const today = toIsoDate(Date.now());
        while (currentDate <= today) {
          const query = new URLSearchParams();
          query.set("metadata", "true");
          query.set("date", currentDate);
          const result = await syncInventoryAdjustments(query, {
            autoPublish,
            shopDomain,
          });
          await saveSyncCheckpoint({
            entity: checkpointKey(shopDomain),
            lastStart: Date.parse(`${currentDate}T00:00:00.000Z`),
            total: null,
          });
          try {
            await createSyncLog({
              entity: "inventory_adjustments",
              direction: "alegra->shopify",
              status: "success",
              message: "Inventory adjustments synced",
              request: { shopDomain, date: currentDate },
              response: result as Record<string, unknown>,
            });
          } catch {
            // ignore logging failures
          }
          currentDate = addDays(currentDate, 1);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Inventory adjustments poll failed";
        try {
          await createSyncLog({
            entity: "inventory_adjustments",
            direction: "alegra->shopify",
            status: "fail",
            message,
            request: { shopDomain },
            response: { error: message },
          });
        } catch {
          // ignore logging failures
        }
      }
    }
  };

  const scheduleNext = async () => {
    let intervalMinutes = 0;
    try {
      const settings = await getInventoryAdjustmentsSettings();
      intervalMinutes = settings.enabled ? settings.intervalMinutes : 0;
    } catch (error) {
      console.error("Inventory adjustments: schedule settings read failed:", error);
    }
    if (intervalMinutes <= 0) {
      return;
    }
    setTimeout(async () => {
      try {
        await run();
      } catch (error) {
        console.error("Inventory adjustments poll failed:", error);
      }
      try {
        await scheduleNext();
      } catch (error) {
        console.error("Inventory adjustments schedule failed:", error);
      }
    }, intervalMinutes * 60 * 1000);
  };

  void (async () => {
    await run();
    await scheduleNext();
  })();
}
