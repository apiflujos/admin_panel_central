import type { ConnectionStatusDto } from "../../../packages/shared/src/admin-web";

export type WorkspaceStore = {
  id: number;
  name: string;
  createdAt: string;
  providers: {
    shopify: {
      label: string;
      status: ConnectionStatusDto["status"];
      detail: string;
      shopDomain?: string;
    } | null;
    alegra: {
      label: string;
      status: ConnectionStatusDto["status"];
      detail: string;
    } | null;
    woocommerce: {
      label: string;
      status: ConnectionStatusDto["status"];
      detail: string;
      shopDomain?: string;
    } | null;
  };
};

export type WorkspaceAds = {
  key: string;
  label: string;
  status: ConnectionStatusDto["status"];
  detail: string;
};

export type CriticalStoreConfig = {
  storeId: number;
  storeName: string;
  shopDomain?: string;
  rules: {
    syncEnabled: boolean;
    inventoryAdjustmentsEnabled: boolean;
  };
  invoice: {
    generateInvoice: boolean;
  };
  sync: {
    orders: {
      shopifyToAlegra: "invoice" | "contact_only" | "db_only" | "off";
      alegraToShopify: "draft" | "active" | "off";
    };
  };
};

export type ConnectionsWorkspace = {
  companyName: string;
  securityMisconfigured: boolean;
  stores: WorkspaceStore[];
  storeConfigs: CriticalStoreConfig[];
  storeConfigDefaults: {
    rules: {
      syncEnabled: boolean;
      inventoryAdjustmentsEnabled: boolean;
    };
    invoice: {
      generateInvoice: boolean;
    };
    sync: {
      orders: {
        shopifyToAlegra: "invoice" | "contact_only" | "db_only" | "off";
        alegraToShopify: "draft" | "active" | "off";
      };
    };
  };
  alegraAccounts: Array<{
    id: number;
    email: string;
    environment: string;
    storeId: number | null;
    needsReconnect: boolean;
  }>;
  ads: WorkspaceAds[];
};
