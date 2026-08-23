import { describe, expect, it } from "vitest";

import { mapShopifyToAlegraContact } from "./shopify-to-alegra.service";

const basePayload = {
  customer: {
    id: 1,
    email: "cliente@ejemplo.com",
    phone: "3001234567",
    default_address: { address1: "Cra 1", city: "Bogotá" },
  },
};

describe("mapShopifyToAlegraContact — identification fail-closed", () => {
  it("un CELULAR colombiano NO se toma como cédula", () => {
    // 10 dígitos que empiezan por 3 es un móvil, no un documento. Antes se
    // usaba como identificación y a esos clientes se les facturaba con su
    // número de celular en el campo de la cédula.
    const result = mapShopifyToAlegraContact(basePayload as never, "cliente@ejemplo.com", {});
    expect(result.hasRealIdentification).toBe(false);
    expect(result.identification).toBe("");
  });

  it("un teléfono que NO parece móvil sí sirve de identificación", () => {
    const payload = { customer: { ...basePayload.customer, phone: "6011234567" } };
    const result = mapShopifyToAlegraContact(payload as never, "cliente@ejemplo.com", {});
    expect(result.hasRealIdentification).toBe(true);
    expect(result.identification).toBe("6011234567");
  });

  it("la cédula recogida en `company` manda sobre el teléfono", () => {
    // Es el campo donde Becam la pide en el checkout.
    const payload = {
      customer: {
        ...basePayload.customer,
        default_address: { ...basePayload.customer.default_address, company: "1028024790" },
      },
    };
    const result = mapShopifyToAlegraContact(payload as never, "cliente@ejemplo.com", {});
    expect(result.identification).toBe("1028024790");
    expect(result.hasRealIdentification).toBe(true);
  });

  it("marca hasRealIdentification=false cuando el teléfono está vacío", () => {
    const payload = { customer: { ...basePayload.customer, phone: "" } };
    const result = mapShopifyToAlegraContact(payload as never, "cliente@ejemplo.com", {});
    expect(result.hasRealIdentification).toBe(false);
    expect(result.identification).toBe(""); // NO devuelve "3000000000" (bug removido)
  });

  it("marca hasRealIdentification=false cuando el teléfono tiene <6 dígitos", () => {
    const payload = { customer: { ...basePayload.customer, phone: "300" } };
    const result = mapShopifyToAlegraContact(payload as never, "cliente@ejemplo.com", {});
    expect(result.hasRealIdentification).toBe(false);
  });

  it("quita el prefijo +57 antes de decidir, y sigue siendo un móvil", () => {
    // Se normaliza el prefijo para reconocer el móvil: sin quitarlo, +57 300…
    // tendría 12 dígitos y no se detectaría como celular.
    const payload = { customer: { ...basePayload.customer, phone: "+57 300 123 4567" } };
    const result = mapShopifyToAlegraContact(payload as never, "cliente@ejemplo.com", {});
    expect(result.hasRealIdentification).toBe(false);
    expect(result.identification).toBe("");
  });

  it("con prefijo +57, un fijo sí sirve", () => {
    const payload = { customer: { ...basePayload.customer, phone: "+57 601 123 4567" } };
    const result = mapShopifyToAlegraContact(payload as never, "cliente@ejemplo.com", {});
    expect(result.identification).toBe("6011234567");
  });

  it("respeta override e-invoice con idNumber", () => {
    const result = mapShopifyToAlegraContact(basePayload as never, "cliente@ejemplo.com", {
      einvoiceActive: true,
      override: { idNumber: "900123456", idType: "NIT" },
    });
    expect(result.identification).toBe("900123456");
    expect(result.identificationType).toBe("NIT");
    expect(result.hasRealIdentification).toBe(true);
  });

  it("NUNCA fabrica NIT '3000000000' (regresión del bug CT-4)", () => {
    const payload = { customer: { id: 1, email: "sin@phone.com", phone: null } };
    const result = mapShopifyToAlegraContact(payload as never, "sin@phone.com", {});
    expect(result.identification).not.toBe("3000000000");
    expect(result.hasRealIdentification).toBe(false);
  });

  it("identificationType default a CC cuando no hay override", () => {
    const result = mapShopifyToAlegraContact(basePayload as never, "cliente@ejemplo.com", {});
    expect(result.identificationType).toBe("CC");
  });
});
