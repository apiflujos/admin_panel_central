import { describe, expect, it } from "vitest";
import { buildAlegraAddress } from "./shopify-to-alegra.service";

/**
 * Caso real: el contacto 2276 de Alegra tenía datos CORRECTOS
 * (`department: "Nariño"`, `city: "Pasto"`), pero cada pedido suyo fallaba con
 * 2112 "El departamento es inválido" porque la actualización le mandaba sólo la
 * línea de calle y Alegra reemplaza la dirección entera con lo que recibe.
 */
describe("buildAlegraAddress", () => {
  const completa = { address: "Calle 1 #2-3", city: "Pasto", department: "Nariño" };
  const soloCalle = { address: "carrera 7e# 17a -56 @praga" };

  it("al ACTUALIZAR no envía una dirección incompleta: borraría la buena", () => {
    expect(buildAlegraAddress(soloCalle, true)).toBeUndefined();
    expect(buildAlegraAddress({ address: "Calle 1", city: "Pasto" }, true)).toBeUndefined();
    expect(buildAlegraAddress({ address: "Calle 1", department: "Nariño" }, true)).toBeUndefined();
  });

  it("al ACTUALIZAR sí envía la dirección completa", () => {
    expect(buildAlegraAddress(completa, true)).toEqual({
      address: "Calle 1 #2-3",
      city: "Pasto",
      department: "Nariño",
    });
  });

  it("al CREAR sí envía la calle sola: no hay nada que destruir", () => {
    expect(buildAlegraAddress(soloCalle, false)).toEqual({
      address: "carrera 7e# 17a -56 @praga",
    });
  });

  it("sin línea de calle no se envía dirección en ningún caso", () => {
    expect(buildAlegraAddress({}, false)).toBeUndefined();
    expect(buildAlegraAddress({}, true)).toBeUndefined();
    expect(buildAlegraAddress({ city: "Pasto", department: "Nariño" }, false)).toBeUndefined();
  });

  it("trata null igual que ausente (así llegan los campos de la base)", () => {
    expect(buildAlegraAddress({ address: "Calle 1", city: null, department: null }, true)).toBeUndefined();
    expect(buildAlegraAddress({ address: "Calle 1", city: null, department: null }, false)).toEqual({
      address: "Calle 1",
    });
  });
});
