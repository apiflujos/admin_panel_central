import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShopifyClient, resetUnpublishLimiterForTests } from "./shopify";

/**
 * El 2026-08-20 se despublicaron 1.028 productos y, tras dar el arreglo por
 * bueno, otros 836. Nada acotaba el volumen: cada llamada era válida por
 * separado. Este freno existe para que el daño quede en unas pocas unidades
 * aunque la configuración vuelva a resolverse mal.
 */
describe("freno de despublicación masiva", () => {
  const original = process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR;
  let cliente: ShopifyClient;

  beforeEach(() => {
    resetUnpublishLimiterForTests();
    cliente = new ShopifyClient({ shopDomain: "tienda.myshopify.com", accessToken: "x" });
    // Ninguna petición debe llegar a la red: el freno actúa antes.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("no debería llamarse a la red");
      })
    );
  });

  afterEach(() => {
    if (original === undefined) delete process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR;
    else process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR = original;
    resetUnpublishLimiterForTests();
    vi.unstubAllGlobals();
  });

  it("corta la despublicación al superar el límite", async () => {
    process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR = "3";
    // Las 3 primeras pasan el freno y mueren en la red (fetch simulado).
    for (let i = 0; i < 3; i += 1) {
      await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(
        /no debería llamarse a la red/
      );
    }
    // La cuarta la corta el freno, sin llegar a la red.
    await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(
      /Despublicación bloqueada/
    );
  });

  it("NO limita las publicaciones: republicar nunca hace daño", async () => {
    process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR = "1";
    // Muchas publicaciones seguidas: ninguna debe toparse con el freno.
    for (let i = 0; i < 10; i += 1) {
      await expect(cliente.updateProductStatus("gid://shopify/Product/1", true)).rejects.toThrow(
        /no debería llamarse a la red/
      );
    }
  });

  it("con 0 no se despublica nada: interruptor de emergencia", async () => {
    process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR = "0";
    await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(
      /Despublicación bloqueada/
    );
  });

  it("el cupo es por tienda, no global", async () => {
    process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR = "1";
    const otra = new ShopifyClient({ shopDomain: "otra.myshopify.com", accessToken: "x" });
    await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(/red/);
    await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(/bloqueada/);
    // Agotar una tienda no puede bloquear a la otra.
    await expect(otra.updateProductStatus("gid://shopify/Product/2", false)).rejects.toThrow(/red/);
  });

  it("NUNCA frena una despublicación por FALTA DE STOCK: sobrevender es peor", async () => {
    // Regla del cliente: no se puede sobrevender. Si Alegra se queda sin
    // existencias hay que despublicar, aunque sean cientos a la vez.
    process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR = "1";
    for (let i = 0; i < 30; i += 1) {
      await expect(cliente.updateProductStatus("gid://shopify/Product/1", false, "sin_stock")).rejects.toThrow(
        /no debería llamarse a la red/
      );
    }
  });

  it("las despublicaciones por stock no consumen el cupo de las demás", async () => {
    process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR = "2";
    // 10 por falta de stock: no gastan cupo.
    for (let i = 0; i < 10; i += 1) {
      await expect(cliente.updateProductStatus("gid://shopify/Product/1", false, "sin_stock")).rejects.toThrow(/red/);
    }
    // El cupo de las "otras" sigue intacto: 2 pasan, la 3ª se corta.
    await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(/red/);
    await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(/red/);
    await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(/bloqueada/);
  });

  it("un valor inválido cae al defecto, nunca a 'sin límite'", async () => {
    process.env.SHOPIFY_MAX_UNPUBLISH_PER_HOUR = "no-es-numero";
    for (let i = 0; i < 20; i += 1) {
      await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(/red/);
    }
    await expect(cliente.updateProductStatus("gid://shopify/Product/1", false)).rejects.toThrow(/bloqueada/);
  });
});
