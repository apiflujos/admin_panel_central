import type {
  AdminWebContactsListDto,
  AdminWebDashboardOverviewDto,
  AdminWebInvoicesListDto,
  AdminWebLogsListDto,
  AdminWebOperationsListDto,
  AdminWebOrdersListDto,
  AdminWebProductsListDto,
  AdminWebSuperAdminOverviewDto,
  AuthSessionDto,
  ConnectionStatusListDto,
  SettingsOverviewDto,
} from "../../../packages/shared/src/admin-web";
import type { CriticalStoreConfig } from "./connections-workspace";

const apiBase = process.env.APP_HOST ? `${process.env.APP_HOST.replace(/\/$/, "")}/api` : "/api";

let cachedCsrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch(`${apiBase}/auth/csrf`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.token === "string") {
      cachedCsrfToken = data.token;
      return cachedCsrfToken;
    }
  } catch {
    // ignore
  }
  return null;
}

function isMutatingMethod(method?: string): boolean {
  if (!method) return false;
  const m = method.toUpperCase();
  return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
}

function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }
}

type JsonRequestOptions = RequestInit & {
  path: string;
};

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    const result: Record<string, string> = {};
    for (const [key, value] of headers) {
      result[key] = value;
    }
    return result;
  }
  return { ...(headers as Record<string, string>) };
}

