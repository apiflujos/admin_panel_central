import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAlegraCredentialMock, getAlegraConnectionByDomainMock, syncAlegraInventoryByIdMock, fetchMock } =
  vi.hoisted(() => ({
    getAlegraCredentialMock: vi.fn(),
    getAlegraConnectionByDomainMock: vi.fn(),
    syncAlegraInventoryByIdMock: vi.fn(),
    fetchMock: vi.fn(),
  }));

vi.mock("./settings.service", () => ({ getAlegraCredential: getAlegraCredentialMock }));
vi.mock("./store-connections.service", () => ({ getAlegraConnectionByDomain: getAlegraConnectionByDomainMock }));
vi.mock("./alegra-to-shopify.service", () => ({ syncAlegraInventoryById: syncAlegraInventoryByIdMock }));
vi.mock("../utils/alegra-env", () => ({ getAlegraBaseUrl: () => "https://api.alegra.com/api/v1" }));

// Sobreescribimos fetch global.
vi.stubGlobal("fetch", fetchMock);

import { extractAdjustmentItems, syncInventoryAdjustments } from "./inventory-adjustments.service";

describe("extractAdjustmentItems", () => {
  it("acepta payload con .items array", () => {
    const result = extractAdjustmentItems({ items: [{ id: 1 }, { id: 2 }] });
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("acepta payload con .data array (formato alternativo Alegra)", () => {
    const result = extractAdjustmentItems({ data: [{ id: 3 }] });
    expect(result).toEqual([{ id: 3 }]);
  });

  it("retorna [] cuando payload no es objeto", () => {
    expect(extractAdjustmentItems(null)).toEqual([]);
    expect(extractAdjustmentItems("string")).toEqual([]);
    expect(extractAdjustmentItems(undefined)).toEqual([]);
  });

  it("retorna [] cuando ni items ni data están presentes", () => {
    expect(extractAdjustmentItems({})).toEqual([]);
    expect(extractAdjustmentItems({ other: "field" })).toEqual([]);
  });

  it("prefiere items sobre data si ambos existen", () => {
    const result = extractAdjustmentItems({ items: [{ id: 1 }], data: [{ id: 99 }] });
    expect(result).toEqual([{ id: 1 }]);
  });
});

describe("syncInventoryAdjustments — flow", () => {
  beforeEach(() => {
    // resetAllMocks limpia el queue de mockResolvedValueOnce entre tests.
    vi.resetAllMocks();
    getAlegraCredentialMock.mockResolvedValue({ email: "e@x.com", apiKey: "key", environment: "prod" });
    getAlegraConnectionByDomainMock.mockResolvedValue({ email: "e@x.com", apiKey: "key", environment: "prod" });
    syncAlegraInventoryByIdMock.mockResolvedValue({ synced: true });
  });

  const jsonResponse = (payload: unknown) =>
    ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => payload,
      text: async () => JSON.stringify(payload),
    }) as Response;

  it("colecta items de un solo page y despacha syncAlegraInventoryById por id único", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: [
          { id: 1, items: [{ id: 100 }, { id: 101 }] },
          { id: 2, items: [{ id: 101 }] }, // duplicado — se dedupea
        ],
      })
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    const query = new URLSearchParams({ date: "2026-07-20" });
    const result = await syncInventoryAdjustments(query, { autoPublish: true });

    expect(result.adjustmentsCount).toBe(2);
    expect(result.itemCount).toBe(2); // deduplicado: 100 y 101
    expect(result.synced).toBe(2);
    expect(result.failed).toBe(0);
    expect(syncAlegraInventoryByIdMock).toHaveBeenCalledTimes(2);
  });

  it("respeta autoPublish=false y NO llama sync", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ id: 1, items: [{ id: 100 }] }] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    const result = await syncInventoryAdjustments(new URLSearchParams(), { autoPublish: false });

    expect(result.autoPublish).toBe(false);
    expect(result.synced).toBe(0);
    expect(syncAlegraInventoryByIdMock).not.toHaveBeenCalled();
  });

  it("cuenta failed cuando syncAlegraInventoryById rechaza", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: 1, items: [{ id: 100 }, { id: 101 }] }] })
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    syncAlegraInventoryByIdMock
      .mockResolvedValueOnce({ synced: true })
      .mockRejectedValueOnce(new Error("Alegra 500"));

    const result = await syncInventoryAdjustments(new URLSearchParams(), { autoPublish: true });

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("paginación: para cuando batch < limit", async () => {
    // Primer page: full (30 items)
    const firstPage = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, items: [{ id: 1000 + i }] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: firstPage }));
    // Segundo page: parcial (5 items) → señal de fin.
    const secondPage = Array.from({ length: 5 }, (_, i) => ({ id: 100 + i, items: [{ id: 2000 + i }] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: secondPage }));

    const result = await syncInventoryAdjustments(new URLSearchParams(), { autoPublish: false });

    expect(result.adjustmentsCount).toBe(35);
    expect(fetchMock).toHaveBeenCalledTimes(2); // no hace un 3er fetch (batch < limit)
  });

  it("usa shopDomain-based credentials cuando se pasa", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    await syncInventoryAdjustments(new URLSearchParams(), { shopDomain: "tienda.myshopify.com" });

    expect(getAlegraConnectionByDomainMock).toHaveBeenCalledWith("tienda.myshopify.com");
    expect(getAlegraCredentialMock).not.toHaveBeenCalled();
  });

  it("dispara onProgress callbacks (adjustments_page + adjustments_loaded + publish_batch)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ id: 1, items: [{ id: 100 }] }] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    const events: string[] = [];
    await syncInventoryAdjustments(new URLSearchParams(), {
      autoPublish: true,
      onProgress: async (evt) => {
        events.push(String(evt.type));
      },
    });

    expect(events).toContain("adjustments_page");
    expect(events).toContain("adjustments_loaded");
    expect(events).toContain("publish_batch");
  });
});
