import { syncInventoryAdjustments } from "../../../../src/services/inventory-adjustments.service";
import { createSyncLog } from "../../../../src/services/logs.service";
import { withEachOrganization } from "../../../../src/services/organizations.service";
import { getInventoryAdjustmentsSettings } from "../../../../src/services/settings.service";
import { getSyncCheckpoint, saveSyncCheckpoint } from "../../../../src/services/sync-checkpoints.service";
import { getStoreConfigForDomain } from "../../../../src/services/store-configs.service";
import { listConnectedShopifyDomains } from "../../../../src/services/store-connections.service";
import { isWorkerEnabled } from "../../../../src/services/worker-settings.service";
import { puedeCorrerEnTienda } from "../../../../src/services/requisitos-worker.service";

const MAX_DAYS_PER_TICK = Math.max(1, Math.min(Number(process.env.INVENTORY_ADJUSTMENTS_MAX_DAYS_PER_TICK || 30), 90));

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

async function resolveStoreRuntime(
  shopDomain: string,
  settings: Awaited<ReturnType<typeof getInventoryAdjustmentsSettings>>
) {
  const store = await getStoreConfigForDomain(shopDomain).catch(() => null);
  const storeRules = store?.rules;
  const enabled = storeRules ? storeRules.inventoryAdjustmentsEnabled !== false : settings.enabled;
  const autoPublish = storeRules ? storeRules.inventoryAdjustmentsAutoPublish !== false : settings.autoPublish;
  const intervalMinutes =
    enabled && typeof storeRules?.inventoryAdjustmentsIntervalMinutes === "number"
      ? Math.max(5, Number(storeRules.inventoryAdjustmentsIntervalMinutes) || 0)
      : enabled
        ? settings.intervalMinutes
        : 0;
  return { enabled, autoPublish, intervalMinutes };
}

async function shouldRunStore(shopDomain: string, intervalMinutes: number) {
  if (intervalMinutes <= 0) return false;
  const checkpoint = await getSyncCheckpoint(checkpointKey(shopDomain));
  if (!checkpoint?.updatedAt) {
    return true;
  }
  const lastUpdatedAt = Date.parse(checkpoint.updatedAt);
  if (!Number.isFinite(lastUpdatedAt) || lastUpdatedAt <= 0) {
    return true;
  }
  return Date.now() - lastUpdatedAt >= intervalMinutes * 60 * 1000;
}

export function startInventoryAdjustmentsWorker() {
  if (process.env.INVENTORY_ADJUSTMENTS_POLL_DISABLED === "true") {
    return;
  }

  let running = false;

  const runForOrg = async () => {
    let settings: Awaited<ReturnType<typeof getInventoryAdjustmentsSettings>>;
    try {
      settings = await getInventoryAdjustmentsSettings();
    } catch (error) {
      console.error("Inventory adjustments: settings read failed:", error);
      return;
    }
    if (!settings.enabled || settings.intervalMinutes <= 0) return;

    const shopDomains = await listConnectedShopifyDomains();
    for (const shopDomain of shopDomains) {
      // Requisitos del trabajo para ESTA tienda. Si no se cumplen, no se
      // lanza la tarea: una tarea que no puede terminar sólo produce
      // errores repetidos.
      if (!(await puedeCorrerEnTienda("inventory-adjustments", shopDomain)).puedeCorrer) continue;
      try {
        const runtime = await resolveStoreRuntime(shopDomain, settings);
        if (!runtime.enabled || runtime.intervalMinutes <= 0) continue;
        if (!(await shouldRunStore(shopDomain, runtime.intervalMinutes))) continue;

        let currentDate = await resolveStartDate(shopDomain);
        const today = toIsoDate(Date.now());
        let daysThisTick = 0;
        // Cap días por tick — un checkpoint stale de meses ya no genera cientos de llamadas Alegra por tick.
        while (currentDate <= today && daysThisTick < MAX_DAYS_PER_TICK) {
          const query = new URLSearchParams();
          query.set("metadata", "true");
          query.set("date", currentDate);
          const result = await syncInventoryAdjustments(query, {
            autoPublish: runtime.autoPublish,
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
          daysThisTick += 1;
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

  const run = async () => {
    // Interruptor de Super Admin. Se consulta en CADA pasada (no sólo al
    // arrancar) para que encender o apagar surta efecto sin reiniciar.
    if (!(await isWorkerEnabled("inventory-adjustments"))) return;
    if (running) return;
    running = true;
    try {
      await withEachOrganization(runForOrg);
    } finally {
      running = false;
    }
  };

  const scheduleNext = async () => {
    let intervalMinutes = 0;
    try {
      const settings = await getInventoryAdjustmentsSettings();
      if (!settings.enabled || settings.intervalMinutes <= 0) {
        return;
      }
      intervalMinutes = settings.intervalMinutes;
      const shopDomains = await listConnectedShopifyDomains();
      for (const shopDomain of shopDomains) {
        const runtime = await resolveStoreRuntime(shopDomain, settings);
        if (!runtime.enabled || runtime.intervalMinutes <= 0) {
          continue;
        }
        intervalMinutes = Math.min(intervalMinutes, runtime.intervalMinutes);
      }
    } catch (error) {
      console.error("Inventory adjustments: schedule settings read failed:", error);
    }
    if (intervalMinutes <= 0) {
      return;
    }
    setTimeout(
      async () => {
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
      },
      intervalMinutes * 60 * 1000
    );
  };

  void (async () => {
    await run();
    await scheduleNext();
  })();
}
