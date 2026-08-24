import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  connectMock,
  poolQueryMock,
  getPoolMock,
  runWithOrgMock,
  retryInvoiceFromLogMock,
  processQueuedWebhookEventMock,
  updateSyncLogMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn(),
  poolQueryMock: vi.fn(),
  getPoolMock: vi.fn(),
  runWithOrgMock: vi.fn(),
  retryInvoiceFromLogMock: vi.fn(),
  processQueuedWebhookEventMock: vi.fn(),
  updateSyncLogMock: vi.fn(),
}));

import { processRetryQueue } from "./retry-queue.service";
let clientQueryMock: ReturnType<typeof vi.fn>;

vi.mock("../db", () => ({
  getPool: getPoolMock,
  runWithOrg: runWithOrgMock,
}));

vi.mock("./operations.service", () => ({
  retryInvoiceFromLog: retryInvoiceFromLogMock,
}));

vi.mock("./sync.service", () => ({
  processQueuedWebhookEvent: processQueuedWebhookEventMock,
}));

vi.mock("./logs.service", () => ({
  updateSyncLog: updateSyncLogMock,
}));

describe("retry-queue webhook processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // runWithOrg debe invocar directamente al callback en los tests.
    runWithOrgMock.mockImplementation(async (_orgId: number, fn: () => Promise<unknown>) => fn());
    const releaseMock = vi.fn();
    clientQueryMock = vi.fn();
    clientQueryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [],
      })
      .mockResolvedValueOnce(undefined);
    connectMock.mockResolvedValue({
      query: clientQueryMock,
      release: releaseMock,
    });
    poolQueryMock.mockResolvedValue(undefined);
    getPoolMock.mockReturnValue({
      connect: connectMock,
      query: poolQueryMock,
    });
    retryInvoiceFromLogMock.mockResolvedValue({ status: "created", invoiceId: "900" });
    processQueuedWebhookEventMock.mockResolvedValue(undefined);
    updateSyncLogMock.mockResolvedValue(undefined);
  });

  it("processes queued webhook events and marks retry row done", async () => {
    clientQueryMock.mockReset();
    clientQueryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            organization_id: 1,
            sync_log_id: 20,
            entity: "webhook",
            request_json: {
              webhookEvent: {
                source: "shopify",
                eventType: "orders/create",
                payload: { id: 123 },
                meta: { topic: "orders/create" },
                webhookEventId: 55,
              },
            },
            retry_count: 0,
          },
        ],
      })
      .mockResolvedValueOnce(undefined);

    const result = await processRetryQueue(5);

    expect(result).toEqual({ processed: 1 });
    expect(processQueuedWebhookEventMock).toHaveBeenCalledWith({
      syncLogId: 20,
      event: {
        source: "shopify",
        eventType: "orders/create",
        payload: { id: 123 },
        meta: { topic: "orders/create" },
      },
      webhookEventId: 55,
    });
    expect(poolQueryMock).toHaveBeenCalledWith(`UPDATE retry_queue SET status = 'done' WHERE id = $1`, [10]);
  });

  it("skips invalid webhook payloads instead of crashing the queue", async () => {
    clientQueryMock.mockReset();
    clientQueryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 11,
            organization_id: 1,
            sync_log_id: 21,
            entity: "webhook",
            request_json: {
              webhookEvent: {
                source: "invalid",
                eventType: 99,
              },
            },
            retry_count: 0,
          },
        ],
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const result = await processRetryQueue(5);

    expect(result).toEqual({ processed: 1 });
    expect(processQueuedWebhookEventMock).not.toHaveBeenCalled();
    expect(poolQueryMock).toHaveBeenCalledWith(`UPDATE retry_queue SET status = 'skipped' WHERE id = $1`, [11]);
    expect(updateSyncLogMock).toHaveBeenCalledWith(21, {
      status: "fail",
      message: "Reintento no ejecutado: el registro no contiene una operación recuperable",
    });
  });

  it("solo marca done cuando el reintento de factura realmente termina", async () => {
    clientQueryMock.mockReset();
    clientQueryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 12,
            organization_id: 1,
            sync_log_id: 22,
            entity: "order",
            request_json: { orderId: "123", invoicePayload: { client: 5 } },
            retry_count: 0,
          },
        ],
      })
      .mockResolvedValueOnce(undefined);

    retryInvoiceFromLogMock.mockResolvedValue({ status: "missing_payload" });
    await processRetryQueue(5);

    expect(poolQueryMock).toHaveBeenCalledWith(`UPDATE retry_queue SET status = 'skipped' WHERE id = $1`, [12]);
    expect(poolQueryMock).not.toHaveBeenCalledWith(`UPDATE retry_queue SET status = 'done' WHERE id = $1`, [12]);
    expect(updateSyncLogMock).toHaveBeenCalledWith(22, {
      status: "fail",
      message: "Reintento no ejecutado: missing_payload",
      response: { status: "missing_payload" },
    });
  });

  it("cierra también el sync_log original cuando la factura se recupera", async () => {
    clientQueryMock.mockReset();
    clientQueryMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [
          {
            id: 13,
            organization_id: 1,
            sync_log_id: 23,
            entity: "order",
            request_json: { orderId: "456", invoicePayload: { client: 8 } },
            retry_count: 1,
          },
        ],
      })
      .mockResolvedValueOnce(undefined);

    retryInvoiceFromLogMock.mockResolvedValue({ status: "created", invoiceId: "901" });
    await processRetryQueue(5);

    expect(updateSyncLogMock).toHaveBeenCalledWith(23, {
      status: "success",
      message: "Reintento completado: created",
      response: { status: "created", invoiceId: "901" },
    });
    expect(poolQueryMock).toHaveBeenCalledWith(`UPDATE retry_queue SET status = 'done' WHERE id = $1`, [13]);
  });
});
