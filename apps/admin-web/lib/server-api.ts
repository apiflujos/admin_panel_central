import { cache } from "react";
import { cookies } from "next/headers";

import { toAuthSessionDto } from "../../../packages/domain/src/auth";
import type { ContactsListServiceResult } from "../../../packages/domain/src/contacts";
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
import { getSessionUser } from "../../../src/services/auth.service";
import type { OrderInvoiceOverride } from "../../../src/services/order-invoice-overrides.service";

export const getServerSessionProfile = cache(async (): Promise<AuthSessionDto | null> => {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("os_session");
    if (!session?.value) return null;
    const user = await getSessionUser(session.value);
    if (!user) return null;
    return toAuthSessionDto(user as Parameters<typeof toAuthSessionDto>[0]);
  } catch {
    return null;
  }
});

export async function getServerDashboardOverview(): Promise<AdminWebDashboardOverviewDto> {
  const [
    { getCompanyProfile },
    { listSyncLogs },
    { listOrders },
    { listProducts },
    { listStoreConnections },
    { countEnabledModules },
    { toAdminWebDashboardOverviewDto },
    { summarizeConnectionHealth },
  ] = await Promise.all([
    import("../../../src/services/company.service"),
    import("../../../src/services/logs.service"),
    import("../../../src/services/orders.service"),
    import("../../../src/services/products.service"),
    import("../../../src/services/store-connections.service"),
    import("../../../apps/integration-api/src/modules/settings/handlers/support/tenant-modules"),
    import("../../../packages/domain/src/dashboard"),
    import("../../../packages/domain/src/settings"),
  ]);

  const [company, connections, moduleCount, products, orders, logs] =
    await Promise.all([
      getCompanyProfile(),
      listStoreConnections(),
      countEnabledModules(),
      listProducts({ limit: 3, offset: 0 }),
      listOrders({ limit: 3, offset: 0 }),
      listSyncLogs({}),
    ]);

  const { activeConnections, pendingActions } =
    summarizeConnectionHealth(connections);

  return toAdminWebDashboardOverviewDto({
    settings: {
      companyName: company.name || "ApiFlujos",
      moduleCount,
      activeConnections,
      pendingActions,
    },
    products,
    orders,
    logs,
  });
}

export async function getServerSettingsOverview(): Promise<SettingsOverviewDto> {
  const [
    { summarizeConnectionHealth, toSettingsOverviewDto },
    { countEnabledModules },
    { getCompanyProfile },
    { listStoreConnections },
  ] = await Promise.all([
    import("../../../packages/domain/src/settings"),
    import("../../../apps/integration-api/src/modules/settings/handlers/support/tenant-modules"),
    import("../../../src/services/company.service"),
    import("../../../src/services/store-connections.service"),
  ]);

  const [company, connections, moduleCount] = await Promise.all([
    getCompanyProfile(),
    listStoreConnections(),
    countEnabledModules(),
  ]);

  const { activeConnections, pendingActions } =
    summarizeConnectionHealth(connections);

  return toSettingsOverviewDto({
    companyName: company.name || "ApiFlujos",
    moduleCount,
    activeConnections,
    pendingActions,
  });
}

