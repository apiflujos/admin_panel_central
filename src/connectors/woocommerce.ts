export type WooCommerceConfig = {
  shopDomain: string;
  consumerKey: string;
  consumerSecret: string;
};

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
    const response = await fetch(`${this.baseUrl}${path}${buildQuery(options.params)}`, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`WooCommerce error: ${response.status} ${text}`);
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
}