/**
 * CSRF-aware fetch for absolute `/api/...` paths. Injects the `x-csrf-token`
 * header on mutating requests (POST/PUT/PATCH/DELETE) and always sends the
 * session cookie. Returns the raw Response so callers keep full control over
 * parsing and streaming. Use this instead of raw `fetch()` for any mutating
 * call that hits the Express `/api` router, which enforces CSRF.
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const headers = normalizeHeaders(init.headers);
  if (isMutatingMethod(method)) {
    const csrf = await fetchCsrfToken();
    if (csrf) {
      headers["x-csrf-token"] = csrf;
    }
  }
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });
  if (response.status === 403) {
    // CSRF may have rotated; drop the cache so the next attempt refetches it.
    cachedCsrfToken = null;
  }
  return response;
}

async function requestJson<T>({ path, headers, ...init }: JsonRequestOptions): Promise<T> {
  const method = init.method || "GET";
  const isMutation = isMutatingMethod(method);

  const reqHeaders: Record<string, string> = normalizeHeaders(headers);
  if (method !== "GET" && method !== "HEAD") {
    reqHeaders["Content-Type"] = "application/json";
  }
  if (isMutation) {
    const csrf = await fetchCsrfToken();
    if (csrf) {
      reqHeaders["x-csrf-token"] = csrf;
    }
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: reqHeaders,
    cache: "no-store",
  });

  if (response.status === 401) {
    cachedCsrfToken = null;
    redirectToLogin();
    throw new Error("api_request_failed:401");
  }

  if (response.status === 403) {
    // CSRF may have rotated; clear cache so the next attempt fetches a fresh token.
    cachedCsrfToken = null;
  }

  if (!response.ok) {
    throw new Error(`api_request_failed:${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getSessionProfile(): Promise<AuthSessionDto> {
  return requestJson<AuthSessionDto>({ path: "/admin-web/session", method: "GET" });
}

export async function getOptionalSessionProfile(): Promise<AuthSessionDto | null> {
  try {
    return await getSessionProfile();
  } catch {
    return null;
  }
}

export async function getDashboardOverview(): Promise<AdminWebDashboardOverviewDto> {
  return requestJson<AdminWebDashboardOverviewDto>({ path: "/admin-web/dashboard", method: "GET" });
}

export async function getSettingsOverview(): Promise<SettingsOverviewDto> {
  return requestJson<SettingsOverviewDto>({ path: "/admin-web/settings/overview", method: "GET" });
}

export async function getConnectionsStatus(): Promise<ConnectionStatusListDto> {
  return requestJson<ConnectionStatusListDto>({ path: "/admin-web/connections/status", method: "GET" });
}

export async function getProductsCatalog(params?: {
  query?: string;
  start?: number;
  limit?: number;
  inStockOnly?: boolean;
}): Promise<AdminWebProductsListDto> {
  const search = new URLSearchParams();
  if (params?.query) search.set("query", params.query);
  if (typeof params?.start === "number") search.set("start", String(params.start));
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (params?.inStockOnly) search.set("inStockOnly", "true");
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebProductsListDto>({ path: `/admin-web/products${suffix}`, method: "GET" });
}

export async function getOrdersCatalog(params?: {
  query?: string;
  offset?: number;
  limit?: number;
  sort?: string;
}): Promise<AdminWebOrdersListDto> {
  const search = new URLSearchParams();
  if (params?.query) search.set("query", params.query);
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (params?.sort) search.set("sort", params.sort);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebOrdersListDto>({ path: `/admin-web/orders${suffix}`, method: "GET" });
}

export async function getContactsCatalog(params?: {
  query?: string;
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminWebContactsListDto> {
  const search = new URLSearchParams();
  if (params?.query) search.set("query", params.query);
  if (params?.status) search.set("status", params.status);
  if (params?.source) search.set("source", params.source);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebContactsListDto>({ path: `/admin-web/contacts${suffix}`, method: "GET" });
}

export async function getInvoicesCatalog(params?: {
  query?: string;
  date?: string;
  days?: number;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminWebInvoicesListDto> {
  const search = new URLSearchParams();
  if (params?.query) search.set("query", params.query);
  if (params?.date) search.set("date", params.date);
  if (typeof params?.days === "number") search.set("days", String(params.days));
  if (params?.sort) search.set("sort", params.sort);
  if (typeof params?.limit === "number") search.set("limit", String(params.limit));
  if (typeof params?.offset === "number") search.set("offset", String(params.offset));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebInvoicesListDto>({ path: `/admin-web/invoices${suffix}`, method: "GET" });
}

export async function getOperationsCatalog(params?: { days?: number }): Promise<AdminWebOperationsListDto> {
  const search = new URLSearchParams();
  if (typeof params?.days === "number") search.set("days", String(params.days));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebOperationsListDto>({ path: `/admin-web/operations${suffix}`, method: "GET" });
}

export type AdminWebOperationActionResult = {
  status?: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  missing?: string[];
  [key: string]: unknown;
};

export type AdminWebEinvoiceOverride = {
  orderId?: string;
  einvoiceRequested?: boolean;
  idType?: string;
  idNumber?: string;
  fiscalName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export type AdminWebEinvoiceResponse = {
  override: AdminWebEinvoiceOverride | null;
  einvoiceEnabled: boolean;
};

export async function syncOperation(orderId: string): Promise<AdminWebOperationActionResult> {
  return requestJson<AdminWebOperationActionResult>({
    path: `/operations/${encodeURIComponent(orderId)}/sync`,
    method: "POST",
  });
}

export async function retryOperationInvoice(orderId: string): Promise<AdminWebOperationActionResult> {
  return requestJson<AdminWebOperationActionResult>({
    path: `/operations/${encodeURIComponent(orderId)}/invoice`,
    method: "POST",
  });
}

export async function emitOperationPayment(orderId: string): Promise<AdminWebOperationActionResult> {
  return requestJson<AdminWebOperationActionResult>({
    path: `/operations/${encodeURIComponent(orderId)}/payment`,
    method: "POST",
  });
}

export async function cancelOperationInvoice(orderId: string): Promise<AdminWebOperationActionResult> {
  return requestJson<AdminWebOperationActionResult>({
    path: `/operations/${encodeURIComponent(orderId)}/cancel`,
    method: "POST",
  });
}

export async function getEinvoiceOverride(orderId: string): Promise<AdminWebEinvoiceResponse> {
  return requestJson<AdminWebEinvoiceResponse>({
    path: `/operations/${encodeURIComponent(orderId)}/einvoice`,
    method: "GET",
  });
}

export async function saveEinvoiceOverride(
  orderId: string,
  payload: AdminWebEinvoiceOverride
): Promise<{ saved: true }> {
  return requestJson<{ saved: true }>({
    path: `/operations/${encodeURIComponent(orderId)}/einvoice`,
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getLogsCatalog(params?: {
  status?: string;
  entity?: string;
  direction?: string;
}): Promise<AdminWebLogsListDto> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.entity) search.set("entity", params.entity);
  if (params?.direction) search.set("direction", params.direction);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebLogsListDto>({ path: `/admin-web/logs${suffix}`, method: "GET" });
}

export async function getSuperAdminOverview(): Promise<AdminWebSuperAdminOverviewDto> {
  return requestJson<AdminWebSuperAdminOverviewDto>({ path: "/admin-web/superadmin/overview", method: "GET" });
}

export async function saveStoreConfig(
  storeKey: string,
  // PARCIAL a propósito: el servidor fusiona con lo que ya hay, así que un
  // panel puede guardar sólo su bloque sin arrastrar el resto de la config.
  payload: Partial<Pick<CriticalStoreConfig, "priceLists" | "transfers" | "rules" | "invoice" | "sync">> & {
    sourceOfTruth?: CriticalStoreConfig["sourceOfTruth"];
    storeId?: number;
    shopDomain?: string;
  }
): Promise<{ saved: true; storeId?: number }> {
  return requestJson<{ saved: true; storeId?: number }>({
    path: `/store-configs/${encodeURIComponent(storeKey)}`,
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function runContactsBulkSync(payload: {
  shopDomain?: string;
  from?: string;
  to?: string;
  limit?: number;
  directions: { shopifyToAlegra: boolean; alegraToShopify: boolean };
  createInAlegra?: boolean;
  createInShopify?: boolean;
}): Promise<{
  bidirectional?: boolean;
  phases?: Array<Record<string, unknown>>;
  total?: number;
  processed?: number;
  synced?: number;
  skipped?: number;
  failed?: number;
}> {
  return requestJson({
    path: "/sync/contacts/bulk",
    method: "POST",
    body: JSON.stringify({
      direction: "bidirectional",
      shopDomain: payload.shopDomain,
      from: payload.from,
      to: payload.to,
      limit: payload.limit,
      directions: payload.directions,
      createInAlegra: payload.createInAlegra,
      createInShopify: payload.createInShopify,
    }),
  });
}

export async function runOrdersSync(payload: {
  shopDomain?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
  orderNumber?: string;
}): Promise<Record<string, unknown>> {
  return requestJson({
    path: "/sync/orders",
    method: "POST",
    body: JSON.stringify({
      shopDomain: payload.shopDomain,
      filters: {
        dateStart: payload.dateStart,
        dateEnd: payload.dateEnd,
        limit: payload.limit,
        orderNumber: payload.orderNumber,
      },
    }),
  });
}

export async function runInvoicesSync(payload: {
  shopDomain?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
  mode?: "draft" | "active";
}): Promise<Record<string, unknown>> {
  return requestJson({
    path: "/sync/invoices",
    method: "POST",
    body: JSON.stringify({
      shopDomain: payload.shopDomain,
      mode: payload.mode ?? "draft",
      filters: {
        dateStart: payload.dateStart,
        dateEnd: payload.dateEnd,
        limit: payload.limit,
      },
    }),
  });
}

export async function runProductsToShopifySync(payload: {
  shopDomain?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
  onlyActive?: boolean;
  onlyWithImages?: boolean;
  warehouseIds?: string[];
  settings: {
    publishOnSync: boolean;
    updateExisting: boolean;
    trackInventory: boolean;
  };
}): Promise<Record<string, unknown>> {
  return requestJson({
    path: "/sync/products",
    method: "POST",
    body: JSON.stringify({
      shopDomain: payload.shopDomain,
      mode: payload.dateStart || payload.dateEnd || payload.limit ? "filtered" : "full",
      filters: {
        dateStart: payload.dateStart,
        dateEnd: payload.dateEnd,
        limit: payload.limit,
        onlyActive: payload.onlyActive,
        onlyWithImages: payload.onlyWithImages,
        warehouseIds: payload.warehouseIds,
      },
      settings: payload.settings,
    }),
  });
}

export async function runProductsToAlegraSync(payload: {
  shopDomain: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
  settings: {
    createInAlegra: boolean;
    updateInAlegra: boolean;
    includeInventory: boolean;
    warehouseId?: string;
    matchPriority: "sku_barcode" | "barcode_sku";
  };
}): Promise<Record<string, unknown>> {
  return requestJson({
    path: "/sync/products/shopify-to-alegra",
    method: "POST",
    body: JSON.stringify({
      shopDomain: payload.shopDomain,
      filters: {
        dateStart: payload.dateStart,
        dateEnd: payload.dateEnd,
        limit: payload.limit,
      },
      settings: payload.settings,
    }),
  });
}

export async function updateProductOversell(payload: {
  shopDomain?: string;
  storeId?: number;
  alegraId?: string;
  sku?: string;
  allowOversellAlegra?: boolean;
  allowOversellShopify?: boolean;
}): Promise<Record<string, unknown>> {
  return requestJson({
    path: "/products/oversell",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProductTracking(payload: {
  shopDomain?: string;
  storeId?: number;
  alegraId?: string;
  sku?: string;
  trackInventoryAlegra?: boolean;
  trackInventoryShopify?: boolean;
  inventoryQuantity?: number;
  inventoryUnit?: string;
  allowOversellAlegra?: boolean;
}): Promise<Record<string, unknown>> {
  return requestJson({
    path: "/products/tracking",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Publish a single Alegra product to Shopify (one-by-one). Uses apiFetch so the
 * backend's real error message (e.g. "Shopify no conectado") reaches the UI
 * instead of the generic api_request_failed thrown by requestJson.
 */
