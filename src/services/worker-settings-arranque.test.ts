import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("../db", () => ({
  getPool: () => ({ query: queryMock }),
}));

import { isWorkerEnabled, listWorkerSettings, resetWorkerSettingsCacheForTests } from "./worker-settings.service";

/**
 * Qué ocurre EN EL ARRANQUE DE UN DESPLIEGUE, que es el momento de riesgo:
 * el código nuevo ya está corriendo y la configuración puede no existir aún.
 */
describe("arranque de un despliegue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkerSettingsCacheForTests();
  });
  afterEach(() => resetWorkerSettingsCacheForTests());

  it("si la tabla NO existe todavía, NADA corre", async () => {
    // Es el peor caso: se arrancó antes de migrar. Postgres responde
    // «relation "worker_settings" does not exist».
    queryMock.mockRejectedValue(new Error('relation "worker_settings" does not exist'));

    expect(await isWorkerEnabled("products-sync")).toBe(false);
    expect(await isWorkerEnabled("inventory-adjustments")).toBe(false);
    expect(await isWorkerEnabled("webhook-dispatch")).toBe(false);
    expect(await isWorkerEnabled("orders-sync")).toBe(false);
  });

  it("si la base no responde, tampoco corre nada", async () => {
    queryMock.mockRejectedValue(new Error("timeout exceeded when trying to connect"));
    expect(await isWorkerEnabled("products-sync")).toBe(false);
    expect(await isWorkerEnabled("webhook-dispatch")).toBe(false);
  });

  it("con la tabla recién migrada y VACÍA sale exactamente lo que pidió el cliente", async () => {
    // Éste es el estado real justo después del despliegue: la migración creó la
    // tabla y no hay ni una fila. Manda el valor por omisión del catálogo.
    queryMock.mockResolvedValue({ rows: [] });

    // Facturación y mantenimiento: encendidos.
    expect(await isWorkerEnabled("webhook-dispatch")).toBe(true);
    expect(await isWorkerEnabled("orders-sync")).toBe(true);
    expect(await isWorkerEnabled("retry-queue")).toBe(true);
    expect(await isWorkerEnabled("alegra-reconcile")).toBe(true);
    expect(await isWorkerEnabled("log-retention")).toBe(true);
    expect(await isWorkerEnabled("health-monitor")).toBe(true);
    expect(await isWorkerEnabled("billing-report")).toBe(true);

    // Los dos que tocan el catálogo de las tiendas: APAGADOS.
    expect(await isWorkerEnabled("products-sync")).toBe(false);
    expect(await isWorkerEnabled("inventory-adjustments")).toBe(false);
  });

  it("una fila guardada manda sobre el valor por omisión", async () => {
    queryMock.mockResolvedValue({
      rows: [{ worker_key: "products-sync", enabled: true, updated_at: new Date(), updated_by: "yo@becam.co" }],
    });
    expect(await isWorkerEnabled("products-sync")).toBe(true);
    expect(await isWorkerEnabled("inventory-adjustments")).toBe(false);
  });

  it("una clave desconocida en la tabla se ignora, no rompe el arranque", async () => {
    queryMock.mockResolvedValue({
      rows: [
        { worker_key: "worker-que-ya-no-existe", enabled: true, updated_at: new Date(), updated_by: null },
        { worker_key: "products-sync", enabled: false, updated_at: new Date(), updated_by: null },
      ],
    });
    expect(await isWorkerEnabled("products-sync")).toBe(false);
    const listado = await listWorkerSettings();
    expect(listado).toHaveLength(9);
    expect(listado.map((w) => w.key)).not.toContain("worker-que-ya-no-existe");
  });

  it("listWorkerSettings marca cuáles nadie ha tocado", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const listado = await listWorkerSettings();
    expect(listado.every((w) => w.isDefault)).toBe(true);
    const escriben = listado.filter((w) => w.writesToStore);
    expect(escriben.map((w) => w.key).sort()).toEqual(["inventory-adjustments", "products-sync"]);
    expect(escriben.every((w) => !w.enabled)).toBe(true);
  });
});
