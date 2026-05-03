import type {
  AdminWebContactsListDto,
  AdminWebDashboardOverviewDto,
  AdminWebInvoicesListDto,
  AdminWebLogsListDto,
  AdminWebMarketingOverviewDto,
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

type JsonRequestOptions = RequestInit & {
  path: string;
};

async function requestJson<T>({ path, headers, ...init }: JsonRequestOptions): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    cache: "no-store",
  });

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

export async function getMarketingOverview(params: {
  shopDomain?: string;
  from?: string;
  to?: string;
}): Promise<AdminWebMarketingOverviewDto> {
  const search = new URLSearchParams();
  if (params.shopDomain) search.set("shopDomain", params.shopDomain);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  return requestJson<AdminWebMarketingOverviewDto>({
    path: `/admin-web/marketing/overview?${search.toString()}`,
    method: "GET",
  });
}

export async function getOperationsCatalog(params?: { days?: number }): Promise<AdminWebOperationsListDto> {
  const search = new URLSearchParams();
  if (typeof params?.days === "number") search.set("days", String(params.days));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return requestJson<AdminWebOperationsListDto>({ path: `/admin-web/operations${suffix}`, method: "GET" });
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
  payload: Pick<CriticalStoreConfig, "transfers" | "rules" | "invoice" | "sync"> & {
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
