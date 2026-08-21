import { describe, expect, it } from "vitest";

import { buildAlegraAddress, mapShopifyToAlegraContact, resolveKindOfPerson } from "./shopify-to-alegra.service";
import { alegraContactPayloadSchema } from "../contracts/alegra";

/**
 * Dos fallos que impedían facturar, confirmados contra la documentación oficial
 * de Alegra (https://developer.alegra.com/reference/post_contacts):
 *
 *  - 2112 «El departamento es inválido»: el departamento salía SÓLO del override
 *    de facturación electrónica. Como no hay ninguno cargado, viajaba vacío
 *    aunque el pedido de Shopify traía `province: "Meta"`.
 *  - 2032 «El tipo de persona es obligatorio»: nunca se enviaba `kindOfPerson`.
 *
 * El ejemplo de la propia documentación de Alegra es `city: "Acacías",
 * department: "Meta"` — literalmente uno de los pedidos que fallaban.
 */
function pedido(province: string | null, city = "Acacías") {
  return {
    id: 7239517569254,
    email: "cliente@ejemplo.com",
    customer: {
      id: 1,
      first_name: "Ana",
      last_name: "Ruiz",
      phone: "+573142480984",
      default_address: {
        address1: "Calle 10 # 5-20",
        city,
        province,
        country: "Colombia",
        company: "1028024790",
      },
    },
  } as unknown as Parameters<typeof mapShopifyToAlegraContact>[0];
}

describe("departamento del contacto de Alegra", () => {
  it("sale de `province` del pedido cuando no hay override", () => {
    const contacto = mapShopifyToAlegraContact(pedido("Meta"), "cliente@ejemplo.com", {});
    expect(contacto.department).toBe("Meta");
    expect(contacto.city).toBe("Acacías");
  });

  it("el override de facturación electrónica sigue mandando cuando está activo", () => {
    const contacto = mapShopifyToAlegraContact(pedido("Meta"), "cliente@ejemplo.com", {
      einvoiceActive: true,
      override: { state: "Antioquia", city: "Medellín" },
    });
    expect(contacto.department).toBe("Antioquia");
  });

  it("sin province no se inventa un departamento", () => {
    const contacto = mapShopifyToAlegraContact(pedido(null), "cliente@ejemplo.com", {});
    expect(contacto.department).toBeUndefined();
  });

  it("con departamento la dirección viaja COMPLETA también al actualizar", () => {
    // Éste era el fallo: al actualizar, sin departamento la dirección no se
    // enviaba, y el contacto quedaba con la que Alegra ya tenía (o sin ella),
    // provocando el 2112.
    const contacto = mapShopifyToAlegraContact(pedido("Meta"), "cliente@ejemplo.com", {});
    expect(buildAlegraAddress(contacto, true)).toEqual({
      address: "Calle 10 # 5-20",
      city: "Acacías",
      department: "Meta",
    });
  });
});

describe("tipo de persona (kindOfPerson)", () => {
  it("un NIT es persona jurídica", () => {
    expect(resolveKindOfPerson("NIT")).toBe("LEGAL_ENTITY");
    expect(resolveKindOfPerson("nit")).toBe("LEGAL_ENTITY");
  });

  it("cédula, cédula de extranjería o pasaporte son persona natural", () => {
    for (const tipo of ["CC", "CE", "PP", "TI"]) {
      expect(resolveKindOfPerson(tipo), tipo).toBe("PERSON_ENTITY");
    }
  });

  it("ante la duda, persona natural", () => {
    expect(resolveKindOfPerson(null)).toBe("PERSON_ENTITY");
    expect(resolveKindOfPerson(undefined)).toBe("PERSON_ENTITY");
    expect(resolveKindOfPerson("")).toBe("PERSON_ENTITY");
  });
});

describe("contrato del contacto", () => {
  it("acepta los tres valores que documenta Alegra", () => {
    for (const valor of ["LEGAL_ENTITY", "PERSON_ENTITY", "OTHER_ENTITY"]) {
      const resultado = alegraContactPayloadSchema.safeParse({ name: "Ana", kindOfPerson: valor });
      expect(resultado.success, valor).toBe(true);
    }
  });

  it("rechaza un tipo de persona inventado", () => {
    expect(alegraContactPayloadSchema.safeParse({ name: "Ana", kindOfPerson: "PERSONA" }).success).toBe(false);
  });

  it("sigue rechazando campos sueltos que Alegra no admite en la raíz", () => {
    expect(alegraContactPayloadSchema.safeParse({ name: "Ana", department: "Meta" }).success).toBe(false);
  });
});
