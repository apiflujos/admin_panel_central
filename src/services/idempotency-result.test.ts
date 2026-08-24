import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("../db", () => ({
  getOrgId: () => 3,
  getPool: () => ({ query: queryMock }),
}));

describe("resultado externo de idempotencia", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el ID externo guardado cuando el trabajo ya terminó", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
      rows: [
        {
          status: "completed",
          updated_at: new Date(),
          result_json: { invoiceId: "998", invoiceNumber: "FV-998" },
        },
      ],
    });
    const { acquireIdempotencyKey } = await import("./idempotency.service");

    await expect(acquireIdempotencyKey("invoice:becam:1001")).resolves.toEqual({
      status: "completed",
      acquired: false,
      result: { invoiceId: "998", invoiceNumber: "FV-998" },
    });
  });

  it("persiste el resultado de Alegra junto con el estado completed", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { markIdempotencyCompleted } = await import("./idempotency.service");
    const result = { invoiceId: "998", invoiceNumber: "FV-998" };

    await markIdempotencyCompleted("invoice:becam:1001", result);

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("result_json = $3"), [
      3,
      "invoice:becam:1001",
      result,
    ]);
  });
});
