import { describe, expect, it } from "vitest";

import { invoiceMatchesShopifyCustomer } from "./operations.service";

const target = { targetDate: "2026-07-20", email: "cliente@ejemplo.com", phone: "3001234567" };

describe("invoiceMatchesShopifyCustomer — dedupe estricto", () => {
  it("match por email exacto (case-insensitive) en misma fecha", () => {
    const invoice = { date: "2026-07-20", client: { email: "Cliente@Ejemplo.COM" } };
    const result = invoiceMatchesShopifyCustomer(invoice, target);
    expect(result.matches).toBe(true);
    expect(result.onSameDate).toBe(true);
  });

  it("match por identification === phone en misma fecha", () => {
    const invoice = { date: "2026-07-20", client: { identification: "3001234567" } };
    const result = invoiceMatchesShopifyCustomer(invoice, target);
    expect(result.matches).toBe(true);
  });

  it("NO match si la fecha es distinta", () => {
    const invoice = { date: "2026-07-19", client: { email: "cliente@ejemplo.com" } };
    const result = invoiceMatchesShopifyCustomer(invoice, target);
    expect(result.matches).toBe(false);
    expect(result.onSameDate).toBe(false);
  });

  it("NO match por substring de identification (regresión bug H14)", () => {
    // El bug anterior: identification.includes(phone) devolvía true.
    const invoice = { date: "2026-07-20", client: { identification: "1030012345678" } };
    const result = invoiceMatchesShopifyCustomer(invoice, target);
    expect(result.matches).toBe(false);
  });

  it("NO match cuando phone target está vacío (no debería colapsar a match por ausencia)", () => {
    const invoice = { date: "2026-07-20", client: { identification: "" } };
    const result = invoiceMatchesShopifyCustomer(invoice, { ...target, phone: "" });
    expect(result.matches).toBe(false);
  });

  it("NO match cuando email target está vacío", () => {
    const invoice = { date: "2026-07-20", client: { email: "" } };
    const result = invoiceMatchesShopifyCustomer(invoice, { ...target, email: "", phone: "9999" });
    expect(result.matches).toBe(false);
  });

  it("strippea no-dígitos de identification antes de comparar", () => {
    const invoice = { date: "2026-07-20", client: { identification: "300-123-4567" } };
    const result = invoiceMatchesShopifyCustomer(invoice, target);
    expect(result.matches).toBe(true);
  });

  it("acepta datetime como alternativa a date", () => {
    const invoice = { datetime: "2026-07-20T14:30:00Z", client: { email: "cliente@ejemplo.com" } };
    const result = invoiceMatchesShopifyCustomer(invoice, target);
    expect(result.matches).toBe(true);
  });

  it("no hay cross-client leak: emails distintos con misma inicial NO matchean", () => {
    const invoice = { date: "2026-07-20", client: { email: "otro@ejemplo.com" } };
    const result = invoiceMatchesShopifyCustomer(invoice, target);
    expect(result.matches).toBe(false);
  });
});
