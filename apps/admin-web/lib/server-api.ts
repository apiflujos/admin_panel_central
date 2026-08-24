import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { toAuthSessionDto } from "../../../packages/domain/src/auth";
import type { ContactsListServiceResult } from "../../../packages/domain/src/contacts";
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
import { getSessionUser } from "../../../src/services/auth.service";
import type { OrderInvoiceOverride } from "../../../src/services/order-invoice-overrides.service";
import type { ConnectionsWorkspace } from "./connections-workspace";
import { normalizeSourceOfTruth } from "../../../packages/shared/src/source-of-truth";

async function countEnabledModules() {
  const [{ getOrgId, getPool }] = await Promise.all([import("../../../src/db")]);
  const pool = getPool();
  const tenantId = getOrgId();
  const rows = await pool.query<{ key: string }>(
    `
    SELECT md.key
    FROM sa.module_definitions md
    LEFT JOIN sa.tenant_modules tm
      ON tm.module_key = md.key AND tm.tenant_id = $1
    WHERE md.active = true
      AND COALESCE(tm.enabled, true) = true
    `,
    [tenantId]
  );
  return rows.rows.length;
}

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

export const getServerCompanyBrand = cache(
  async (): Promise<{
    companyName: string;
    logoBase64: string;
  }> => {
    try {
      const { getCompanyProfile } = await import("../../../src/services/company.service");
      const company = await getCompanyProfile();
      return {
        companyName: company.name?.trim() || "ApiFlujos",
        logoBase64: company.logoBase64 || "",
      };
    } catch {
      return {
        companyName: "ApiFlujos",
        logoBase64: "",
      };
    }
  }
);

export async function requireServerSessionProfile(): Promise<AuthSessionDto> {
  const session = await getServerSessionProfile();
  if (!session) {
    redirect("/auth/login");
  }
  return session;
}

export async function getServerDashboardOverview(): Promise<AdminWebDashboardOverviewDto> {
  const [
    { getCompanyProfile },
    { listSyncLogs },
    { listOrders },
    { listProducts },
    { listStoreConnections },
    { toAdminWebDashboardOverviewDto },
    { summarizeConnectionHealth },
  ] = await Promise.all([
    import("../../../src/services/company.service"),
    import("../../../src/services/logs.service"),
    import("../../../src/services/orders.service"),
    import("../../../src/services/products.service"),
    import("../../../src/services/store-connections.service"),
    import("../../../packages/domain/src/dashboard"),
    import("../../../packages/domain/src/settings"),
  ]);

  const [company, connections, moduleCount, products, orders, logs] = await Promise.all([
    getCompanyProfile(),
    listStoreConnections(),
    countEnabledModules(),
    listProducts({ limit: 3, offset: 0 }),
    listOrders({ limit: 3, offset: 0 }),
    listSyncLogs({}),
  ]);

  const { activeConnections, pendingActions } = summarizeConnectionHealth(connections);

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
  const [{ summarizeConnectionHealth, toSettingsOverviewDto }, { getCompanyProfile }, { listStoreConnections }] =
    await Promise.all([
      import("../../../packages/domain/src/settings"),
      import("../../../src/services/company.service"),
      import("../../../src/services/store-connections.service"),
    ]);

  const [company, connections, moduleCount] = await Promise.all([
    getCompanyProfile(),
    listStoreConnections(),
    countEnabledModules(),
  ]);

  const { activeConnections, pendingActions } = summarizeConnectionHealth(connections);

  return toSettingsOverviewDto({
    companyName: company.name || "ApiFlujos",
    moduleCount,
    activeConnections,
    pendingActions,
  });
}

