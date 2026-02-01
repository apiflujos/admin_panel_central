import { getOrgId, getPool, ensureToolkitSettingsTable } from "../db";
import { ShopifyClient } from "../connectors/shopify";
import { AlegraClient } from "../connectors/alegra";
import { getAlegraCredential, getSettings } from "./settings.service";
import { getShopifyConnectionDetails } from "./store-connections.service";
import { getAlegraBaseUrl } from "../utils/alegra-env";

export type ToolkitConfig = {
  diagnostics: {
    checkShopifyToken: boolean;
    checkShopifyScopes: boolean;
    checkWebhooks: boolean;
    checkAlegra: boolean;
    requiredScopes: string[];
  };
  forceSync: {
    allowCreateOrder: boolean;
    allowCreateInvoice: boolean;
    allowSkipRules: boolean;
  };
  logs: {
    limit: number;
  };
};

export type ToolkitConfigUpdate = Partial<ToolkitConfig>;

const DEFAULT_REQUIRED_SCOPES = [
  "read_orders",
  "write_products",
  "read_inventory",
  "write_inventory",
];

const DEFAULT_TOOLKIT_CONFIG: ToolkitConfig = {
  diagnostics: {
    checkShopifyToken: true,
    checkShopifyScopes: true,
    checkWebhooks: true,
    checkAlegra: true,
    requiredScopes: DEFAULT_REQUIRED_SCOPES,
  },
  forceSync: {
    allowCreateOrder: true,
    allowCreateInvoice: true,
    allowSkipRules: false,
  },
  logs: {
    limit: 20,
  },
};

const WEBHOOK_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "ORDERS_PAID",
  "REFUNDS_CREATE",
  "INVENTORY_LEVELS_UPDATE",
  "PRODUCTS_UPDATE",
];

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  return fallback;
};

const normalizeRequiredScopes = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((scope) => String(scope)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);
  }
  return DEFAULT_REQUIRED_SCOPES;
};

const normalizeLimit = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, 200);
  return fallback;
};

const sanitizeToolkitConfig = (input: ToolkitConfigUpdate | null | undefined): ToolkitConfigUpdate => {
  if (!input || typeof input !== "object") return {};
  const diagnostics = input.diagnostics || {};
  const forceSync = input.forceSync || {};
  const logs = input.logs || {};
  return {
    diagnostics: {
      checkShopifyToken: normalizeBoolean(
        diagnostics.checkShopifyToken,
        DEFAULT_TOOLKIT_CONFIG.diagnostics.checkShopifyToken
      ),
      checkShopifyScopes: normalizeBoolean(
        diagnostics.checkShopifyScopes,
        DEFAULT_TOOLKIT_CONFIG.diagnostics.checkShopifyScopes
      ),
      checkWebhooks: normalizeBoolean(
        diagnostics.checkWebhooks,
        DEFAULT_TOOLKIT_CONFIG.diagnostics.checkWebhooks
      ),
      checkAlegra: normalizeBoolean(
        diagnostics.checkAlegra,
        DEFAULT_TOOLKIT_CONFIG.diagnostics.checkAlegra
      ),
      requiredScopes: normalizeRequiredScopes(diagnostics.requiredScopes),
    },
    forceSync: {
      allowCreateOrder: normalizeBoolean(
        forceSync.allowCreateOrder,
        DEFAULT_TOOLKIT_CONFIG.forceSync.allowCreateOrder
      ),
      allowCreateInvoice: normalizeBoolean(
        forceSync.allowCreateInvoice,
        DEFAULT_TOOLKIT_CONFIG.forceSync.allowCreateInvoice
      ),
      allowSkipRules: normalizeBoolean(
        forceSync.allowSkipRules,
        DEFAULT_TOOLKIT_CONFIG.forceSync.allowSkipRules
      ),
    },
    logs: {
      limit: normalizeLimit(logs.limit, DEFAULT_TOOLKIT_CONFIG.logs.limit),
    },
  };
};

const mergeToolkitConfig = (base: ToolkitConfig, override: ToolkitConfigUpdate | null) => {
  if (!override) return base;
  const sanitized = sanitizeToolkitConfig(override);
  return {
    diagnostics: {
      ...base.diagnostics,
      ...(sanitized.diagnostics || {}),
    },
    forceSync: {
      ...base.forceSync,
      ...(sanitized.forceSync || {}),
    },
    logs: {
      ...base.logs,
      ...(sanitized.logs || {}),
    },
  };
};

export async function getGlobalToolkitConfig() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureToolkitSettingsTable(pool);
  const result = await pool.query<{ config_json: Record<string, unknown> | null }>(
    `
    SELECT config_json
    FROM toolkit_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  const stored = (result.rows[0]?.config_json || {}) as ToolkitConfigUpdate;
  return mergeToolkitConfig(DEFAULT_TOOLKIT_CONFIG, stored);
}

export async function saveGlobalToolkitConfig(config: ToolkitConfigUpdate) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureToolkitSettingsTable(pool);
  const sanitized = sanitizeToolkitConfig(config);
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM toolkit_settings
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE toolkit_settings
      SET config_json = $1
      WHERE id = $2
      `,
      [sanitized, existing.rows[0].id]
    );
  } else {
    await pool.query(
      `
      INSERT INTO toolkit_settings (organization_id, config_json)
      VALUES ($1, $2)
      `,
      [orgId, sanitized]
    );
  }
  return { saved: true };
}

