import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("../db", () => ({
  getOrgId: () => 11,
  getPool: () => ({ query: queryMock }),
}));

describe("mapeos de pedidos multi-tienda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMock.mockResolvedValue({ rows: [] });
  });

  it("no usa un mapping histórico sin tienda cuando se pide una tienda concreta", async () => {
    const { getMappingByShopifyId } = await import("./mapping.service");

    await getMappingByShopifyId("order", "1001", "becam.myshopify.com");

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("$2 <> 'order' AND metadata_json->>'shopDomain' IS NULL");
    expect(params).toEqual([11, "order", ["1001", "gid://shopify/Order/1001"], "becam.myshopify.com"]);
  });
});
