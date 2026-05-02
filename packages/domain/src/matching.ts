import type { SyncVariantReference, ShopifyVariantSnapshot } from "../../shared/src";

export type VariantMatchResult =
  | { variant: ShopifyVariantSnapshot; strategy: "sku_exact" | "barcode_exact" }
  | { variant: ShopifyVariantSnapshot; strategy: "reference_size_fallback"; score: number }
  | { variant: null; strategy: "unmatched" };

export type VariantIndex = {
  exactSku: Map<string, ShopifyVariantSnapshot[]>;
  exactBarcode: Map<string, ShopifyVariantSnapshot[]>;
  byReferenceStem: Map<string, ShopifyVariantSnapshot[]>;
};

export function normalizeIdentifier(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

export function normalizeText(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function extractReferenceStem(value: unknown): string {
  const raw = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "");
  const match = raw.match(/^[A-Z]+[0-9]+/);
  return match ? match[0] : "";
}

export function candidateSkuKeys(reference: string, variantLabel: string): string[] {
  const ref = String(reference || "").trim();
  const label = String(variantLabel || "").trim();
  const candidates = [
    ref,
    label ? `${ref}${label}` : "",
    label ? `${ref}-${label}` : "",
    label ? `${ref}/${label}` : "",
    label ? `${ref} ${label}` : "",
    label ? `${ref}_${label}` : "",
  ];
  return Array.from(new Set(candidates.map(normalizeIdentifier).filter(Boolean)));
}

export function scoreVariantForReference(row: SyncVariantReference, variant: ShopifyVariantSnapshot): number {
  let score = 0;
  const variantLabel = normalizeText(row.variantLabel);
  const variantLabelKey = normalizeIdentifier(row.variantLabel);
  const parentName = normalizeText(row.parentName);
  const variantTitle = normalizeText(variant.variantTitle);
  const productTitle = normalizeText(variant.productTitle);
  const optionValues = variant.selectedOptions.map(normalizeText);
  const skuNorm = normalizeIdentifier(variant.sku);
  const refNorm = normalizeIdentifier(row.reference);

  if (skuNorm === refNorm) score += 15;
  if (skuNorm.startsWith(refNorm) && refNorm) score += 20;
  if (variantLabel && optionValues.includes(variantLabel)) score += 40;
  if (variantLabel && variantTitle.includes(variantLabel)) score += 25;
  if (variantLabel && variantLabelKey && skuNorm.endsWith(variantLabelKey)) score += 20;
  if (parentName && productTitle.includes(parentName)) score += 20;
  if (parentName && variantTitle.includes(parentName)) score += 10;

  return score;
}

export function pickBestVariant(row: SyncVariantReference, variantIndex: VariantIndex): VariantMatchResult {
  const refKey = normalizeIdentifier(row.reference);
  const skuKeys = candidateSkuKeys(row.reference, row.variantLabel);

  for (const key of skuKeys) {
    const exact = variantIndex.exactSku.get(key);
    if (exact?.length === 1) {
      return { variant: exact[0], strategy: "sku_exact" };
    }
  }

  for (const key of skuKeys) {
    const exact = variantIndex.exactBarcode.get(key);
    if (exact?.length === 1) {
      return { variant: exact[0], strategy: "barcode_exact" };
    }
  }

  const candidatePool: ShopifyVariantSnapshot[] = [];
  for (const key of skuKeys) {
    for (const item of variantIndex.exactSku.get(key) || []) candidatePool.push(item);
    for (const item of variantIndex.exactBarcode.get(key) || []) candidatePool.push(item);
  }
  for (const item of variantIndex.byReferenceStem.get(refKey) || []) {
    candidatePool.push(item);
  }

  const unique = Array.from(new Map(candidatePool.map((item) => [item.variantId, item])).values());
  if (!unique.length) {
    return { variant: null, strategy: "unmatched" };
  }

  const ranked = unique
    .map((variant) => ({ variant, score: scoreVariantForReference(row, variant) }))
    .sort((left, right) => right.score - left.score);

  const top = ranked[0];
  if (!top || top.score <= 0) {
    return { variant: null, strategy: "unmatched" };
  }

  const variantLabel = normalizeText(row.variantLabel);
  const variantLabelKey = normalizeIdentifier(row.variantLabel);
  const topOptions = top.variant.selectedOptions.map(normalizeText);
  const topVariantTitle = normalizeText(top.variant.variantTitle);
  const topSku = normalizeIdentifier(top.variant.sku);
  const hasExplicitSizeEvidence =
    (variantLabel && topOptions.includes(variantLabel)) ||
    (variantLabel && topVariantTitle.includes(variantLabel)) ||
    (variantLabelKey && topSku.endsWith(variantLabelKey));

  if (!hasExplicitSizeEvidence) {
    return { variant: null, strategy: "unmatched" };
  }

  return { variant: top.variant, strategy: "reference_size_fallback", score: top.score };
}
