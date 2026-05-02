import { normalizeLogsFilters, toAdminWebLogsListDto } from "./logs";

describe("domain/logs", () => {
  it("normaliza filtros de logs", () => {
    expect(
      normalizeLogsFilters({
        status: " fail ",
        orderId: " 1001 ",
        entity: " order ",
        direction: " shopify_to_alegra ",
        from: "2026-05-01",
        to: "2026-05-02",
      })
    ).toEqual({
      status: "fail",
      orderId: "1001",
      entity: "order",
      direction: "shopify_to_alegra",
      from: "2026-05-01",
      to: "2026-05-02",
    });
  });

  it("mapea logs y resume estados", () => {
    expect(
      toAdminWebLogsListDto({
        items: [
          {
            id: 1,
            entity: "order",
            direction: "shopify_to_alegra",
            status: "fail",
            message: "Fallo",
            created_at: "2026-05-01T10:00:00.000Z",
            order_id: "1001",
          },
          {
            id: 2,
            entity: "product",
            direction: "alegra_to_shopify",
            status: "retrying",
            message: null,
            created_at: "2026-05-01T11:00:00.000Z",
            order_id: null,
          },
        ],
        filters: {
          status: "fail",
        },
      })
    ).toMatchObject({
      filters: { status: "fail" },
      summary: {
        total: 2,
        failedCount: 1,
        retryingCount: 1,
      },
    });
  });
});
