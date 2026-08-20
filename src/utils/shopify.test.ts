import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SHOPIFY_API_VERSION,
  assertShopifyApiVersionMatches,
  resetShopifyVersionWarningsForTests,
  resolveShopifyApiVersion,
} from "./shopify";

afterEach(() => {
  resetShopifyVersionWarningsForTests();
  vi.restoreAllMocks();
});

describe("resolveShopifyApiVersion", () => {
  it("usa la versión por defecto cuando no se pasa ninguna", () => {
    expect(resolveShopifyApiVersion()).toBe(DEFAULT_SHOPIFY_API_VERSION);
    expect(resolveShopifyApiVersion("")).toBe(DEFAULT_SHOPIFY_API_VERSION);
    expect(resolveShopifyApiVersion("   ")).toBe(DEFAULT_SHOPIFY_API_VERSION);
    expect(resolveShopifyApiVersion(null)).toBe(DEFAULT_SHOPIFY_API_VERSION);
  });

  it("la versión por defecto está anclada a una estable soportada, no a una retirada", () => {
    // El incidente que motivó este cambio: el default era "2024-04", retirada.
    expect(DEFAULT_SHOPIFY_API_VERSION).not.toBe("2024-04");
    expect(DEFAULT_SHOPIFY_API_VERSION).toMatch(/^\d{4}-\d{2}$/);
  });

  it("respeta una versión explícita", () => {
    expect(resolveShopifyApiVersion("2026-01")).toBe("2026-01");
    expect(resolveShopifyApiVersion("unstable")).toBe("unstable");
  });

  it("rechaza un formato inválido en vez de mandarlo a la URL", () => {
    expect(() => resolveShopifyApiVersion("2026")).toThrow(/inválida/i);
    expect(() => resolveShopifyApiVersion("latest")).toThrow(/inválida/i);
    expect(() => resolveShopifyApiVersion("v2026-07")).toThrow(/inválida/i);
  });
});

describe("assertShopifyApiVersionMatches", () => {
  it("no dice nada cuando Shopify sirve la versión pedida", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    assertShopifyApiVersionMatches("2026-07", "2026-07", { shopDomain: "t.myshopify.com" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("avisa cuando Shopify cae hacia otra versión (el fallo silencioso del incidente)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    assertShopifyApiVersionMatches("2024-04", "2025-10", { shopDomain: "mut50d-tj.myshopify.com" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0][0])).toContain("DESFASE DE VERSIÓN");
    expect(String(spy.mock.calls[0][0])).toContain("2025-10");
  });

  it("avisa UNA sola vez por tienda: si no, inundaría el log en cada petición", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (let i = 0; i < 50; i += 1) {
      assertShopifyApiVersionMatches("2024-04", "2025-10", { shopDomain: "mut50d-tj.myshopify.com" });
    }
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("ignora una cabecera ausente", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    assertShopifyApiVersionMatches("2026-07", null);
    assertShopifyApiVersionMatches("2026-07", "");
    expect(spy).not.toHaveBeenCalled();
  });
});
