import type { DesiredPricing, PriceSnapshot } from "../../shared/src";

export function normalizeMoneyValue(value: unknown): string | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed.toFixed(2);
}

export function resolveDesiredPricing(prices: PriceSnapshot): DesiredPricing {
  const basePrice = normalizeMoneyValue(prices.priceWithVat);
  const discountPrice = normalizeMoneyValue(prices.discountPriceWithVat);

  if (!basePrice) {
    return { price: null, compareAtPrice: null, strategy: "no_price" };
  }

  if (discountPrice && Number(discountPrice) < Number(basePrice)) {
    return {
      price: discountPrice,
      compareAtPrice: basePrice,
      strategy: "discount_active",
    };
  }

  return {
    price: basePrice,
    compareAtPrice: null,
    strategy: "base_price",
  };
}
