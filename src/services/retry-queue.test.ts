import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  connectMock,
  poolQueryMock,
  getPoolMock,
  getOrgIdMock,
  retryInvoiceFromLogMock,
  processQueuedWebhookEventMock,
  updateSyncLogMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn(),
  poolQueryMock: vi.fn(),
  getPoolMock: vi.fn(),
  getOrgIdMock: vi.fn(),
  retryInvoiceFromLogMock: vi.fn(),
  processQueuedWebhookEventMock: vi.fn(),
  updateSyncLogMock: vi.fn(),
}));

import { processRetryQueue } from "./retry-queue.service";
let clientQueryMock: ReturnType<typeof vi.fn>;

vi.mock("../db", () => ({
  getPool: getPoolMock,
  getOrgId: getOrgIdMock,
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
    getOrgIdMock.mockReturnValue("org-1");
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
    retryInvoiceFromLogMock.mockResolvedValue(undefined);
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
  });
});
