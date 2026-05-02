import { toAdminWebDashboardOverviewDto } from "./dashboard";

describe("domain/dashboard", () => {
  it("construye el overview del dashboard para admin-web", () => {
    expect(
      toAdminWebDashboardOverviewDto({
        settings: {
          companyName: "Oliva Shoes",
          moduleCount: 8,
          activeConnections: 4,
          pendingActions: 1,
        },
        products: {
          total: 120,
          items: [{ id: 1, reference: "REF-1", name: "Producto 1", inventory_quantity: 5, sync_status: "synced" }],
        },
        orders: {
          total: 33,
          items: [{ shopify_order_id: "10", shopify_order_number: "#1001", customer_name: "Ana", alegra_status: "facturado" }],
        },
        logs: {
          items: [{ id: 9, entity: "order", message: "Reintento pendiente", status: "fail" }],
        },
      })
    ).toEqual({
      companyName: "Oliva Shoes",
      moduleCount: 8,
      activeConnections: 4,
      pendingActions: 1,
      totalProducts: 120,
      totalOrders: 33,
      failedLogs: 1,
      highlights: [
        {
          id: "product:1",
          kind: "product",
          label: "REF-1",
          detail: "Producto 1",
          status: "synced",
          metric: "5 uds",
        },
        {
          id: "order:10",
          kind: "order",
          label: "#1001",
          detail: "Ana",
          status: "facturado",
          metric: "Sync",
        },
        {
          id: "log:9",
          kind: "log",
          label: "order",
          detail: "Reintento pendiente",
          status: "fail",
          metric: "Log",
        },
      ],
    });
  });
});
