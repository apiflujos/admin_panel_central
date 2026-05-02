import { normalizeMoneyValue, resolveDesiredPricing } from "./pricing";

describe("domain/pricing", () => {
  it("usa el precio con descuento como price y el base como compareAtPrice", () => {
    expect(
      resolveDesiredPricing({
        priceWithVat: 425000,
        discountPriceWithVat: 212500,
        general: 0,
        discountBeforeVat: 0,
      })
    ).toEqual({
      price: "212500.00",
      compareAtPrice: "425000.00",
      strategy: "discount_active",
    });
  });

  it("deja compareAtPrice vacio cuando no hay descuento valido", () => {
    expect(
      resolveDesiredPricing({
        priceWithVat: 205000,
        discountPriceWithVat: 0,
        general: 0,
        discountBeforeVat: 0,
      })
    ).toEqual({
      price: "205000.00",
      compareAtPrice: null,
      strategy: "base_price",
    });
  });

  it("normaliza numeros invalidos a null", () => {
    expect(normalizeMoneyValue("")).toBeNull();
    expect(normalizeMoneyValue(-10)).toBeNull();
  });
});
