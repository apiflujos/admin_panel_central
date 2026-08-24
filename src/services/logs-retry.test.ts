import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("../db", () => ({
  getOrgId: () => 1,
  getPool: () => ({ query: queryMock }),
}));

import { retryFailedLogs } from "./logs.service";

describe("reintento masivo de registros", () => {
  beforeEach(() => vi.clearAllMocks());

  it("encola únicamente operaciones que contienen material recuperable", async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          { id: 10, eligible: true },
          { id: 11, eligible: false },
          { id: 12, eligible: true },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ sync_log_id: 10 }, { sync_log_id: 12 }] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(retryFailedLogs()).resolves.toEqual({ retried: 2, ignored: 1 });
    expect(queryMock.mock.calls[1]?.[1]).toEqual([[10, 12]]);
    expect(String(queryMock.mock.calls[0]?.[0])).toContain("request_json ? 'invoicePayload'");
    expect(String(queryMock.mock.calls[0]?.[0])).toContain("request_json ? 'webhookEvent'");
  });

  it("no crea cola cuando todos los fallos son validaciones permanentes", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 30, eligible: false }] });
    await expect(retryFailedLogs()).resolves.toEqual({ retried: 0, ignored: 1 });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});
