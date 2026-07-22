import { describe, expect, it } from "vitest";

import { ZERO_DECIMAL_CURRENCIES, formatPrice } from "./alegra-invoices-to-shopify-orders.service";

describe("ZERO_DECIMAL_CURRENCIES set", () => {
  it("incluye monedas ISO 4217 sin decimales", () => {
    ["JPY", "KRW", "VND", "CLP", "PYG", "ISK"].forEach((c) => expect(ZERO_DECIMAL_CURRENCIES.has(c)).toBe(true));
  });
  it("incluye COP (uso operativo local)", () => {
    expect(ZERO_DECIMAL_CURRENCIES.has("COP")).toBe(true);
  });
  it("NO incluye USD/EUR/MXN", () => {
    ["USD", "EUR", "MXN", "GBP"].forEach((c) => expect(ZERO_DECIMAL_CURRENCIES.has(c)).toBe(false));
  });
});

describe("formatPrice", () => {
  it("emite entero para currencies zero-decimal (COP)", () => {
    expect(formatPrice(50000, "COP")).toBe("50000");
    expect(formatPrice(50000.75, "COP")).toBe("50001");
  });

  it("emite dos decimales para USD", () => {
    expect(formatPrice(50000, "USD")).toBe("50000.00");
    expect(formatPrice(50000.5, "USD")).toBe("50000.50");
  });

  it("es case-insensitive con currency", () => {
    expect(formatPrice(100, "cop")).toBe("100");
    expect(formatPrice(100, "Usd")).toBe("100.00");
  });

  it("default a 2 decimales cuando no se pasa currency", () => {
    expect(formatPrice(100)).toBe("100.00");
    expect(formatPrice(100, null)).toBe("100.00");
  });

  it("input inválido retorna '0' o '0.00' según currency", () => {
    expect(formatPrice("no-es-numero", "COP")).toBe("0");
    expect(formatPrice("no-es-numero", "USD")).toBe("0.00");
    expect(formatPrice(undefined, "JPY")).toBe("0");
    expect(formatPrice(undefined, "EUR")).toBe("0.00");
  });

  it("parsea strings numéricos", () => {
    expect(formatPrice("1500.50", "USD")).toBe("1500.50");
    expect(formatPrice("1500", "COP")).toBe("1500");
  });

  it("maneja negativos (refunds parciales)", () => {
    expect(formatPrice(-500, "USD")).toBe("-500.00");
    expect(formatPrice(-500, "COP")).toBe("-500");
  });
});
