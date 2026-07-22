import { getAlegraBaseUrl } from "../utils/alegra-env";
import { assertPublicHostname } from "../utils/safe-host";
import { resolveShopifyApiVersion } from "../utils/shopify";

function friendlyWooError(status: number): string {
  if (status === 401) return "Credenciales WooCommerce rechazadas (401).";
  if (status === 403) return "Acceso denegado por WooCommerce (403).";
  if (status === 404) return "Endpoint WooCommerce no encontrado (404).";
  if (status === 429) return "WooCommerce está limitando peticiones (429).";
  if (status >= 500) return `WooCommerce no disponible (${status}).`;
  return `WooCommerce error (${status}).`;
}

function friendlyShopifyError(status: number): string {
  if (status === 401) return "Credenciales Shopify rechazadas (401).";
  if (status === 402) return "Cuenta Shopify sin pago al día (402).";
  if (status === 403) return "Acceso denegado por Shopify (403).";
  if (status === 404) return "Endpoint Shopify no encontrado (404).";
  if (status === 423) return "Tienda Shopify bloqueada (423).";
  if (status === 429) return "Shopify está limitando peticiones (429).";
  if (status >= 500) return `Shopify no disponible (${status}).`;
  return `Shopify error (${status}).`;
}

function friendlyAlegraError(status: number): string {
  if (status === 401) return "Credenciales Alegra rechazadas (401).";
  if (status === 403) return "Acceso denegado por Alegra (403).";
  if (status === 404) return "Endpoint Alegra no encontrado (404).";
  if (status === 429) return "Alegra está limitando peticiones (429).";
  if (status >= 500) return `Alegra no disponible (${status}).`;
  return `Alegra error (${status}).`;
}

type ConnectionPayload = {
  shopify?: {
    shopDomain?: string;
    accessToken?: string;
    apiVersion?: string;
  };
  alegra?: {
    email?: string;
    apiKey?: string;
    environment?: string;
  };
  woocommerce?: {
    shopDomain?: string;
    consumerKey?: string;
    consumerSecret?: string;
  };
};

export async function validateConnections(payload: ConnectionPayload) {
  const results = {
    shopify: payload.shopify ? "failed" : "skipped",
    alegra: payload.alegra ? "failed" : "skipped",
    woocommerce: payload.woocommerce ? "failed" : "skipped",
    results: [] as Array<{ provider: string; status: "ok" | "fail" | "skipped"; message?: string }>,
  };

  if (payload.shopify?.shopDomain && payload.shopify?.accessToken) {
    try {
      const { shopDomain, accessToken, apiVersion } = payload.shopify;
      await testShopify({ shopDomain, accessToken, apiVersion });
      results.shopify = "ok";
      results.results.push({ provider: "shopify", status: "ok" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No disponible";
      results.shopify = `fail: ${message}`;
      results.results.push({ provider: "shopify", status: "fail", message });
    }
  } else {
    results.results.push({ provider: "shopify", status: "skipped" });
  }

  if (payload.alegra?.email && payload.alegra?.apiKey) {
    try {
      const { email, apiKey, environment } = payload.alegra;
      await testAlegra({ email, apiKey, environment });
      results.alegra = "ok";
      results.results.push({ provider: "alegra", status: "ok" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No disponible";
      results.alegra = `fail: ${message}`;
      results.results.push({ provider: "alegra", status: "fail", message });
    }
  } else {
    results.results.push({ provider: "alegra", status: "skipped" });
  }

  if (payload.woocommerce?.shopDomain && payload.woocommerce?.consumerKey && payload.woocommerce?.consumerSecret) {
    try {
      const { shopDomain, consumerKey, consumerSecret } = payload.woocommerce;
      await testWooCommerce({ shopDomain, consumerKey, consumerSecret });
      results.woocommerce = "ok";
      results.results.push({ provider: "woocommerce", status: "ok" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No disponible";
      results.woocommerce = `fail: ${message}`;
      results.results.push({ provider: "woocommerce", status: "fail", message });
    }
  } else {
    results.results.push({ provider: "woocommerce", status: "skipped" });
  }

  return results;
}

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

export async function testShopify(config: { shopDomain: string; accessToken: string; apiVersion?: string }) {
  const version = resolveShopifyApiVersion(config.apiVersion);
  const response = await fetch(`https://${config.shopDomain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.accessToken,
    },
    body: JSON.stringify({ query: "{ shop { name } }" }),
    signal: withTimeout(15_000),
  });
  if (!response.ok) {
    await response.text().catch(() => "");
    throw new Error(friendlyShopifyError(response.status));
  }
  const data = await response.json();
  if (data.errors) {
    throw new Error("Shopify rechazó la consulta GraphQL (revisa scopes o token).");
  }
}

export async function testAlegra(config: { email: string; apiKey: string; environment?: string }) {
  const auth = Buffer.from(`${config.email}:${config.apiKey}`).toString("base64");
  const baseUrl = getAlegraBaseUrl(config.environment);
  const response = await fetch(`${baseUrl}/items?limit=1`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    signal: withTimeout(15_000),
  });
  if (!response.ok) {
    await response.text().catch(() => "");
    throw new Error(friendlyAlegraError(response.status));
  }
}

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

export async function testWooCommerce(config: { shopDomain: string; consumerKey: string; consumerSecret: string }) {
  const domain = normalizeShopDomain(config.shopDomain);
  await assertPublicHostname(domain);
  const token = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const response = await fetch(`https://${domain}/wp-json/wc/v3/products?per_page=1`, {
    headers: {
      Authorization: `Basic ${token}`,
      Accept: "application/json",
    },
    signal: withTimeout(15_000),
  });
  if (!response.ok) {
    await response.text().catch(() => "");
    throw new Error(friendlyWooError(response.status));
  }
}
