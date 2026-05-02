import { NextResponse } from "next/server";

import type { ConnectionStatusDto } from "../../../../../../../packages/shared/src/admin-web";
import {
  buildProviderDetail,
  toConnectionStatus,
  toConnectionStatusListDto,
} from "../../../../../../../packages/domain/src/settings";
import { listStoreConnections } from "../../../../../../../src/services/store-connections.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteAdmin } from "../../../../../lib/route-auth";

export const GET = routeHandler(async () => {
  await requireRouteAdmin();

  const connections = await listStoreConnections();

  const statuses: ConnectionStatusDto[] = [
    ...connections.storesCatalog.flatMap((store: (typeof connections.storesCatalog)[number]) => {
      const items: ConnectionStatusDto[] = [];
      if (store.shopify) {
        items.push({
          key: `shopify:${store.id}`,
          label: store.shopify.storeName || store.shopify.shopDomain,
          provider: "shopify",
          status: toConnectionStatus({
            connected: store.shopify.shopifyConnected,
            needsReconnect: store.shopify.shopifyNeedsReconnect,
          }),
          detail: buildProviderDetail(
            {
              connected: store.shopify.shopifyConnected,
              needsReconnect: store.shopify.shopifyNeedsReconnect,
            },
            "Catálogo y órdenes activos",
            "Reconectar token de Shopify"
          ),
        });
      }
      if (store.alegra) {
        items.push({
          key: `alegra:${store.id}`,
          label: `Alegra · ${store.name}`,
          provider: "alegra",
          status: toConnectionStatus({
            connected: !store.alegra.needsReconnect,
            needsReconnect: store.alegra.needsReconnect,
          }),
          detail: buildProviderDetail(
            {
              connected: !store.alegra.needsReconnect,
              needsReconnect: store.alegra.needsReconnect,
            },
            "Inventario y pricing disponibles",
            "Reconectar credenciales de Alegra"
          ),
        });
      }
      if (store.woo) {
        items.push({
          key: `woocommerce:${store.id}`,
          label: `WooCommerce · ${store.name}`,
          provider: "woocommerce",
          status: toConnectionStatus({ connected: store.woo.ok, needsReconnect: !store.woo.ok }),
          detail: buildProviderDetail(
            { connected: store.woo.ok, needsReconnect: !store.woo.ok },
            "Source de pedidos disponible",
            "Completar consumer key/secret"
          ),
        });
      }
      return items;
    }),
    {
      key: "google_ads:global",
      label: "Google Ads",
      provider: "google_ads",
      status: toConnectionStatus(connections.googleAds),
      detail: buildProviderDetail(connections.googleAds, "Spend sync operativo", "Renovar credenciales Google Ads"),
    },
    {
      key: "meta_ads:global",
      label: "Meta Ads",
      provider: "meta_ads",
      status: toConnectionStatus(connections.metaAds),
      detail: buildProviderDetail(connections.metaAds, "Spend sync operativo", "Renovar credenciales Meta Ads"),
    },
    {
      key: "tiktok_ads:global",
      label: "TikTok Ads",
      provider: "tiktok_ads",
      status: toConnectionStatus(connections.tiktokAds),
      detail: buildProviderDetail(connections.tiktokAds, "Spend sync operativo", "Renovar credenciales TikTok Ads"),
    },
  ];

  return NextResponse.json(toConnectionStatusListDto(statuses));
});
