import { assertPublicHostname } from "../utils/safe-host";

export type WooCommerceConfig = {
  shopDomain: string;
  consumerKey: string;
  consumerSecret: string;
};

function friendlyWooError(status: number): string {
  if (status === 401) return "Credenciales WooCommerce rechazadas (401).";
  if (status === 403) return "Acceso denegado por WooCommerce (403).";
  if (status === 404) return "Endpoint WooCommerce no encontrado (404).";
  if (status === 429) return "WooCommerce está limitando peticiones (429).";
  if (status >= 500) return `WooCommerce no disponible (${status}).`;
  return `WooCommerce error (${status}).`;
}

export type WooProductImage = {
  id?: number;
  src?: string;
};

export type WooProductAttribute = {
  id?: number;
  name?: string;
  options?: string[];
  variation?: boolean;
  visible?: boolean;
};

export type WooProductTag = {
  id?: number;
  name?: string;
};

export type WooProductCategory = {
  id?: number;
  name?: string;
};

export type WooProduct = {
  id: number;
  name?: string;
  description?: string;
  short_description?: string;
  type?: string;
  status?: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean | null;
  stock_status?: string | null;
  images?: WooProductImage[];
  attributes?: WooProductAttribute[];
  tags?: WooProductTag[];
  categories?: WooProductCategory[];
};

export type WooVariation = {
  id: number;
  sku?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean | null;
  attributes?: Array<{ id?: number; name?: string; option?: string }>;
};

type WooRequestOptions = {
  method: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const buildQuery = (params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.append(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
};

export class WooCommerceClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(private config: WooCommerceConfig) {
    const domain = normalizeShopDomain(config.shopDomain);
    this.baseUrl = `https://${domain}/wp-json/wc/v3`;
    const token = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  private async request<T>(path: string, options: WooRequestOptions) {
    const domain = normalizeShopDomain(this.config.shopDomain);
    await assertPublicHostname(domain);
    const response = await fetch(`${this.baseUrl}${path}${buildQuery(options.params)}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      await response.text().catch(() => "");
      throw new Error(friendlyWooError(response.status));
    }
    return (await response.json()) as T;
  }

  async listProducts(params: { page: number; perPage: number; status?: string }) {
    return this.request<WooProduct[]>("/products", {
      method: "GET",
      params: {
        page: params.page,
        per_page: params.perPage,
        status: params.status,
      },
    });
  }

  async listAllProducts(params: { status?: string; limit?: number }) {
    const perPage = 100;
    let page = 1;
    const products: WooProduct[] = [];
    while (true) {
      const batch = await this.listProducts({ page, perPage, status: params.status });
      products.push(...batch);
      if (params.limit && products.length >= params.limit) {
        return products.slice(0, params.limit);
      }
      if (batch.length < perPage) break;
      page += 1;
    }
    return products;
  }

  async listProductVariations(productId: number, params?: { page?: number; perPage?: number }) {
    return this.request<WooVariation[]>(`/products/${productId}/variations`, {
      method: "GET",
      params: {
        page: params?.page || 1,
        per_page: params?.perPage || 100,
      },
    });
  }

  async listAllProductVariations(productId: number) {
    const perPage = 100;
    let page = 1;
    const variations: WooVariation[] = [];
    while (true) {
      const batch = await this.listProductVariations(productId, { page, perPage });
      variations.push(...batch);
      if (batch.length < perPage) break;
      page += 1;
    }
    return variations;
  }

  async findProductsBySku(sku: string) {
    return this.request<WooProduct[]>("/products", {
      method: "GET",
      params: { sku },
    });
  }

  async createProduct(payload: Record<string, unknown>) {
    return this.request<WooProduct>("/products", {
      method: "POST",
      body: payload,
    });
  }

  async updateProduct(productId: number, payload: Record<string, unknown>) {
    return this.request<WooProduct>(`/products/${productId}`, {
      method: "PUT",
      body: payload,
    });
  }

  async createVariation(productId: number, payload: Record<string, unknown>) {
    return this.request<WooVariation>(`/products/${productId}/variations`, {
      method: "POST",
      body: payload,
    });
  }

  async updateVariation(productId: number, variationId: number, payload: Record<string, unknown>) {
    return this.request<WooVariation>(`/products/${productId}/variations/${variationId}`, {
      method: "PUT",
      body: payload,
    });
  }
}
