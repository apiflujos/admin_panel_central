import type {
  PreparedInventoryWorkbookRow,
  PublicationMatchedRow,
  PublicationPlan,
  PublicationUnmatchedRow,
  ShopifyProductForPublication,
  ShopifyVariantSnapshot,
} from "../../shared/src";
import { extractReferenceStem, normalizeIdentifier, pickBestVariant, type VariantIndex } from "./matching";
import { resolveDesiredPricing } from "./pricing";

export function buildShopifyVariantIndex(products: ShopifyProductForPublication[]): VariantIndex {
  const exactSku = new Map<string, ShopifyVariantSnapshot[]>();
  const exactBarcode = new Map<string, ShopifyVariantSnapshot[]>();
  const byReferenceStem = new Map<string, ShopifyVariantSnapshot[]>();

  const push = (map: Map<string, ShopifyVariantSnapshot[]>, key: string, value: ShopifyVariantSnapshot) => {
    if (!key) return;
    const current = map.get(key) || [];
    current.push(value);
    map.set(key, current);
  };

  for (const product of products) {
    for (const edge of product.variants.edges) {
      const variant = edge.node;
      const skuKey = normalizeIdentifier(variant.sku);
      const barcodeKey = normalizeIdentifier(variant.barcode);
      const referenceStem = extractReferenceStem(variant.sku || variant.barcode);
      push(exactSku, skuKey, variant);
      push(exactBarcode, barcodeKey, variant);
      push(byReferenceStem, referenceStem, variant);
    }
  }

  return { exactSku, exactBarcode, byReferenceStem };
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  return Array.from(new Map(items.map((item) => [keyFn(item), item])).values());
}

export function planPreparedRowsForShopify(
  rows: PreparedInventoryWorkbookRow[],
  variantIndex: VariantIndex
): PublicationPlan {
  const matched: PublicationMatchedRow[] = [];
  const unmatched: PublicationUnmatchedRow[] = [];

  for (const row of rows) {
    const resolution = pickBestVariant(row, variantIndex);
    const desiredPricing = resolveDesiredPricing(row.prices);
    if (!resolution.variant || !resolution.variant.inventoryItemId) {
      unmatched.push({
        reference: row.reference,
        parentName: row.parentName,
        variantLabel: row.variantLabel,
        name: row.name,
        selectedQuantity: row.selectedQuantity,
        reason: "unmatched",
      });
      continue;
    }

    matched.push({
      ...row,
      desiredPrice: desiredPricing.price,
      desiredCompareAtPrice: desiredPricing.compareAtPrice,
      priceStrategy: desiredPricing.strategy,
      productId: resolution.variant.productId,
      inventoryItemId: resolution.variant.inventoryItemId,
      variantId: resolution.variant.variantId,
      sku: resolution.variant.sku,
      productTitle: resolution.variant.productTitle,
      previousPrice: resolution.variant.price ?? null,
      previousCompareAtPrice: resolution.variant.compareAtPrice ?? null,
      previousInventoryQuantity: resolution.variant.inventoryQuantity ?? null,
      strategy: resolution.strategy,
    });
  }

  const inventoryUpdates = dedupeBy(
    matched.filter((item) => Number(item.previousInventoryQuantity) !== Number(item.selectedQuantity)),
    (item) => item.inventoryItemId
  );
  const priceUpdates = dedupeBy(
    matched.filter(
      (item) =>
        item.desiredPrice !== null &&
        (item.previousPrice !== item.desiredPrice ||
          (item.previousCompareAtPrice || null) !== (item.desiredCompareAtPrice || null))
    ),
    (item) => item.variantId
  );

  return {
    consideredRows: rows.length,
    matchedRows: matched.length,
    unmatchedRows: unmatched.length,
    inventoryUpdatesNeeded: inventoryUpdates.length,
    priceUpdatesNeeded: priceUpdates.length,
    unchangedRows: matched.length - inventoryUpdates.length,
    matched,
    unmatched,
  };
}
