const ENV_DEFAULT = (process.env.SHOPIFY_API_VERSION || "").trim();

export const DEFAULT_SHOPIFY_API_VERSION = ENV_DEFAULT || "2024-04";

export function resolveShopifyApiVersion(version?: string | null) {
  const trimmed = String(version || "").trim();
  return trimmed || DEFAULT_SHOPIFY_API_VERSION;
}
