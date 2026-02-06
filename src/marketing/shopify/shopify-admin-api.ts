import { RedisPerSecondRateLimiter } from "../infra/rate-limiter";
import { getRedis } from "../infra/redis";

export type ShopifyAdminConfig = {
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
};

type GraphQlResponse<T> = { data?: T; errors?: Array<{ message: string }> };

const normalizeShopDomain = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

export class ShopifyAdminApi {
  private restBase: string;
  private graphqlEndpoint: string;
  private limiter: RedisPerSecondRateLimiter | null = null;

  constructor(private config: ShopifyAdminConfig) {
    const domain = normalizeShopDomain(config.shopDomain);
    const version = String(config.apiVersion || "2024-10").trim();
    this.restBase = `https://${domain}/admin/api/${version}`;
    this.graphqlEndpoint = `${this.restBase}/graphql.json`;

    const redis = getRedis();
    if (redis) {
      const maxPerSecond = Math.max(2, Number(process.env.SHOPIFY_RL_MAX_PER_SEC || 6));
      const maxWaitMs = Math.max(1000, Number(process.env.SHOPIFY_RL_MAX_WAIT_MS || 15000));
      this.limiter = new RedisPerSecondRateLimiter(redis, {
        keyPrefix: "rl:shopify",
        maxPerSecond,
        maxWaitMs,
      });
    }
  }

  private async acquire() {
    if (!this.limiter) return;
    await this.limiter.acquire(this.config.shopDomain);
  }

  private async requestRest<T>(path: string) {
    await this.acquire();
    const response = await fetch(`${this.restBase}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.config.accessToken,
      },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Shopify REST error: ${response.status} ${text}`);
    }
    return (await response.json()) as T;
  }

  private async requestGraphql<T>(query: string, variables?: Record<string, unknown>) {
    await this.acquire();
    const response = await fetch(this.graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.config.accessToken,
      },
      body: JSON.stringify({ query, variables: variables || {} }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Shopify GraphQL error: ${response.status} ${text}`);
    }
    const json = (await response.json()) as GraphQlResponse<T>;
    if (json.errors?.length) {
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
    }
    if (!json.data) {
      throw new Error("Shopify GraphQL missing data");
    }
    return json.data;
  }

  // --- Required REST endpoints (enterprise ingestion) ---
  async restOrders(params: URLSearchParams) {
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.requestRest<{ orders: unknown[] }>(`/orders.json${query}`);
  }

  async restCustomers(params: URLSearchParams) {
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.requestRest<{ customers: unknown[] }>(`/customers.json${query}`);
  }

  async restProducts(params: URLSearchParams) {
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.requestRest<{ products: unknown[] }>(`/products.json${query}`);
  }

  async restCheckouts(params: URLSearchParams) {
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.requestRest<{ checkouts: unknown[] }>(`/checkouts.json${query}`);
  }

  async restPriceRules(params: URLSearchParams) {
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.requestRest<{ price_rules: unknown[] }>(`/price_rules.json${query}`);
  }

  async restEvents(params: URLSearchParams) {
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.requestRest<{ events: unknown[] }>(`/events.json${query}`);
  }

  // --- Preferred GraphQL queries ---
  async gqlOrdersPaged(input: { query: string; cursor: string | null }) {
    const data = await this.requestGraphql<{
      orders: {
        edges: Array<{
          cursor: string;
          node: {
            id: string;
            createdAt: string;
            processedAt?: string | null;
            displayFinancialStatus?: string | null;
            sourceName?: string | null;
            tags: string[];
            discountCode?: string | null;
            // Note: Shopify GraphQL versions differ: some return [String], others a String.
            discountCodes?: Array<string> | string | null;
            registeredSourceUrl?: string | null;
            customerJourneySummary?: {
              ready: boolean;
              lastVisit?: {
                landingPage?: string | null;
                referrerUrl?: string | null;
                source?: string | null;
                utmParameters?: {
                  source?: string | null;
                  medium?: string | null;
                  campaign?: string | null;
                  content?: string | null;
                  term?: string | null;
                } | null;
              } | null;
              firstVisit?: {
                landingPage?: string | null;
                referrerUrl?: string | null;
                source?: string | null;
                utmParameters?: {
                  source?: string | null;
                  medium?: string | null;
                  campaign?: string | null;
                  content?: string | null;
                  term?: string | null;
                } | null;
              } | null;
            } | null;
            totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
            customer?: { id: string; email?: string | null } | null;
            lineItems: {
              edges: Array<{
                node: {
                  quantity: number;
                  title: string;
                  product?: { id: string; title: string } | null;
                  discountedUnitPriceSet?: { shopMoney: { amount: string } } | null;
                  originalUnitPriceSet?: { shopMoney: { amount: string } } | null;
                };
              }>;
            };
          };
        }>;
        pageInfo: { hasNextPage: boolean; endCursor?: string | null };
      };
    }>(
      `
      query MarketingOrders($query: String!, $cursor: String) {
        orders(first: 250, after: $cursor, query: $query) {
          edges {
            cursor
            node {
              id
              createdAt
              processedAt
              displayFinancialStatus
              sourceName
              tags
              discountCode
              discountCodes
              registeredSourceUrl
              customerJourneySummary {
                ready
                firstVisit {
                  landingPage
                  referrerUrl
                  source
                  utmParameters { source medium campaign content term }
                }
                lastVisit {
                  landingPage
                  referrerUrl
                  source
                  utmParameters { source medium campaign content term }
                }
              }
              totalPriceSet { shopMoney { amount currencyCode } }
              customer { id email }
              lineItems(first: 50) {
                edges {
                  node {
                    product { id title }
                    title
                    quantity
                    originalUnitPriceSet { shopMoney { amount } }
                    discountedUnitPriceSet { shopMoney { amount } }
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
      `,
      { query: input.query, cursor: input.cursor }
    );
    return data.orders;
  }
}

export function inferChannel(input: {
  utmSource?: string | null;
  utmMedium?: string | null;
  referrer?: string | null;
  sourceName?: string | null;
}) {
  const source = String(input.utmSource || "").toLowerCase();
  const medium = String(input.utmMedium || "").toLowerCase();
  const ref = String(input.referrer || "").toLowerCase();
  const sourceName = String(input.sourceName || "").toLowerCase();

  if (medium.includes("cpc") || medium.includes("paid") || medium.includes("ppc")) return "paid";
  if (medium.includes("email")) return "email";
  if (medium.includes("social") || source.includes("facebook") || source.includes("instagram") || source.includes("tiktok"))
    return "paid_social";
  if (source.includes("google") && medium.includes("organic")) return "organic_search";
  if (ref && (ref.includes("google.") || ref.includes("bing.") || ref.includes("yahoo."))) return "referral_search";
  if (ref) return "referral";
  if (sourceName) return sourceName;
  return "direct";
}

export function parseUtmFromUrl(rawUrl: string) {
  const text = String(rawUrl || "").trim();
  if (!text) {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
    };
  }
  try {
    const url = new URL(text);
    const get = (key: string) => {
      const value = url.searchParams.get(key);
      return value ? value.trim() : null;
    };
    return {
      utm_source: get("utm_source"),
      utm_medium: get("utm_medium"),
      utm_campaign: get("utm_campaign"),
      utm_content: get("utm_content"),
    };
  } catch {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
    };
  }
}
