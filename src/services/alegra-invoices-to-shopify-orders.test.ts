import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  buildSyncContextMock,
  acquireIdempotencyKeyMock,
  markIdempotencyKeyMock,
  getMappingByAlegraIdMock,
  saveMappingMock,
  upsertOrderMock,
} = vi.hoisted(() => ({
  buildSyncContextMock: vi.fn(),
  acquireIdempotencyKeyMock: vi.fn(),
  markIdempotencyKeyMock: vi.fn(),
  getMappingByAlegraIdMock: vi.fn(),
  saveMappingMock: vi.fn(),
  upsertOrderMock: vi.fn(),
}));

vi.mock("./sync-context", () => ({
  buildSyncContext: buildSyncContextMock,
}));

vi.mock("./idempotency.service", () => ({
  acquireIdempotencyKey: acquireIdempotencyKeyMock,
  markIdempotencyKey: markIdempotencyKeyMock,
}));

vi.mock("./mapping.service", () => ({
  getMappingByAlegraId: getMappingByAlegraIdMock,
  saveMapping: saveMappingMock,
}));

vi.mock("./orders.service", () => ({
  upsertOrder: upsertOrderMock,
}));

import {
  syncAlegraInvoiceToShopifyFromWebhook,
  syncAlegraInvoicesToShopifyOrders,
} from "./alegra-invoices-to-shopify-orders.service";

describe("alegra invoices to shopify orders", () => {
  const createDraftOrderRestMock = vi.fn();
  const createOrderRestMock = vi.fn();
  const getInvoiceMock = vi.fn();
  const listInvoicesMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    buildSyncContextMock.mockResolvedValue({
      shopDomain: "olivashoes.myshopify.com",
      alegra: {
        listInvoices: listInvoicesMock,
        getInvoice: getInvoiceMock,
      },
      shopify: {
        createDraftOrderRest: createDraftOrderRestMock,
        createOrderRest: createOrderRestMock,
      },
    });
    acquireIdempotencyKeyMock.mockResolvedValue({ acquired: true, status: "acquired" });
    markIdempotencyKeyMock.mockResolvedValue(undefined);
    getMappingByAlegraIdMock.mockResolvedValue(undefined);
    saveMappingMock.mockResolvedValue(undefined);
    upsertOrderMock.mockResolvedValue(undefined);
    createDraftOrderRestMock.mockResolvedValue({
      draft_order: {
        id: 991,
        name: "#D991",
        invoice_url: "https://draft.example/991",
      },
    });
    createOrderRestMock.mockResolvedValue({
      order: {
        id: 501,
        name: "#501",
        order_number: 501,
      },
    });
  });

  it("syncs filtered Alegra invoices into Shopify draft orders and reports progress", async () => {
    listInvoicesMock
      .mockResolvedValueOnce([
        { id: "100", date: "2026-04-20" },
        { id: "101", date: "2026-04-24" },
      ])
      .mockResolvedValueOnce([]);
    getInvoiceMock.mockResolvedValue({
      id: "101",
      date: "2026-04-24",
      status: "open",
      total: 125000,
      currency: "COP",
      client: {
        name: "Cliente Uno",
        email: "cliente@example.com",
      },
      numberTemplate: {
        fullNumber: "FV-101",
      },
      items: [
        {
          id: "item-1",
          name: "Producto A",
          quantity: 2,
          price: 50000,
        },
      ],
    });

    const progress: Array<Record<string, unknown>> = [];
    const result = await syncAlegraInvoicesToShopifyOrders({
      shopDomain: "olivashoes.myshopify.com",
      mode: "draft",
      filters: {
        dateStart: "2026-04-21",
        dateEnd: "2026-04-30",
        limit: 10,
      },
      onProgress: (event) => progress.push(event),
    });

    expect(result).toEqual({
      processed: 1,
      total: 1,
      created: 1,
      skipped: 0,
      failed: 0,
    });
    expect(createDraftOrderRestMock).toHaveBeenCalledTimes(1);
    expect(createDraftOrderRestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "cliente@example.com",
        note: expect.stringContaining("FV-101"),
      })
    );
    expect(saveMappingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "draft_order",
        alegraId: "101",
      })
    );
    expect(upsertOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        alegraId: "101",
        invoiceNumber: "FV-101",
        status: "draft",
      })
    );
    expect(progress[0]).toEqual({ type: "start", total: 1, pages: 1 });
    expect(progress.at(-1)).toEqual({
      type: "complete",
      processed: 1,
      total: 1,
      created: 1,
      skipped: 0,
      failed: 0,
    });
  });

  it("skips webhook sync when the Alegra invoice is already mapped", async () => {
    getMappingByAlegraIdMock
      .mockResolvedValueOnce({ shopifyId: "gid://shopify/Order/123" })
      .mockResolvedValueOnce(undefined);

    const result = await syncAlegraInvoiceToShopifyFromWebhook({
      shopDomain: "olivashoes.myshopify.com",
      alegraInvoiceId: "INV-77",
      mode: "active",
    });

    expect(result).toEqual({
      ok: true,
      skipped: true,
      reason: "already_mapped",
    });
    expect(getInvoiceMock).not.toHaveBeenCalled();
    expect(createOrderRestMock).not.toHaveBeenCalled();
  });
});
