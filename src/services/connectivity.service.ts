import { getAlegraBaseUrl } from "../utils/alegra-env";
import { resolveShopifyApiVersion } from "../utils/shopify";

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
};

export async function validateConnections(payload: ConnectionPayload) {
  const results = {
    shopify: payload.shopify ? "failed" : "skipped",
    alegra: payload.alegra ? "failed" : "skipped",
  };

  if (payload.shopify?.shopDomain && payload.shopify?.accessToken) {
    try {
      const { shopDomain, accessToken, apiVersion } = payload.shopify;
      await testShopify({ shopDomain, accessToken, apiVersion });
      results.shopify = "ok";
    } catch (error) {
      const message = error instanceof Error ? error.message : "No disponible";
      results.shopify = `fail: ${message}`;
    }
  }

  if (payload.alegra?.email && payload.alegra?.apiKey) {
    try {
      const { email, apiKey, environment } = payload.alegra;
      await testAlegra({ email, apiKey, environment });
      results.alegra = "ok";
    } catch (error) {
      const message = error instanceof Error ? error.message : "No disponible";
      results.alegra = `fail: ${message}`;
    }
  }

  return results;
}

async function testShopify(config: {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}) {
  const version = resolveShopifyApiVersion(config.apiVersion);
  const response = await fetch(
    `https://${config.shopDomain}/admin/api/${version}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.accessToken,
      },
      body: JSON.stringify({ query: "{ shop { name } }" }),
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Shopify connection failed");
  }
  const data = await response.json();
  if (data.errors) {
    throw new Error("Shopify GraphQL error");
  }
}

async function testAlegra(config: {
  email: string;
  apiKey: string;
  environment?: string;
}) {
  const auth = Buffer.from(`${config.email}:${config.apiKey}`).toString("base64");
  const baseUrl = getAlegraBaseUrl(config.environment);
  const response = await fetch(`${baseUrl}/items?limit=1`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Alegra connection failed");
  }
}
