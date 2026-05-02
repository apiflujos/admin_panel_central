import { listStoreConnections } from "../../../../../../../src/services/store-connections.service";

export async function resolveDefaultMarketingShopDomain() {
  const connections = await listStoreConnections();
  for (const store of connections.storesCatalog) {
    if (store.shopify?.shopDomain) {
      return String(store.shopify.shopDomain);
    }
  }
  return "";
}
