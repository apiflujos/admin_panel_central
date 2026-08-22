import type { ConnectionStatusDto } from "../../../packages/shared/src/admin-web";
import type { SourceOfTruth } from "../../../packages/shared/src/source-of-truth";

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
  /**
   * Quién manda sobre cada área en esta tienda.
   *
   * Opcional en el tipo a propósito: varios sitios construyen esta forma sin
   * él. Quien lo lea debe pasarlo por `normalizeSourceOfTruth`, que ante la
   * ausencia devuelve "Alegra manda", el valor conservador.
   */
  sourceOfTruth?: SourceOfTruth;
  priceLists: {
    generalId: string;
    discountId: string;
    wholesaleId: string;
    currency: string;
  };
  transfers: {
    enabled: boolean;
    destinationMode: "fixed" | "auto" | "rule";
    destinationRequired: boolean;
    destinationWarehouseId: string;
    originWarehouseIds: string[];
    priorityWarehouseId: string;
    strategy: "manual" | "consolidation" | "priority" | "max_stock";
    fallbackStrategy: "manual" | "consolidation" | "priority" | "max_stock" | "";
    tieBreakRule: "" | "priority" | "max_stock" | "random";
    splitEnabled: boolean;
    minStock: number;
  };
  rules: {
    syncEnabled: boolean;
    inventoryAdjustmentsEnabled: boolean;
    inventoryAdjustmentsIntervalMinutes: number;
    inventoryAdjustmentsAutoPublish: boolean;
    publishOnStock: boolean;
    autoPublishOnWebhook: boolean;
    autoPublishStatus: "draft" | "active";
    onlyActiveItems: boolean;
    trackInventory: boolean;
    allowOversell: boolean;
    webhookItemsEnabled: boolean;
    createInShopify: boolean;
    updateInShopify: boolean;
    includeImages: boolean;
    warehouseIds: string[];
  };
  invoice: {
    generateInvoice: boolean;
    resolutionId: string;
    paymentMethod: string;
    bankAccountId: string;
    applyPayment: boolean;
    einvoiceEnabled: boolean;
  };
  sync: {
    contacts: {
      enabled: boolean;
      fromShopify: boolean;
      fromAlegra: boolean;
      createInAlegra: boolean;
      createInShopify: boolean;
      matchPriority: string[];
    };
    orders: {
      shopifyEnabled: boolean;
      alegraEnabled: boolean;
      shopifyToAlegra: "invoice" | "contact_only" | "db_only" | "off";
      alegraToShopify: "draft" | "active" | "off";
    };
    products: {
      shopifyEnabled: boolean;
      createInAlegra: boolean;
      updateInAlegra: boolean;
      includeInventory: boolean;
      warehouseId: string;
      matchPriority: "sku_barcode" | "barcode_sku";
    };
  };
};

export type ConnectionsWorkspace = {
  companyName: string;
  securityMisconfigured: boolean;
  stores: WorkspaceStore[];
  storeConfigs: CriticalStoreConfig[];
  storeConfigDefaults: {
    priceLists: {
      generalId: string;
      discountId: string;
      wholesaleId: string;
      currency: string;
    };
    rules: {
      syncEnabled: boolean;
      inventoryAdjustmentsEnabled: boolean;
      inventoryAdjustmentsIntervalMinutes: number;
      inventoryAdjustmentsAutoPublish: boolean;
      publishOnStock: boolean;
      autoPublishOnWebhook: boolean;
      autoPublishStatus: "draft" | "active";
      onlyActiveItems: boolean;
      trackInventory: boolean;
      allowOversell: boolean;
      webhookItemsEnabled: boolean;
      createInShopify: boolean;
      updateInShopify: boolean;
      includeImages: boolean;
      warehouseIds: string[];
    };
    invoice: {
      generateInvoice: boolean;
      resolutionId: string;
      paymentMethod: string;
      bankAccountId: string;
      applyPayment: boolean;
      einvoiceEnabled: boolean;
    };
    sync: {
      contacts: {
        enabled: boolean;
        fromShopify: boolean;
        fromAlegra: boolean;
        createInAlegra: boolean;
        createInShopify: boolean;
        matchPriority: string[];
      };
      orders: {
        shopifyEnabled: boolean;
        alegraEnabled: boolean;
        shopifyToAlegra: "invoice" | "contact_only" | "db_only" | "off";
        alegraToShopify: "draft" | "active" | "off";
      };
      products: {
        shopifyEnabled: boolean;
        createInAlegra: boolean;
        updateInAlegra: boolean;
        includeInventory: boolean;
        warehouseId: string;
        matchPriority: "sku_barcode" | "barcode_sku";
      };
    };
    transfers: {
      enabled: boolean;
      destinationMode: "fixed" | "auto" | "rule";
      destinationRequired: boolean;
      destinationWarehouseId: string;
      originWarehouseIds: string[];
      priorityWarehouseId: string;
      strategy: "manual" | "consolidation" | "priority" | "max_stock";
      fallbackStrategy: "manual" | "consolidation" | "priority" | "max_stock" | "";
      tieBreakRule: "" | "priority" | "max_stock" | "random";
      splitEnabled: boolean;
      minStock: number;
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