export async function getStoreToolkitConfig(shopDomain: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const normalized = String(shopDomain || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const result = await pool.query<{ config_json: Record<string, unknown> | null }>(
    `
    SELECT config_json
    FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, normalized]
  );
  const raw = (result.rows[0]?.config_json || {}) as Record<string, unknown>;
  const toolkit = (raw.toolkit || {}) as ToolkitConfigUpdate;
  const global = await getGlobalToolkitConfig();
  return {
    config: mergeToolkitConfig(global, toolkit),
    overrides: sanitizeToolkitConfig(toolkit),
  };
}

export async function saveStoreToolkitConfig(shopDomain: string, config: ToolkitConfigUpdate) {
  const pool = getPool();
  const orgId = getOrgId();
  const normalized = String(shopDomain || "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!normalized) throw new Error("Dominio Shopify requerido");
  const existing = await pool.query<{ id: number; config_json: Record<string, unknown> | null }>(
    `
    SELECT id, config_json
    FROM shopify_store_configs
    WHERE organization_id = $1 AND shop_domain = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, normalized]
  );
  if (!existing.rows.length) {
    throw new Error("No existe configuracion para esta tienda");
  }
  const current = existing.rows[0].config_json || {};
  const updated = {
    ...(current || {}),
    toolkit: sanitizeToolkitConfig(config),
  };
  await pool.query(
    `
    UPDATE shopify_store_configs
    SET config_json = $1
    WHERE id = $2
    `,
    [updated, existing.rows[0].id]
  );
  return { saved: true };
}

type HealthCheckResult = {
  ok: boolean;
  shopify?: {
    token: boolean;
    scopes: { ok: boolean; missing: string[]; granted: string[] };
    webhooks: { ok: boolean; missing: string[]; callbackUrl: string };
  };
  alegra?: { ok: boolean; message?: string };
};

const resolveBaseUrl = (req: { headers: Record<string, string | string[] | undefined>; protocol?: string }) => {
  const explicit = process.env.PUBLIC_URL || "";
  if (explicit) return explicit.replace(/\/$/, "");
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0];
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0];
  const proto = forwardedProto || req.protocol || "https";
  const host = forwardedHost || req.headers.host || "";
  if (!host) {
    throw new Error("No se pudo resolver el host de la aplicacion.");
  }
  return `${proto}://${host}`.replace(/\/$/, "");
};

const normalizeUrl = (value: string) => value.replace(/\/$/, "").toLowerCase();

async function fetchShopifyScopes(shopDomain: string, accessToken: string) {
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_scopes.json`, {
    headers: { "X-Shopify-Access-Token": accessToken },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify scopes error: ${response.status} ${text}`);
  }
  const data = (await response.json()) as { access_scopes?: Array<{ handle?: string }> };
  return (data.access_scopes || []).map((scope) => String(scope.handle || "")).filter(Boolean);
}

export async function checkConnectionStatus(
  shopDomain: string,
  reqLike: { headers: Record<string, string | string[] | undefined>; protocol?: string }
): Promise<HealthCheckResult> {
  const storeConfig = await getStoreToolkitConfig(shopDomain);
  const config = storeConfig.config;
  const result: HealthCheckResult = { ok: true };
  const shopifyDetails = await getShopifyConnectionDetails(shopDomain);
  const baseUrl = resolveBaseUrl(reqLike);
  const requiredScopes = config.diagnostics.requiredScopes;
  const shopifyStatus = {
    token: true,
    scopes: { ok: true, missing: [] as string[], granted: [] as string[] },
    webhooks: { ok: true, missing: [] as string[], callbackUrl: `${baseUrl}/api/webhooks/shopify` },
  };

  if (config.diagnostics.checkShopifyScopes) {
    try {
      const granted = await fetchShopifyScopes(shopifyDetails.shopDomain, shopifyDetails.accessToken);
      const missing = requiredScopes.filter((scope) => !granted.includes(scope));
      shopifyStatus.scopes = {
        ok: missing.length === 0,
        missing,
        granted,
      };
    } catch (error) {
      shopifyStatus.scopes = {
        ok: false,
        missing: requiredScopes,
        granted: [],
      };
      result.ok = false;
    }
  }

  if (config.diagnostics.checkWebhooks) {
    try {
      const client = new ShopifyClient({
        shopDomain: shopifyDetails.shopDomain,
        accessToken: shopifyDetails.accessToken,
      });
      const data = await client.listWebhookSubscriptions(100);
      const edges = data.webhookSubscriptions?.edges || [];
      const expectedCallback = normalizeUrl(`${baseUrl}/api/webhooks/shopify`);
      const topics = new Set<string>();
      edges.forEach((edge) => {
        const node = edge.node;
        const endpointUrl = node.endpoint?.callbackUrl || "";
        if (endpointUrl && normalizeUrl(endpointUrl) === expectedCallback) {
          topics.add(String(node.topic));
        }
      });
      const missing = WEBHOOK_TOPICS.filter((topic) => !topics.has(topic));
      shopifyStatus.webhooks = {
        ok: missing.length === 0,
        missing,
        callbackUrl: `${baseUrl}/api/webhooks/shopify`,
      };
    } catch {
      shopifyStatus.webhooks = {
        ok: false,
        missing: WEBHOOK_TOPICS,
        callbackUrl: `${baseUrl}/api/webhooks/shopify`,
      };
      result.ok = false;
    }
  }

  result.shopify = shopifyStatus;

  if (config.diagnostics.checkAlegra) {
    try {
      const alegraCred = await getAlegraCredential();
      const client = new AlegraClient({
        email: alegraCred.email,
        apiKey: alegraCred.apiKey,
        baseUrl: getAlegraBaseUrl(alegraCred.environment || "prod"),
      });
      await client.listWarehouses();
      result.alegra = { ok: true };
    } catch (error) {
      result.alegra = {
        ok: false,
        message: (error as { message?: string })?.message || "No disponible",
      };
      result.ok = false;
    }
  }

  return result;
}

