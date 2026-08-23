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

  it("las cuentas vienen de la BASE, no de la página que tocó ver", () => {
    // Antes el resumen se calculaba sobre las filas traídas (200 fijas): la
    // pantalla decía «Total · 200» habiendo 51.656 registros, y «Fallidos · 12»
    // contando sólo dentro de ese trozo. Se decide con esos números.
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
        // Dos filas en la página, pero 51.656 que cumplen el filtro.
        total: 51656,
        failedCount: 13337,
        retryingCount: 240,
        limit: 50,
        offset: 100,
      })
    ).toMatchObject({
      filters: { status: "fail" },
      summary: {
        total: 51656,
        failedCount: 13337,
        retryingCount: 240,
      },
      limit: 50,
      offset: 100,
    });
  });

  it("la página devuelta sigue siendo la que llegó", () => {
    const dto = toAdminWebLogsListDto({
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
      ],
      filters: {},
      total: 900,
      failedCount: 5,
      retryingCount: 0,
      limit: 50,
      offset: 0,
    });
    // Una fila en pantalla, 900 en total: son cosas distintas y no se mezclan.
    expect(dto.items).toHaveLength(1);
    expect(dto.summary.total).toBe(900);
  });
});
