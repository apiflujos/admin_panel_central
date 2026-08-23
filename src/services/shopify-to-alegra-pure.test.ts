import { describe, expect, it } from "vitest";

import { buildContactName, buildInvoicePayload } from "./shopify-to-alegra.service";

describe("buildContactName", () => {
  it("junta first_name + last_name trimmed", () => {
    const payload = { customer: { first_name: "Juan", last_name: "Perez" }, email: "" } as never;
    expect(buildContactName(payload)).toBe("Juan Perez");
  });

  it("cae a email cuando no hay nombre", () => {
    const payload = { customer: { first_name: "", last_name: "" }, email: "cliente@ejemplo.com" } as never;
    expect(buildContactName(payload)).toBe("cliente@ejemplo.com");
  });

  it("cae a 'Cliente Shopify' cuando no hay nada", () => {
    expect(buildContactName({ customer: {}, email: "" } as never)).toBe("Cliente Shopify");
  });

  it("maneja whitespace en first_name", () => {
    const payload = { customer: { first_name: "   ", last_name: "Perez" } } as never;
    expect(buildContactName(payload)).toBe("Perez");
  });
});

const baseSettings = {
  generateInvoice: true,
  resolutionId: "10",
  costCenterId: "5",
  warehouseId: "3",
  sellerId: "7",
  paymentMethod: "cash",
  bankAccountId: "20",
  applyPayment: true,
  observationsTemplate: "Order: {order_number}",
  einvoiceEnabled: false,
};

describe("buildInvoicePayload", () => {
  it("mapea line_items con quantity + price + name", () => {
    const payload = {
      line_items: [
        { title: "Zapato A", price: "50000", quantity: 2 },
        { title: "Bolso B", price: "30000", quantity: 1 },
      ],
    } as never;
    const result = buildInvoicePayload(payload, "123", baseSettings);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ name: "Zapato A", price: 50000, quantity: 2 });
    expect(result.items[1]).toMatchObject({ name: "Bolso B", price: 30000, quantity: 1 });
  });

  it("prefiere discounted_price sobre price cuando existe", () => {
    const payload = {
      line_items: [{ title: "Item", price: "100", discounted_price: "80", quantity: 1 }],
    } as never;
    const result = buildInvoicePayload(payload, "1", baseSettings);
    expect(result.items[0].price).toBe(80);
  });

  it("agrega shipping como line item si tiene price > 0", () => {
    const payload = {
      line_items: [{ title: "X", price: "100", quantity: 1 }],
      shipping_lines: [{ title: "Envío express", price: "15000" }],
    } as never;
    const result = buildInvoicePayload(payload, "1", baseSettings);
    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toMatchObject({ name: "Envío express", price: 15000, quantity: 1 });
  });

  it("descarta shipping con price = 0", () => {
    const payload = {
      line_items: [{ title: "X", price: "100", quantity: 1 }],
      shipping_lines: [{ title: "Gratis", price: "0" }],
    } as never;
    const result = buildInvoicePayload(payload, "1", baseSettings);
    expect(result.items).toHaveLength(1);
  });

  it("paymentMethod de la factura: CASH si contado, omitido si crédito", () => {
    // La factura de esta cuenta Alegra solo acepta "CASH" (contado) u omitido
    // (crédito). El método de la pasarela va en el pago, no en la factura.
    const paid = { line_items: [], financial_status: "paid" } as never;
    expect(buildInvoicePayload(paid, "1", baseSettings).paymentForm).toBe("CASH");
    expect(buildInvoicePayload(paid, "1", baseSettings).paymentMethod).toBe("CASH");
    const credit = { line_items: [] } as never; // sin financial_status → CREDIT
    const creditResult = buildInvoicePayload(credit, "1", baseSettings) as {
      paymentForm: string;
      paymentMethod?: string;
    };
    expect(creditResult.paymentForm).toBe("CREDIT");
    expect(creditResult.paymentMethod).toBeUndefined();
  });

  it("aplica taxes a cada item cuando se pasa taxRules", () => {
    const payload = {
      line_items: [{ title: "X", price: "100", quantity: 1 }],
      shipping_lines: [{ title: "Envío", price: "10" }],
    } as never;
    const result = buildInvoicePayload(payload, "1", baseSettings, undefined, [
      { alegraTaxId: "1" },
      { alegraTaxId: "2" },
    ]);
    expect(result.items[0]).toHaveProperty("tax");
    expect((result.items[0] as { tax: Array<{ id: number }> }).tax).toEqual([{ id: 1 }, { id: 2 }]);
    // shipping también recibe tax
    expect((result.items[1] as { tax: Array<{ id: number }> }).tax).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("descarta taxRules con alegraTaxId vacío o 0 (queda array vacío)", () => {
    const payload = { line_items: [{ title: "X", price: "100", quantity: 1 }] } as never;
    const result = buildInvoicePayload(payload, "1", baseSettings, undefined, [
      { alegraTaxId: "0" },
      { alegraTaxId: "" },
    ]);
    expect((result.items[0] as { tax?: Array<{ id: number }> }).tax).toEqual([]);
  });

  it("propaga costCenter, seller, warehouse, resolution como {id: number}", () => {
    const result = buildInvoicePayload({ line_items: [] } as never, "1", baseSettings);
    expect(result.resolution).toEqual({ id: 10 });
    expect(result.costCenter).toEqual({ id: 5 });
    expect(result.warehouse).toEqual({ id: 3 });
    expect(result.seller).toEqual({ id: 7 });
  });

  it("omite campos cuando settings tienen strings vacíos", () => {
    const empty = { ...baseSettings, resolutionId: "", costCenterId: "", warehouseId: "", sellerId: "" };
    const result = buildInvoicePayload({ line_items: [] } as never, "1", empty);
    expect(result.resolution).toBeUndefined();
    expect(result.costCenter).toBeUndefined();
    expect(result.warehouse).toBeUndefined();
    expect(result.seller).toBeUndefined();
  });

  it("client se propaga como Number(contactId)", () => {
    const result = buildInvoicePayload({ line_items: [] } as never, "42", baseSettings);
    expect(result.client).toBe(42);
  });

  // El estado de la factura lo decide `einvoiceEnabled`, NO una perilla aparte:
  //  - OFF -> "draft": pruebas desde Shopify que NO se emiten a la DIAN.
  //  - ON  -> "open": se emite electronicamente.
  // Habia un `invoiceStatus` configurable que el motor jamas leia; se elimino
  // en vez de dejar en la pantalla un ajuste que no mandaba nada.
  it("factura electronica APAGADA -> borrador, no se emite a la DIAN", () => {
    const result = buildInvoicePayload({ line_items: [] } as never, "1", {
      ...baseSettings,
      einvoiceEnabled: false,
    });
    expect(result.status).toBe("draft");
  });

  it("factura electronica ENCENDIDA -> open, se emite", () => {
    const result = buildInvoicePayload({ line_items: [] } as never, "1", {
      ...baseSettings,
      einvoiceEnabled: true,
    });
    expect(result.status).toBe("open");
  });
});
