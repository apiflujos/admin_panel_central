import { describe, expect, it } from "vitest";
import { resolvePublishEligibility } from "../../packages/domain/src/alegra";
import { aplicarPublicacionPorStock } from "./alegra-to-shopify.service";
import fs from "node:fs";
import path from "node:path";

/**
 * Regla de negocio de Becam: NO SE PUEDE SOBREVENDER.
 *
 * Alegra manda sobre el inventario. Un producto con existencias debe estar
 * publicado. Sin existencias, lo que ocurre lo decide `outOfStockBehavior`:
 * por omisión se queda publicado y AGOTADO (inventario en cero), y sólo con
 * "unpublish" se saca del escaparate.
 */
describe("publicación gobernada por el stock", () => {
  it("con existencias es elegible para publicarse", () => {
    expect(resolvePublishEligibility({ status: "active", availableQuantity: 5, publishOnStock: true })).toBe(true);
  });

  it("SIN existencias NO es elegible: es lo que evita la sobreventa", () => {
    expect(resolvePublishEligibility({ status: "active", availableQuantity: 0, publishOnStock: true })).toBe(false);
  });

  it("un ítem inactivo en Alegra nunca se publica, tenga stock o no", () => {
    expect(resolvePublishEligibility({ status: "inactive", availableQuantity: 99, publishOnStock: true })).toBe(false);
  });

  it("si no se publica por stock, las existencias dejan de mandar", () => {
    expect(resolvePublishEligibility({ status: "active", availableQuantity: 0, publishOnStock: false })).toBe(true);
  });

  /**
   * Guardia de regresión sobre el fallo del 2026-08-20: `autoPublishStatus`
   * estaba en "draft" y anulaba la regla de stock, despublicando 1.028
   * productos CON existencias. Sólo debe decidir el estado de los nuevos.
   */
  it("autoPublishStatus NO decide la publicación de productos existentes", () => {
    const fuente = fs.readFileSync(path.join(__dirname, "alegra-to-shopify.service.ts"), "utf8");
    // El valor que se manda a Shopify para un producto existente es el stock.
    expect(fuente).toMatch(/const desiredPublish = publishEligible;/);
    // Y la preferencia sólo se usa para los nuevos.
    expect(fuente).toMatch(/desiredPublishForNew\s*=\s*ctx\.autoPublishStatus === "active"/);
    // Nunca debe volver la fórmula que anulaba el stock.
    expect(fuente).not.toMatch(/const desiredPublish = ctx\.autoPublishStatus === "active"/);
  });

  it("las despublicaciones del sync se declaran como sin_stock para no frenarse", () => {
    const fuente = fs.readFileSync(path.join(__dirname, "alegra-to-shopify.service.ts"), "utf8");
    const llamadas = fuente.match(/updateProductStatus\([^)]*\)/g) || [];
    expect(llamadas.length).toBeGreaterThan(0);
    for (const llamada of llamadas) {
      expect(llamada).toContain('"sin_stock"');
    }
  });
});

describe("qué se hace al quedarse sin existencias", () => {
  function contextoFalso(overrides: Record<string, unknown> = {}) {
    const llamadas: { productId: string; publicar: boolean; motivo: string }[] = [];
    const ctx = {
      outOfStockBehavior: "mark_sold_out",
      shopify: {
        updateProductStatus: async (productId: string, publicar: boolean, motivo: string) => {
          llamadas.push({ productId, publicar, motivo });
        },
      },
      ...overrides,
    } as unknown as Parameters<typeof aplicarPublicacionPorStock>[0];
    return { ctx, llamadas };
  }

  it('con "mark_sold_out" NO despublica: el producto queda agotado y visible', async () => {
    const { ctx, llamadas } = contextoFalso();
    const resultado = await aplicarPublicacionPorStock(ctx, "gid://shopify/Product/1", false);
    expect(resultado).toBe("agotado_sigue_publicado");
    // Lo que evita la sobreventa es el inventario en cero, no el despublicado.
    expect(llamadas).toEqual([]);
  });

  it('con "unpublish" sí lo saca del escaparate', async () => {
    const { ctx, llamadas } = contextoFalso({ outOfStockBehavior: "unpublish" });
    const resultado = await aplicarPublicacionPorStock(ctx, "gid://shopify/Product/1", false);
    expect(resultado).toBe("aplicado");
    expect(llamadas).toEqual([{ productId: "gid://shopify/Product/1", publicar: false, motivo: "sin_stock" }]);
  });

  it("volver a tener existencias publica en cualquiera de las dos políticas", async () => {
    for (const politica of ["mark_sold_out", "unpublish"]) {
      const { ctx, llamadas } = contextoFalso({ outOfStockBehavior: politica });
      const resultado = await aplicarPublicacionPorStock(ctx, "gid://shopify/Product/9", true);
      expect(resultado, politica).toBe("aplicado");
      expect(llamadas, politica).toEqual([
        { productId: "gid://shopify/Product/9", publicar: true, motivo: "sin_stock" },
      ]);
    }
  });
});
