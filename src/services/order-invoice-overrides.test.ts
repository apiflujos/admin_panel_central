import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("../db", () => ({
  getOrgId: () => 7,
  getPool: () => ({ query: queryMock }),
}));

describe("order invoice overrides multi-tienda", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consulta el override por organización, tienda y pedido", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { getOrderInvoiceOverride } = await import("./order-invoice-overrides.service");

    await getOrderInvoiceOverride("1001", "becam.myshopify.com");

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("shop_domain = $3"), [
      7,
      "1001",
      "becam.myshopify.com",
    ]);
  });

  it("guarda dos tiendas bajo una clave de conflicto que incluye el dominio", async () => {
    queryMock.mockResolvedValue({ rows: [] });
    const { upsertOrderInvoiceOverride } = await import("./order-invoice-overrides.service");

    await upsertOrderInvoiceOverride("1001", { orderId: "1001", einvoiceRequested: true }, "belia.myshopify.com");

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("ON CONFLICT (organization_id, shop_domain, order_id)");
    expect(params.slice(0, 3)).toEqual([7, "belia.myshopify.com", "1001"]);
  });

  it("mantiene separados los resultados de pedidos con el mismo ID", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          order_id: "1001",
          shop_domain: "becam.myshopify.com",
          einvoice_requested: true,
          fiscal_name: "Becam",
        },
        {
          order_id: "1001",
          shop_domain: "belia.myshopify.com",
          einvoice_requested: false,
          fiscal_name: "Belia",
        },
      ],
    });
    const { listOrderInvoiceOverrides, orderOverrideKey } = await import("./order-invoice-overrides.service");
    const result = await listOrderInvoiceOverrides([
      { orderId: "1001", shopDomain: "becam.myshopify.com" },
      { orderId: "1001", shopDomain: "belia.myshopify.com" },
    ]);

    expect(result.get(orderOverrideKey("1001", "becam.myshopify.com"))?.fiscalName).toBe("Becam");
    expect(result.get(orderOverrideKey("1001", "belia.myshopify.com"))?.fiscalName).toBe("Belia");
  });
});
