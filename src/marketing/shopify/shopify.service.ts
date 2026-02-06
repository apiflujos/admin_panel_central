import { resolveShopifyApiVersion } from "../../utils/shopify";
import { getShopifyConnectionByDomain } from "../../services/store-connections.service";
import { ShopifyAdminApi } from "./shopify-admin-api";

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

export async function getMarketingShopifyClient(shopDomain: string) {
  const domain = normalizeShopDomain(shopDomain);
  if (!domain) throw new Error("shopDomain requerido");
  const conn = await getShopifyConnectionByDomain(domain);
  const apiVersion = resolveShopifyApiVersion(String(process.env.SHOPIFY_API_VERSION_MARKETING || "2024-10"));
  return new ShopifyAdminApi({
    shopDomain: conn.shopDomain,
    accessToken: conn.accessToken,
    apiVersion,
  });
}

