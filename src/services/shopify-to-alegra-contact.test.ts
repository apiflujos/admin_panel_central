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
  it("marca hasRealIdentification=true cuando el teléfono tiene ≥6 dígitos", () => {
    const result = mapShopifyToAlegraContact(basePayload as never, "cliente@ejemplo.com", {});
    expect(result.hasRealIdentification).toBe(true);
    expect(result.identification).toBe("3001234567");
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

  it("strippea el prefijo +57 en teléfonos colombianos", () => {
    const payload = { customer: { ...basePayload.customer, phone: "+57 300 123 4567" } };
    const result = mapShopifyToAlegraContact(payload as never, "cliente@ejemplo.com", {});
    expect(result.identification).toBe("3001234567");
    expect(result.hasRealIdentification).toBe(true);
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
