import { describe, expect, it } from "vitest";
import { resolveAlegraAvailableQuantity } from "../../packages/domain/src/alegra";

/**
 * `minQuantity` en Alegra es el umbral de ALERTA DE REPOSICIÓN: avisa al
 * facturar cuando el inventario baja de ese nivel, pero NO impide vender por
 * debajo. No es una reserva intocable.
 *
 * Por eso el comportamiento por defecto es NO descontarlo. Tratarlo como stock
 * de seguridad es una decisión de negocio que toma nuestro sistema de forma
 * explícita, nunca por suposición.
 *
 * Los valores de bodega llegan como CADENA en el API ("150", "100").
 */
describe("cantidad disponible y el mínimo de Alegra", () => {
  it("POR DEFECTO no descuenta minQuantity: Alegra permite vender por debajo", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: 10, minQuantity: 4 }] };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(10);
  });

  it("lo descuenta SÓLO si se pide expresamente", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: 10, minQuantity: 4 }] };
    expect(resolveAlegraAvailableQuantity(inv as never, [], true)).toBe(6);
  });

  it("acepta los valores como cadena, tal como los envía el API", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: "150" as never, minQuantity: "100" }] };
    expect(resolveAlegraAvailableQuantity(inv as never, [], true)).toBe(50);
  });

  it("reservando: si el disponible no supera el mínimo, lo vendible es CERO", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: 3, minQuantity: 5 }] };
    expect(resolveAlegraAvailableQuantity(inv as never, [], true)).toBe(0);
  });

  it("sin minQuantity el resultado es el mismo en ambos modos", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: 7 }] };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(7);
    expect(resolveAlegraAvailableQuantity(inv as never, [], true)).toBe(7);
  });

  it("un disponible NEGATIVO se propaga: es sobreventa ya ocurrida y debe verse", () => {
    const inv = { warehouses: [{ id: "1", availableQuantity: -24, minQuantity: 5 }] };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(-24);
    expect(resolveAlegraAvailableQuantity(inv as never, [], true)).toBe(-24);
  });

  it("suma varias bodegas", () => {
    const inv = {
      warehouses: [
        { id: "1", availableQuantity: 10, minQuantity: 2 },
        { id: "2", availableQuantity: 5, minQuantity: 1 },
      ],
    };
    expect(resolveAlegraAvailableQuantity(inv as never)).toBe(15);
    expect(resolveAlegraAvailableQuantity(inv as never, [], true)).toBe(12);
  });

  it("respeta el filtro por bodegas permitidas", () => {
    const inv = {
      warehouses: [
        { id: "1", availableQuantity: 10, minQuantity: 2 },
        { id: "2", availableQuantity: 100, minQuantity: 0 },
      ],
    };
    expect(resolveAlegraAvailableQuantity(inv as never, ["1"])).toBe(10);
  });
});