export async function getServerConnectionsStatus(): Promise<ConnectionStatusListDto> {
  const [
    { buildProviderDetail, toConnectionStatus, toConnectionStatusListDto },
    { listStoreConnections },
  ] = await Promise.all([
    import("../../../packages/domain/src/settings"),
    import("../../../src/services/store-connections.service"),
  ]);

  const connections = await listStoreConnections();

  return toConnectionStatusListDto([
    ...connections.storesCatalog.flatMap((store: (typeof connections.storesCatalog)[number]) => {
      const items: ConnectionStatusListDto["items"] = [];
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
  ]);
}

export async function getServerProductsCatalog(params?: {
  query?: string;
  start?: number;
  limit?: number;
}): Promise<AdminWebProductsListDto> {
  const [{ normalizeProductsListFilters, toAdminWebProductsListDto }, { listProducts }] =
    await Promise.all([
      import("../../../packages/domain/src/products"),
      import("../../../src/services/products.service"),
    ]);

  const result = await listProducts(
    normalizeProductsListFilters({
      start: typeof params?.start === "number" ? String(params.start) : undefined,
      limit: String(params?.limit ?? 30),
      query: params?.query,
    })
  );

  return toAdminWebProductsListDto(result);
}

export async function getServerOrdersCatalog(params?: {
  query?: string;
  offset?: number;
  limit?: number;
}): Promise<AdminWebOrdersListDto> {
  const [
    { normalizeOrdersListFilters, toAdminWebOrdersListDto },
    {
      listOrderInvoiceOverrides,
      validateEinvoiceData,
    },
    { listOrders },
    { ensureInvoiceSettingsColumns, getOrgId, getPool },
  ] = await Promise.all([
    import("../../../packages/domain/src/orders"),
    import("../../../src/services/order-invoice-overrides.service"),
    import("../../../src/services/orders.service"),
    import("../../../src/db"),
  ]);

  const result = await listOrders(
    normalizeOrdersListFilters({
      query: params?.query,
      offset: typeof params?.offset === "number" ? String(params.offset) : undefined,
      limit: String(params?.limit ?? 20),
    })
  );

  const orderIds = result.items
    .map((row: (typeof result.items)[number]) => row.shopify_order_id)
    .filter(Boolean) as string[];
  const loadEinvoiceEnabled = async () => {
    const pool = getPool();
    const orgId = getOrgId();
    await ensureInvoiceSettingsColumns(pool);
    const invoiceSettings = await pool.query<{ einvoice_enabled: boolean | null }>(
      `
      SELECT einvoice_enabled
      FROM invoice_settings
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId]
    );
    if (!invoiceSettings.rows.length) {
      return false;
    }
    return Boolean(invoiceSettings.rows[0].einvoice_enabled);
  };

  const [overrides, einvoiceEnabled] = await Promise.all([
    listOrderInvoiceOverrides(orderIds),
    loadEinvoiceEnabled(),
  ]);

  return toAdminWebOrdersListDto({
    result,
    getOverride: (shopifyId) => overrides.get(shopifyId) || null,
    getMissing: (_shopifyId, override) =>
      einvoiceEnabled ? validateEinvoiceData((override as OrderInvoiceOverride | null) || null) : [],
    einvoiceEnabled,
  });
}

export async function getServerContactsCatalog(): Promise<AdminWebContactsListDto> {
  const [{ normalizeContactsListFilters, toAdminWebContactsListDto }, { listContacts }] =
    await Promise.all([
      import("../../../packages/domain/src/contacts"),
      import("../../../src/services/contacts.service"),
    ]);

  const result = await listContacts(
    normalizeContactsListFilters({ limit: "20", offset: "0" })
  );

  return toAdminWebContactsListDto(result as ContactsListServiceResult);
}

export async function getServerInvoicesCatalog(): Promise<AdminWebInvoicesListDto> {
  const [{ normalizeInvoicesListFilters, toAdminWebInvoicesListDto }, { listInvoices }] =
    await Promise.all([
      import("../../../packages/domain/src/invoices"),
      import("../../../src/services/invoices.service"),
    ]);

  const result = await listInvoices(
    normalizeInvoicesListFilters({ limit: "20", offset: "0" })
  );

  return toAdminWebInvoicesListDto(result);
}

export async function getServerMarketingOverview(
  shopDomain?: string,
  from?: string,
  to?: string
): Promise<AdminWebMarketingOverviewDto> {
  const [
    { toAdminWebMarketingOverviewDto },
    { getMarketingExecutiveDashboard },
    { resolveMarketingDashboardFilters },
  ] = await Promise.all([
    import("../../../packages/domain/src/marketing"),
    import("../../../src/marketing/reports/marketing-reports.service"),
    import("../../../apps/integration-api/src/modules/operations/handlers/support/marketing-dashboard-filters"),
  ]);

  const filters = await resolveMarketingDashboardFilters(
    { shopDomain, from, to },
    { autofillShopDomain: true }
  );
  const result = await getMarketingExecutiveDashboard(filters);
  return toAdminWebMarketingOverviewDto(result);
}

export async function getServerOperationsCatalog(): Promise<AdminWebOperationsListDto> {
  const [{ normalizeOperationsDays, toAdminWebOperationsListDto }, { listOperations }] =
    await Promise.all([
      import("../../../packages/domain/src/operations"),
      import("../../../src/services/operations.service"),
    ]);

  const result = await listOperations(
    normalizeOperationsDays({ days: "7" })
  );

  return toAdminWebOperationsListDto(result);
}

export async function getServerLogsCatalog(): Promise<AdminWebLogsListDto> {
  const [{ toAdminWebLogsListDto }, { listSyncLogs }] = await Promise.all([
    import("../../../packages/domain/src/logs"),
    import("../../../src/services/logs.service"),
  ]);
  const data = await listSyncLogs({});
  return toAdminWebLogsListDto(data);
}

export async function getServerSuperAdminOverview(): Promise<AdminWebSuperAdminOverviewDto> {
  const [
    { toAdminWebSuperAdminOverviewDto },
    { ensureOrganization, ensureUsersTables, getOrgId, getPool },
    { listModules },
  ] = await Promise.all([
    import("../../../packages/domain/src/superadmin"),
    import("../../../src/db"),
    import("../../../src/sa/sa.admin.service"),
  ]);

  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);

  const [tenants, plans, services, modules, users] = await Promise.all([
    pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM organizations`),
    pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM sa.plan_definitions`),
    pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM sa.limit_definitions`),
    listModules(),
    pool.query<{
      id: number;
      email: string;
      name: string | null;
      phone: string | null;
      created_at: Date;
    }>(
      `
      SELECT id, email, name, phone, created_at
      FROM users
      WHERE organization_id = $1 AND is_super_admin = true
      ORDER BY created_at DESC
      `,
      [orgId]
    ),
  ]);

  return toAdminWebSuperAdminOverviewDto({
    tenantsCount: Number(tenants.rows[0]?.total || 0),
    plansCount: Number(plans.rows[0]?.total || 0),
    servicesCount: Number(services.rows[0]?.total || 0),
    modulesCount: modules.length,
    users: users.rows,
  });
}
