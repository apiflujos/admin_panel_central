import type {
  ConnectionStatus,
  ConnectionStatusDto,
  ConnectionStatusListDto,
  SettingsOverviewDto,
} from "../../shared/src/admin-web";

type ProviderStatusInput = {
  connected?: boolean;
  needsReconnect?: boolean;
};

type ConnectionHealthStoreInput = {
  shopify?: {
    shopifyConnected?: boolean;
    shopifyNeedsReconnect?: boolean;
  } | null;
  alegra?: {
    needsReconnect?: boolean;
  } | null;
  woo?: {
    ok?: boolean;
  } | null;
};

type ConnectionHealthInput = {
  storesCatalog?: ConnectionHealthStoreInput[];
  googleAds?: ProviderStatusInput;
  metaAds?: ProviderStatusInput;
  tiktokAds?: ProviderStatusInput;
};

export function summarizeConnectionHealth(input: ConnectionHealthInput) {
  const stores = input.storesCatalog || [];
  const activeConnections = [
    ...stores.flatMap((store) => [
      store.shopify?.shopifyConnected,
      store.alegra ? !store.alegra.needsReconnect : false,
      store.woo?.ok,
    ]),
    input.googleAds?.connected,
    input.metaAds?.connected,
    input.tiktokAds?.connected,
  ].filter(Boolean).length;

  const pendingActions = [
    ...stores.flatMap((store) => [
      store.shopify?.shopifyNeedsReconnect,
      store.alegra?.needsReconnect,
      store.woo ? !store.woo.ok : false,
    ]),
    input.googleAds?.needsReconnect,
    input.metaAds?.needsReconnect,
    input.tiktokAds?.needsReconnect,
  ].filter(Boolean).length;

  return {
    activeConnections,
    pendingActions,
  };
}

export function toConnectionStatus(input: ProviderStatusInput): ConnectionStatus {
  if (input.connected) return "connected";
  if (input.needsReconnect) return "attention";
  return "disconnected";
}

export function buildProviderDetail(input: ProviderStatusInput, connectedLabel: string, reconnectLabel: string) {
  if (input.connected) return connectedLabel;
  if (input.needsReconnect) return reconnectLabel;
  return "Sin configurar";
}

export function toSettingsOverviewDto(input: {
  companyName?: unknown;
  moduleCount: number;
  activeConnections: number;
  pendingActions: number;
}): SettingsOverviewDto {
  return {
    companyName: String(input.companyName || "ApiFlujos"),
    moduleCount: Number(input.moduleCount || 0),
    activeConnections: Number(input.activeConnections || 0),
    pendingActions: Number(input.pendingActions || 0),
  };
}

export function toConnectionStatusListDto(items: ConnectionStatusDto[]): ConnectionStatusListDto {
  return {
    items,
    summary: {
      total: items.length,
      connectedCount: items.filter((item) => item.status === "connected").length,
      attentionCount: items.filter((item) => item.status === "attention").length,
      disconnectedCount: items.filter((item) => item.status === "disconnected").length,
    },
  };
}