export async function publishProductToShopify(payload: {
  alegraId: string;
  shopDomain?: string;
}): Promise<{ ok: true; shopify?: Record<string, unknown> }> {
  const response = await apiFetch("/api/shopify/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    shopify?: Record<string, unknown>;
  };
  if (!response.ok) {
    throw new Error(data.error || `publish_failed:${response.status}`);
  }
  return { ok: true, shopify: data.shopify };
}

export async function unpublishProductFromShopify(payload: {
  shopifyProductId: string;
  shopDomain?: string;
}): Promise<{ ok: true; shopify?: Record<string, unknown> }> {
  const response = await apiFetch("/api/shopify/unpublish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    shopify?: Record<string, unknown>;
  };
  if (!response.ok) {
    throw new Error(data.error || `unpublish_failed:${response.status}`);
  }
  return { ok: true, shopify: data.shopify };
}

export async function setAlegraItemStatus(payload: {
  itemId: string;
  active: boolean;
  shopDomain?: string;
  storeId?: number | null;
}): Promise<{ ok: true; status: "active" | "inactive" }> {
  const { itemId, ...body } = payload;
  const response = await apiFetch(`/api/alegra/items/${encodeURIComponent(itemId)}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; status?: "active" | "inactive" };
  if (!response.ok) {
    throw new Error(data.error || `alegra_status_failed:${response.status}`);
  }
  return { ok: true, status: data.status || (payload.active ? "active" : "inactive") };
}

export async function runInventoryAdjustmentsSync(payload: {
  shopDomain?: string;
  autoPublish?: boolean;
  date?: string;
  start?: number;
  limit?: number;
}): Promise<Record<string, unknown>> {
  const search = new URLSearchParams();
  if (payload.shopDomain) search.set("shopDomain", payload.shopDomain);
  if (typeof payload.autoPublish === "boolean") search.set("autoPublish", payload.autoPublish ? "true" : "false");
  if (payload.date) search.set("date", payload.date);
  if (typeof payload.start === "number") search.set("start", String(payload.start));
  if (typeof payload.limit === "number") search.set("limit", String(payload.limit));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson({
    path: `/sync/inventory-adjustments${suffix}`,
    method: "POST",
  });
}

export async function runOrdersBackfill(payload: {
  source?: "shopify" | "alegra" | "both";
  shopDomain?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
}): Promise<Record<string, unknown>> {
  return requestJson({
    path: "/backfill/orders",
    method: "POST",
    body: JSON.stringify({
      source: payload.source ?? "alegra",
      shopDomain: payload.shopDomain,
      dateStart: payload.dateStart,
      dateEnd: payload.dateEnd,
      limit: payload.limit,
    }),
  });
}

export async function stopOrdersSync(syncId: string): Promise<{ ok?: boolean; canceled?: boolean }> {
  return requestJson({
    path: "/sync/orders/stop",
    method: "POST",
    body: JSON.stringify({ syncId }),
  });
}

export async function stopContactsBulkSync(syncId: string): Promise<{ ok?: boolean; canceled?: boolean }> {
  return requestJson({
    path: "/sync/contacts/bulk/stop",
    method: "POST",
    body: JSON.stringify({ syncId }),
  });
}

export async function stopInvoicesSync(syncId: string): Promise<{ ok?: boolean; canceled?: boolean }> {
  return requestJson({
    path: "/sync/invoices/stop",
    method: "POST",
    body: JSON.stringify({ syncId }),
  });
}

export async function stopOrdersBackfill(syncId: string): Promise<{ ok?: boolean; canceled?: boolean }> {
  return requestJson({
    path: "/backfill/orders/stop",
    method: "POST",
    body: JSON.stringify({ syncId }),
  });
}

export async function stopProductsBackfill(syncId: string): Promise<{ ok?: boolean; canceled?: boolean }> {
  return requestJson({
    path: "/backfill/products/stop",
    method: "POST",
    body: JSON.stringify({ syncId }),
  });
}

export async function runProductsBackfill(payload: {
  source?: "shopify" | "alegra" | "both";
  shopDomain?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
  useCache?: boolean;
  alegraStatus?: string;
  shopifyPublishedOnly?: boolean;
}): Promise<Record<string, unknown>> {
  return requestJson({
    path: "/backfill/products",
    method: "POST",
    body: JSON.stringify({
      source: payload.source ?? "both",
      shopDomain: payload.shopDomain,
      dateStart: payload.dateStart,
      dateEnd: payload.dateEnd,
      limit: payload.limit,
      useCache: payload.useCache,
      alegraStatus: payload.alegraStatus,
      shopifyPublishedOnly: payload.shopifyPublishedOnly,
    }),
  });
}

export async function stopProductsToShopifySync(syncId: string): Promise<{ ok?: boolean; canceled?: boolean }> {
  return requestJson({
    path: "/sync/products/stop",
    method: "POST",
    body: JSON.stringify({ syncId }),
  });
}

export async function stopProductsToAlegraSync(syncId: string): Promise<{ ok?: boolean; canceled?: boolean }> {
  return requestJson({
    path: "/sync/products/shopify-to-alegra/stop",
    method: "POST",
    body: JSON.stringify({ syncId }),
  });
}

export async function stopProductImagesSync(syncId: string): Promise<{ ok?: boolean; canceled?: boolean }> {
  return requestJson({
    path: "/sync/product-images/stop",
    method: "POST",
    body: JSON.stringify({ syncId }),
  });
}

export async function getInventoryAdjustmentsCheckpoint(shopDomain?: string): Promise<{
  checkpoint?: {
    entity?: string;
    updatedAt?: string | null;
    lastStart?: number | null;
    total?: number | null;
  } | null;
  intervalMs?: number;
}> {
  const suffix = shopDomain ? `?shopDomain=${encodeURIComponent(shopDomain)}` : "";
  return requestJson({
    path: `/checkpoints/inventory-adjustments${suffix}`,
    method: "GET",
  });
}

export async function copyStoreConfigFrom(
  storeKey: string,
  payload: {
    sourceStoreId: number;
    blocks?: Array<"transfers" | "priceLists" | "rules" | "invoice" | "sync">;
  }
): Promise<{ saved: true; storeId?: number; sourceStoreId: number; targetStoreId: number; blocks: string[] }> {
  return requestJson<{ saved: true; storeId?: number; sourceStoreId: number; targetStoreId: number; blocks: string[] }>(
    {
      path: `/store-configs/${encodeURIComponent(storeKey)}/copy-from`,
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function createStore(name: string): Promise<{ created: { id: number; name: string } }> {
  return requestJson<{ created: { id: number; name: string } }>({
    path: "/stores",
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteStore(storeId: number): Promise<unknown> {
  return requestJson<unknown>({
    path: `/stores/${encodeURIComponent(String(storeId))}`,
    method: "DELETE",
  });
}

export type AdminWebCompanyProfile = {
  name: string;
  phone: string;
  address: string;
  logoBase64: string;
};

export async function getCompanyProfile(): Promise<AdminWebCompanyProfile> {
  return requestJson<AdminWebCompanyProfile>({
    path: "/company",
    method: "GET",
  });
}

export async function saveCompanyProfile(payload: AdminWebCompanyProfile): Promise<AdminWebCompanyProfile> {
  return requestJson<AdminWebCompanyProfile>({
    path: "/company",
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type AdminWebTenantUser = {
  id: number;
  email: string;
  role: "admin" | "agent";
  name: string | null;
  phone: string | null;
  photoBase64: string | null;
  createdAt: string;
};

export async function getTenantUsers(): Promise<{ items: AdminWebTenantUser[] }> {
  return requestJson<{ items: AdminWebTenantUser[] }>({
    path: "/users",
    method: "GET",
  });
}

export async function createTenantUser(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: "admin" | "agent";
}): Promise<{ ok: true; user: AdminWebTenantUser }> {
  return requestJson<{ ok: true; user: AdminWebTenantUser }>({
    path: "/users",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteTenantUser(userId: number): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>({
    path: `/users/${encodeURIComponent(String(userId))}`,
    method: "DELETE",
  });
}

export type AdminWebAiAssistant = {
  id: number;
  organization_id: number;
  name: string;
  avatar_url: string | null;
  description: string | null;
  n8n_url: string | null;
  politicas: string | null;
  instruccion: string | null;
  identidad: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getAiAssistants(): Promise<{ ok: true; data: AdminWebAiAssistant[] }> {
  return requestJson<{ ok: true; data: AdminWebAiAssistant[] }>({
    path: "/ai-assistants",
    method: "GET",
  });
}

export async function createAiAssistant(
  payload: Partial<AdminWebAiAssistant>
): Promise<{ ok: true; data: AdminWebAiAssistant }> {
  return requestJson<{ ok: true; data: AdminWebAiAssistant }>({
    path: "/ai-assistants",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAiAssistant(
  id: number,
  payload: Partial<AdminWebAiAssistant>
): Promise<{ ok: true; data: AdminWebAiAssistant }> {
  return requestJson<{ ok: true; data: AdminWebAiAssistant }>({
    path: `/ai-assistants/${encodeURIComponent(String(id))}`,
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAiAssistant(id: number): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>({
    path: `/ai-assistants/${encodeURIComponent(String(id))}`,
    method: "DELETE",
  });
}

export type AdminWebProfile = {
  user: {
    id: number;
    organizationId: number;
    email: string;
    role: string;
    isSuperAdmin: boolean;
    name: string | null;
    phone: string | null;
    photoBase64: string | null;
  };
};

export async function getProfile(): Promise<AdminWebProfile> {
  return requestJson<AdminWebProfile>({
    path: "/profile",
    method: "GET",
  });
}

export async function saveProfile(payload: {
  name?: string;
  email?: string;
  phone?: string;
  photoBase64?: string;
}): Promise<{ ok: true; user: AdminWebProfile["user"] }> {
  return requestJson<{ ok: true; user: AdminWebProfile["user"] }>({
    path: "/profile",
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type AdminWebInvoiceSettings = {
  generateInvoice: boolean;
  invoiceTrigger: "on_create" | "on_fulfilled";
  resolutionId: string;
  warehouseId: string;
  costCenterId: string;
  sellerId: string;
  paymentMethod: string;
  bankAccountId: string;
  applyPayment: boolean;
  observationsTemplate: string;
  einvoiceEnabled: boolean;
};

export type AdminWebSettingsResponse = {
  alegra: {
    hasApiKey: boolean;
    needsReconnect?: boolean;
  } | null;
  invoice: AdminWebInvoiceSettings | null;
};

export async function getGlobalSettings(): Promise<AdminWebSettingsResponse> {
  return requestJson<AdminWebSettingsResponse>({
    path: "/settings",
    method: "GET",
  });
}

export async function saveGlobalInvoiceSettings(payload: AdminWebInvoiceSettings): Promise<{ saved: true }> {
  return requestJson<{ saved: true }>({
    path: "/settings",
    method: "PUT",
    body: JSON.stringify({ invoice: payload }),
  });
}

export type AdminWebCatalogPayload = {
  items?: Array<Record<string, unknown>>;
  error?: string;
};

export async function getSettingsResolutions(shopDomain?: string): Promise<AdminWebCatalogPayload> {
  const search = new URLSearchParams();
  if (shopDomain) search.set("shopDomain", shopDomain);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebCatalogPayload>({
    path: `/settings/resolutions${suffix}`,
    method: "GET",
  });
}

export async function getAlegraCatalog(catalog: string, shopDomain?: string): Promise<AdminWebCatalogPayload> {
  const search = new URLSearchParams();
  if (shopDomain) search.set("shopDomain", shopDomain);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebCatalogPayload>({
    path: `/alegra/${encodeURIComponent(catalog)}${suffix}`,
    method: "GET",
  });
}

export type AdminWebShopifyWebhookStatus = {
  ok: boolean;
  total: number;
  connected: number;
  missing: string[];
  callbackUrl?: string;
};

export type AdminWebShopifyWebhookMutation = {
  ok: boolean;
  deleted?: number;
  total?: number;
  items?: Array<Record<string, unknown>>;
};

export async function getShopifyWebhookStatus(shopDomain: string): Promise<AdminWebShopifyWebhookStatus> {
  const search = new URLSearchParams({ shopDomain });
  return requestJson<AdminWebShopifyWebhookStatus>({
    path: `/shopify/webhooks/status?${search.toString()}`,
    method: "GET",
  });
}

export async function createShopifyWebhooks(shopDomain: string): Promise<AdminWebShopifyWebhookMutation> {
  return requestJson<AdminWebShopifyWebhookMutation>({
    path: "/shopify/webhooks",
    method: "POST",
    body: JSON.stringify({ shopDomain }),
  });
}

export async function deleteShopifyWebhooks(shopDomain: string): Promise<AdminWebShopifyWebhookMutation> {
  return requestJson<AdminWebShopifyWebhookMutation>({
    path: "/shopify/webhooks/delete",
    method: "POST",
    body: JSON.stringify({ shopDomain }),
  });
}

export type WorkerSettingDto = {
  key: string;
  label: string;
  group: "facturacion" | "sincronizacion" | "mantenimiento";
  description: string;
  impactIfOff: string;
  writesToStore: boolean;
  enabledByDefault: boolean;
  enabled: boolean;
  isDefault: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export async function fetchWorkerSettings(): Promise<WorkerSettingDto[]> {
  const response = await apiFetch("/api/sa/workers", { method: "GET" });
  if (!response.ok) throw new Error(`No se pudieron cargar los trabajos (${response.status}).`);
  const data = (await response.json()) as { items?: WorkerSettingDto[] };
  return Array.isArray(data.items) ? data.items : [];
}

export async function setWorkerEnabledRemote(workerKey: string, enabled: boolean) {
  const response = await apiFetch("/api/sa/workers/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workerKey, enabled }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message = detail && typeof detail.error === "string" ? detail.error : `error ${response.status}`;
    throw new Error(`No se pudo cambiar el trabajo: ${message}`);
  }
  return (await response.json()) as { ok: true; key: string; enabled: boolean };
}