export async function reinstallShopifyWebhooks(
  shopDomain: string,
  reqLike: { headers: Record<string, string | string[] | undefined>; protocol?: string }
) {
  const details = await getShopifyConnectionDetails(shopDomain);
  const baseUrl = resolveBaseUrl(reqLike);
  const client = new ShopifyClient({
    shopDomain: details.shopDomain,
    accessToken: details.accessToken,
  });
  const data = await client.listWebhookSubscriptions(100);
  const edges = data.webhookSubscriptions?.edges || [];
  const expectedCallback = normalizeUrl(`${baseUrl}/api/webhooks/shopify`);
  const targets = edges.filter((edge) => {
    const endpointUrl = edge.node.endpoint?.callbackUrl || "";
    return endpointUrl && normalizeUrl(endpointUrl) === expectedCallback;
  });
  const deletions = await Promise.all(
    targets.map(async (edge) => {
      try {
        const response = await client.deleteWebhookSubscription(edge.node.id);
        const payload = response.webhookSubscriptionDelete;
        return {
          id: edge.node.id,
          ok: payload.userErrors.length === 0,
          errors: payload.userErrors || [],
        };
      } catch (error) {
        return {
          id: edge.node.id,
          ok: false,
          errors: [{ message: (error as { message?: string })?.message || "error" }],
        };
      }
    })
  );
  const callbackUrl = `${baseUrl}/api/webhooks/shopify`;
  const creations = await Promise.all(
    WEBHOOK_TOPICS.map(async (topic) => {
      try {
        const data = await client.createWebhookSubscription(topic, callbackUrl);
        const response = data.webhookSubscriptionCreate;
        const errors = response.userErrors || [];
        return {
          topic,
          ok: errors.length === 0,
          errors,
        };
      } catch (error) {
        return {
          topic,
          ok: false,
          errors: [{ message: (error as { message?: string })?.message || "error" }],
        };
      }
    })
  );
  return {
    deleted: deletions.filter((item) => item.ok).length,
    created: creations.filter((item) => item.ok).length,
    total: WEBHOOK_TOPICS.length,
    callbackUrl,
    deletions,
    creations,
  };
}

export async function listToolkitErrors(limit: number) {
  const pool = getPool();
  const orgId = getOrgId();
  const safeLimit = Math.min(Math.max(1, Number(limit || 20)), 200);
  const result = await pool.query<{
    id: number;
    entity: string;
    direction: string;
    status: string;
    message: string | null;
    request_json: Record<string, unknown> | null;
    response_json: Record<string, unknown> | null;
    created_at: string;
  }>(
    `
    SELECT id, entity, direction, status, message, request_json, response_json, created_at
    FROM sync_logs
    WHERE organization_id = $1 AND status IN ('fail', 'error')
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [orgId, safeLimit]
  );
  return result.rows;
}

export function resolveToolkitConfigForRequest(
  globalConfig: ToolkitConfig,
  storeOverrides?: ToolkitConfigUpdate | null
) {
  return mergeToolkitConfig(globalConfig, storeOverrides || null);
}

export async function getShopifyScopesFromStored(shopDomain: string) {
  const details = await getShopifyConnectionDetails(shopDomain);
  const scopes = String(details.scopes || "")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
  return scopes;
}

export async function listToolkitConfigSummary() {
  const settings = await getSettings();
  const globalConfig = await getGlobalToolkitConfig();
  return {
    settings,
    config: globalConfig,
  };
}
