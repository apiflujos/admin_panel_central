export type AdminRole = "super_admin" | "admin" | "operator" | "viewer";

export type AuthSessionDto = {
  id: number;
  email: string;
  displayName: string;
  role: AdminRole;
  roleLabel: string;
  initials: string;
  isSuperAdmin: boolean;
};

export type ConnectionStatus = "connected" | "attention" | "disconnected";

export type ConnectionStatusDto = {
  key: string;
  label: string;
  provider: "shopify" | "alegra" | "google_ads" | "meta_ads" | "tiktok_ads" | "woocommerce";
  status: ConnectionStatus;
  detail: string;
  lastSyncAt?: string | null;
};

export type ConnectionStatusListDto = {
  items: ConnectionStatusDto[];
  summary: {
    total: number;
    connectedCount: number;
    attentionCount: number;
    disconnectedCount: number;
  };
};

export type SettingsOverviewDto = {
  companyName: string;
  moduleCount: number;
  activeConnections: number;
  pendingActions: number;
};

export type AdminWebProductRowDto = {
  id: number;
  alegraItemId: string | null;
  shopifyProductId: string | null;
  name: string;
  reference: string;
  sku: string;
  barcode: string | null;
  imageUrl: string | null;
  alegraStatus: string | null;
  shopifyStatus: string | null;
  inventoryQuantity: number | null;
  source: string | null;
  updatedAt: string | null;
  // Tiendas donde el producto está publicado (etiquetas: "Becam", "Belia").
  stores: string[];
};

export type AdminWebProductsListDto = {
  items: AdminWebProductRowDto[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    matchedCount: number;
    pendingCount: number;
    inStockCount: number;
  };
};

export type AdminWebOrderRowDto = {
  id: string;
  shopifyId: string | null;
  orderNumber: string;
  processedAt: string | null;
  customer: string;
  customerEmail: string | null;
  products: string;
  total: number | null;
  currency: string | null;
  shopDomain: string | null;
  storeName: string | null;
  alegraStatus: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  einvoiceRequested: boolean;
  einvoiceMissing: string[];
};

export type AdminWebOrdersListDto = {
  items: AdminWebOrderRowDto[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    invoicedCount: number;
    pendingCount: number;
    einvoicePendingCount: number;
  };
};

export type AdminWebContactRowDto = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  source: string | null;
  syncStatus: string;
  updatedAt: string | null;
};

export type AdminWebContactsListDto = {
  items: AdminWebContactRowDto[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminWebInvoiceRowDto = {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  processedAt: string | null;
  customer: string;
  total: number | null;
  currency: string | null;
  status: string | null;
};

export type AdminWebInvoicesListDto = {
  items: AdminWebInvoiceRowDto[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminWebDashboardHighlightRowDto = {
  id: string;
  kind: "product" | "order" | "log";
  label: string;
  detail: string;
  status: string;
  metric: string;
};

export type AdminWebDashboardOverviewDto = {
  companyName: string;
  moduleCount: number;
  activeConnections: number;
  pendingActions: number;
  totalProducts: number;
  totalOrders: number;
  failedLogs: number;
  highlights: AdminWebDashboardHighlightRowDto[];
};

export type AdminWebOperationRowDto = {
  id: string;
  shopDomain: string | null;
  storeName: string | null;
  orderNumber: string;
  processedAt: string | null;
  customer: string;
  customerEmail: string | null;
  products: string;
  alegraStatus: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  errorMessage: string | null;
  einvoiceRequested: boolean;
  einvoiceMissing: string[];
  actionability: {
    sync: {
      enabled: boolean;
      reason?: string;
    };
    retryInvoice: {
      enabled: boolean;
      reason?: string;
    };
    payment: {
      enabled: boolean;
      reason?: string;
    };
    cancel: {
      enabled: boolean;
      reason?: string;
    };
    editEinvoice: {
      enabled: boolean;
      reason?: string;
    };
    pdf: {
      enabled: boolean;
      reason?: string;
      invoiceId?: string | null;
    };
  };
};

export type AdminWebOperationsListDto = {
  items: AdminWebOperationRowDto[];
  summary: {
    invoicedCount: number;
    failedCount: number;
    einvoicePendingCount: number;
  };
};

export type AdminWebLogRowDto = {
  id: number;
  entity: string;
  direction: string;
  status: string;
  message: string | null;
  createdAt: string;
  orderId: string | null;
};

export type AdminWebLogsListDto = {
  items: AdminWebLogRowDto[];
  filters: {
    status?: string;
    orderId?: string;
    entity?: string;
    direction?: string;
    from?: string;
    to?: string;
  };
  summary: {
    total: number;
    failedCount: number;
    retryingCount: number;
  };
};

export type AdminWebSuperAdminUserDto = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
};

export type AdminWebSuperAdminOverviewDto = {
  tenantsCount: number;
  plansCount: number;
  servicesCount: number;
  modulesCount: number;
  users: AdminWebSuperAdminUserDto[];
  summary: {
    usersCount: number;
    tenantsCount: number;
    plansCount: number;
  };
};