export async function getServerConnectionsStatus(): Promise<ConnectionStatusListDto> {
  const [{ buildProviderDetail, toConnectionStatus, toConnectionStatusListDto }, { listStoreConnections }] =
    await Promise.all([
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

export async function getServerConnectionsWorkspace(): Promise<ConnectionsWorkspace> {
  const [
    { buildProviderDetail, toConnectionStatus },
    { getCompanyProfile },
    { listStoreConnections },
    { listStoreConfigs },
    { getSettings },
  ] = await Promise.all([
    import("../../../packages/domain/src/settings"),
    import("../../../src/services/company.service"),
    import("../../../src/services/store-connections.service"),
    import("../../../src/services/store-configs.service"),
    import("../../../src/services/settings.service"),
  ]);

  const [company, connections, storeConfigs, settings] = await Promise.all([
    getCompanyProfile(),
    listStoreConnections(),
    listStoreConfigs(),
    getSettings(),
  ]);

  const stores = connections.storesCatalog.map((store: (typeof connections.storesCatalog)[number]) => ({
    id: store.id,
    name: store.name,
    createdAt: new Date(String(store.createdAt)).toISOString(),
    providers: {
      shopify: store.shopify
        ? {
            label: store.shopify.storeName || store.shopify.shopDomain,
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
            shopDomain: store.shopify.shopDomain,
          }
        : null,
      alegra: store.alegra
        ? {
            label: store.alegra.email,
            status: toConnectionStatus({
              connected: !store.alegra.needsReconnect,
              needsReconnect: store.alegra.needsReconnect,
            }),
            detail: buildProviderDetail(
              {
                connected: !store.alegra.needsReconnect,
                needsReconnect: store.alegra.needsReconnect,
              },
              "Cuenta contable vinculada",
              "Reconectar credenciales de Alegra"
            ),
          }
        : null,
      woocommerce: store.woo
        ? {
            label: store.woo.storeName || store.woo.shopDomain,
            status: toConnectionStatus({ connected: store.woo.ok, needsReconnect: !store.woo.ok }),
            detail: buildProviderDetail(
              { connected: store.woo.ok, needsReconnect: !store.woo.ok },
              "API key y secret disponibles",
              "Completar consumer key/secret"
            ),
            shopDomain: store.woo.shopDomain,
          }
        : null,
    },
  }));

  const settingsRules = (settings.rules || {}) as Record<string, unknown>;

  return {
    companyName: company.name || "ApiFlujos",
    securityMisconfigured: Boolean(connections.securityMisconfigured),
    stores,
    storeConfigs: storeConfigs.map((config: (typeof storeConfigs)[number]) => ({
      storeId: config.storeId,
      storeName: config.storeName,
      shopDomain: config.shopDomain,
      // Este mapeo es una LISTA BLANCA: lo que no se nombre aquí no llega a la
      // interfaz, por más que esté guardado.
      alegraAccountId: (config as { alegraAccountId?: number }).alegraAccountId,
      sourceOfTruth: normalizeSourceOfTruth((config as { sourceOfTruth?: unknown }).sourceOfTruth),
      priceLists: {
        generalId: config.priceLists.generalId,
        discountId: config.priceLists.discountId,
        wholesaleId: config.priceLists.wholesaleId,
        currency: config.priceLists.currency,
      },
      transfers: {
        enabled: config.transfers.enabled,
        destinationMode: config.transfers.destinationMode as "fixed" | "auto" | "rule",
        destinationRequired: config.transfers.destinationRequired,
        destinationWarehouseId: config.transfers.destinationWarehouseId,
        originWarehouseIds: config.transfers.originWarehouseIds as string[],
        priorityWarehouseId: config.transfers.priorityWarehouseId,
        strategy: config.transfers.strategy as "manual" | "consolidation" | "priority" | "max_stock",
        fallbackStrategy: config.transfers.fallbackStrategy as
          | "manual"
          | "consolidation"
          | "priority"
          | "max_stock"
          | "",
        tieBreakRule: config.transfers.tieBreakRule as "" | "priority" | "max_stock" | "random",
        splitEnabled: Boolean(config.transfers.splitEnabled),
        minStock: Number(config.transfers.minStock || 0),
      },
      rules: {
        syncEnabled: config.rules.syncEnabled,
        inventoryAdjustmentsEnabled: config.rules.inventoryAdjustmentsEnabled,
        inventoryAdjustmentsIntervalMinutes: config.rules.inventoryAdjustmentsIntervalMinutes,
        inventoryAdjustmentsAutoPublish: config.rules.inventoryAdjustmentsAutoPublish,
        publishOnStock: config.rules.publishOnStock,
        autoPublishOnWebhook: config.rules.autoPublishOnWebhook,
        autoPublishStatus: config.rules.autoPublishStatus as "draft" | "active",
        onlyActiveItems: config.rules.onlyActiveItems,
        trackInventory: config.rules.trackInventory,
        allowOversell: config.rules.allowOversell,
        webhookItemsEnabled: config.rules.webhookItemsEnabled,
        createInShopify: config.rules.createInShopify,
        updateInShopify: config.rules.updateInShopify,
        includeImages: config.rules.includeImages,
        warehouseIds: config.rules.warehouseIds,
      },
      invoice: {
        generateInvoice: config.invoice.generateInvoice,
        resolutionId: config.invoice.resolutionId,
        paymentMethod: config.invoice.paymentMethod,
        bankAccountId: config.invoice.bankAccountId,
        applyPayment: config.invoice.applyPayment,
        einvoiceEnabled: config.invoice.einvoiceEnabled,
      },
      sync: {
        contacts: {
          enabled: config.sync.contacts.enabled,
          fromShopify: config.sync.contacts.fromShopify,
          fromAlegra: config.sync.contacts.fromAlegra,
          createInAlegra: config.sync.contacts.createInAlegra,
          createInShopify: config.sync.contacts.createInShopify,
          matchPriority: config.sync.contacts.matchPriority,
        },
        orders: {
          shopifyEnabled: config.sync.orders.shopifyEnabled,
          alegraEnabled: config.sync.orders.alegraEnabled,
          shopifyToAlegra: config.sync.orders.shopifyToAlegra as "invoice" | "contact_only" | "db_only" | "off",
          alegraToShopify: config.sync.orders.alegraToShopify as "draft" | "active" | "off",
        },
        products: {
          shopifyEnabled: config.sync.products.shopifyEnabled,
          createInAlegra: config.sync.products.createInAlegra,
          updateInAlegra: config.sync.products.updateInAlegra,
          includeInventory: config.sync.products.includeInventory,
          warehouseId: config.sync.products.warehouseId,
          matchPriority: config.sync.products.matchPriority as "sku_barcode" | "barcode_sku",
        },
      },
    })),
    storeConfigDefaults: {
      priceLists: {
        generalId: "",
        discountId: "",
        wholesaleId: "",
        currency: "",
      },
      rules: {
        syncEnabled: true,
        inventoryAdjustmentsEnabled: settingsRules.inventoryAdjustmentsEnabled !== false,
        inventoryAdjustmentsIntervalMinutes:
          typeof settingsRules.inventoryAdjustmentsIntervalMinutes === "number"
            ? Number(settingsRules.inventoryAdjustmentsIntervalMinutes)
            : 5,
        inventoryAdjustmentsAutoPublish: settingsRules.inventoryAdjustmentsAutoPublish !== false,
        publishOnStock: settingsRules.publishOnStock !== false,
        autoPublishOnWebhook: settingsRules.autoPublishOnWebhook === true,
        autoPublishStatus: settingsRules.autoPublishStatus === "active" ? "active" : "draft",
        onlyActiveItems: Boolean(settingsRules.onlyActiveItems),
        trackInventory: settingsRules.trackInventory !== false,
        allowOversell: settingsRules.allowOversell === true,
        webhookItemsEnabled: settingsRules.webhookItemsEnabled !== false,
        // Escrituras hacia Shopify: sólo con permiso explícito. Con `!== false`
        // la interfaz mostraba habilitado lo que nadie había activado.
        createInShopify: settingsRules.createInShopify === true,
        updateInShopify: settingsRules.updateInShopify === true,
        includeImages: settingsRules.includeImages !== false,
        warehouseIds: Array.isArray(settingsRules.warehouseIds) ? (settingsRules.warehouseIds as string[]) : [],
      },
      invoice: {
        generateInvoice: settings.invoice?.generateInvoice ?? false,
        resolutionId: settings.invoice?.resolutionId ?? "",
        paymentMethod: settings.invoice?.paymentMethod ?? "",
        bankAccountId: settings.invoice?.bankAccountId ?? "",
        applyPayment: settings.invoice?.applyPayment ?? false,
        einvoiceEnabled: settings.invoice?.einvoiceEnabled ?? false,
      },
      sync: {
        contacts: {
          enabled: true,
          fromShopify: true,
          fromAlegra: true,
          createInAlegra: true,
          createInShopify: true,
          matchPriority: ["document", "phone", "email"],
        },
        orders: {
          shopifyEnabled: true,
          alegraEnabled: false,
          shopifyToAlegra: "db_only",
          alegraToShopify: "off",
        },
        products: {
          shopifyEnabled: false,
          createInAlegra: false,
          updateInAlegra: true,
          includeInventory: false,
          warehouseId: "",
          matchPriority: "sku_barcode",
        },
      },
      transfers: {
        enabled: true,
        destinationMode: "fixed",
        destinationRequired: true,
        destinationWarehouseId: settings.invoice?.warehouseId ?? "",
        originWarehouseIds: Array.isArray(settingsRules.warehouseIds) ? (settingsRules.warehouseIds as string[]) : [],
        priorityWarehouseId: "",
        strategy: "manual",
        fallbackStrategy: "",
        tieBreakRule: "",
        splitEnabled: false,
        minStock: 0,
      },
    },
    alegraAccounts: connections.alegraAccounts.map((account: (typeof connections.alegraAccounts)[number]) => ({
      id: account.id,
      email: account.email,
      environment: account.environment,
      storeId: account.storeId ?? null,
      needsReconnect: account.needsReconnect,
    })),
    ads: [
      {
        key: "google_ads",
        label: "Google Ads",
        status: toConnectionStatus(connections.googleAds),
        detail: buildProviderDetail(connections.googleAds, "Spend sync operativo", "Renovar credenciales Google Ads"),
      },
      {
        key: "meta_ads",
        label: "Meta Ads",
        status: toConnectionStatus(connections.metaAds),
        detail: buildProviderDetail(connections.metaAds, "Spend sync operativo", "Renovar credenciales Meta Ads"),
      },
      {
        key: "tiktok_ads",
        label: "TikTok Ads",
        status: toConnectionStatus(connections.tiktokAds),
        detail: buildProviderDetail(connections.tiktokAds, "Spend sync operativo", "Renovar credenciales TikTok Ads"),
      },
    ],
  };
}

export async function getServerProductsCatalog(params?: {
  query?: string;
  start?: number;
  limit?: number;
}): Promise<AdminWebProductsListDto> {
  const [{ normalizeProductsListFilters, toAdminWebProductsListDto }, { listProducts }] = await Promise.all([
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
    { listOrderInvoiceOverrides, orderOverrideKey, validateEinvoiceData },
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

  const orderRefs = result.items
    .filter((row: (typeof result.items)[number]) => Boolean(row.shopify_order_id))
    .map((row: (typeof result.items)[number]) => ({
      orderId: String(row.shopify_order_id),
      shopDomain: row.shop_domain ? String(row.shop_domain) : "",
    }));
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

  const [overrides, einvoiceEnabled] = await Promise.all([listOrderInvoiceOverrides(orderRefs), loadEinvoiceEnabled()]);

  return toAdminWebOrdersListDto({
    result,
    getOverride: (shopifyId, row) =>
      overrides.get(orderOverrideKey(shopifyId, row.shop_domain ? String(row.shop_domain) : "")) || null,
    getMissing: (_shopifyId, override) =>
      einvoiceEnabled ? validateEinvoiceData((override as OrderInvoiceOverride | null) || null) : [],
    einvoiceEnabled,
  });
}

export async function getServerContactsCatalog(filters?: {
  query?: string;
  status?: string;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminWebContactsListDto> {
  const [{ normalizeContactsListFilters, toAdminWebContactsListDto }, { listContacts }] = await Promise.all([
    import("../../../packages/domain/src/contacts"),
    import("../../../src/services/contacts.service"),
  ]);

  const result = await listContacts(
    normalizeContactsListFilters({
      query: filters?.query,
      status: filters?.status,
      source: filters?.source,
      from: filters?.from,
      to: filters?.to,
      limit: String(filters?.limit ?? 20),
      offset: String(filters?.offset ?? 0),
    })
  );

  return toAdminWebContactsListDto(result as ContactsListServiceResult);
}

export async function getServerInvoicesCatalog(offset = 0): Promise<AdminWebInvoicesListDto> {
  const [{ normalizeInvoicesListFilters, toAdminWebInvoicesListDto }, { listInvoices }] = await Promise.all([
    import("../../../packages/domain/src/invoices"),
    import("../../../src/services/invoices.service"),
  ]);

  // El desplazamiento estaba FIJO en 0: con 660 facturas en producción se
  // veían las 20 primeras, sin paginación y sin decir que había más.
  const result = await listInvoices(
    normalizeInvoicesListFilters({ limit: "20", offset: String(Math.max(0, Math.floor(offset))) })
  );

  return toAdminWebInvoicesListDto(result);
}

export async function getServerOperationsCatalog(): Promise<AdminWebOperationsListDto> {
  const [{ normalizeOperationsDays, toAdminWebOperationsListDto }, { listOperations }] = await Promise.all([
    import("../../../packages/domain/src/operations"),
    import("../../../src/services/operations.service"),
  ]);

  try {
    const result = await listOperations(normalizeOperationsDays({ days: "7" }));

    return toAdminWebOperationsListDto(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "operations_load_failed";
    if (message.includes("Missing Shopify credentials in DB")) {
      return toAdminWebOperationsListDto({ items: [] });
    }
    throw error;
  }
}

export async function getServerLogsCatalog(filters?: {
  status?: string;
  orderId?: string;
  entity?: string;
  direction?: string;
  from?: string;
  to?: string;
  offset?: number;
}): Promise<AdminWebLogsListDto> {
  const [{ normalizeLogsFilters, toAdminWebLogsListDto }, { listSyncLogs }] = await Promise.all([
    import("../../../packages/domain/src/logs"),
    import("../../../src/services/logs.service"),
  ]);
  const data = await listSyncLogs(
    normalizeLogsFilters({
      status: filters?.status,
      orderId: filters?.orderId,
      entity: filters?.entity,
      direction: filters?.direction,
      from: filters?.from,
      to: filters?.to,
    }),
    { offset: Math.max(0, Math.floor(Number(filters?.offset) || 0)) }
  );
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
    // OJO con los nombres: son PLANTILLAS del sistema, no cosas de este
    // cliente. La pantalla lo dice explícitamente para no confundir "hay 3
    // plantillas de plan" con "este cliente tiene plan".
    pool.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM sa.plan_definitions`),
    // `servicesCount` sale de limit_definitions: son LÍMITES, no servicios. El
    // nombre del campo viene de antes; la pantalla ya no lo llama "Servicios".
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

export async function getServerCompanyProfile(): Promise<{
  name: string;
  phone: string;
  address: string;
  logoBase64: string;
}> {
  const { getCompanyProfile } = await import("../../../src/services/company.service");
  return getCompanyProfile();
}

export async function getServerTenantUsers(): Promise<
  Array<{
    id: number;
    email: string;
    role: "admin" | "agent";
    name: string | null;
    phone: string | null;
    photoBase64: string | null;
    createdAt: string;
  }>
> {
  const { listUsers } = await import("../../../src/services/users.service");
  const users = await listUsers();
  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date(user.createdAt).toISOString(),
  }));
}

export async function getServerProfile(): Promise<{
  id: number;
  organizationId: number;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  name: string | null;
  phone: string | null;
  photoBase64: string | null;
}> {
  const cookieStore = await cookies();
  const session = cookieStore.get("os_session");
  if (!session?.value) {
    redirect("/auth/login");
  }
  const user = await getSessionUser(session.value);
  if (!user) {
    redirect("/auth/login");
  }
  return {
    id: user.id,
    organizationId: user.organization_id,
    email: user.email,
    role: user.role,
    isSuperAdmin: Boolean(user.is_super_admin),
    name: user.name,
    phone: user.phone,
    photoBase64: user.photo_base64,
  };
}
