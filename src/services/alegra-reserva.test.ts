import { describe, expect, it } from "vitest";
import { resolveAlegraAvailableQuantity } from "../../packages/domain/src/alegra";

/**
 * Alegra es la fuente de verdad del inventario. Si define un mínimo por bodega,
 * esas unidades están reservadas y no deben venderse: contarlas comprometería
 * stock que no existe para la tienda, que es la sobreventa a evitar.
 *
 * Los valores de bodega llegan como CADENA en el API ("150", "100").
 */
describe("cantidad disponible descontando la reserva de Alegra", () => {
  it("descuenta minQuantity del disponible", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: 10, minQuantity: 4 }] };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(6);
  });

  it("acepta los valores como cadena, tal como los envía el API", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: "150" as never, minQuantity: "100" }] };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(50);
  });

  it("si el disponible no supera la reserva, lo vendible es CERO (no negativo)", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: 3, minQuantity: 5 }] };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(0);
  });

  it("sin minQuantity se comporta como antes: no cambia nada", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: 7 }] };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(7);
    const inv0 = { warehouses: [{ id: "1", availableQuantity: 7, minQuantity: 0 }] };
    expect(resolveAlegraAvailableQuantity(inv0 as never)).toBe(7);
  });

  it("un disponible NEGATIVO se propaga: es sobreventa ya ocurrida y debe verse", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: -24, minQuantity: 5 }] };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(-24);
  });

  it("suma varias bodegas descontando la reserva de cada una", () => {
    const inv = {
      warehouses: [
        { id: "1", availableQuantity: 10, minQuantity: 2 },
        { id: "2", availableQuantity: 5, minQuantity: 1 },
      ],
    };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(12);
  });

  it("respeta el filtro por bodegas permitidas", () => {
    const inv = {
      warehouses: [
        { id: "1", availableQuantity: 10, minQuantity: 2 },
        { id: "2", availableQuantity: 100, minQuantity: 0 },
      ],
    };
    // Sólo la bodega 1 cuenta: la 2 no se vende online.
    expect(resolveAlegraAvailableQuantity(inv as never, ["1"])).toBe(8);
  });
});
