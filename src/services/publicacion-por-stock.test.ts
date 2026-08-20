import { describe, expect, it } from "vitest";
import { resolvePublishEligibility } from "../../packages/domain/src/alegra";
import fs from "node:fs";
import path from "node:path";

/**
 * Regla de negocio de Becam: NO SE PUEDE SOBREVENDER.
 *
 * Alegra manda sobre el inventario. Un producto con existencias debe estar
 * publicado; sin existencias debe despublicarse, aunque sean muchos a la vez.
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
