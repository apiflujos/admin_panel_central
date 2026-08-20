import { assertShopifyApiVersionMatches, resolveShopifyApiVersion } from "../utils/shopify";
import { ShopifyRequestError } from "./shopify-errors";

export { ShopifyRequestError } from "./shopify-errors";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

type GraphQlError = {
  message: string;
  path?: string[];
  extensions?: Record<string, unknown>;
};

type GraphQlResponse<T> = {
  data?: T;
  errors?: GraphQlError[];
};

export type ShopifyConfig = {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
};

type GraphQlRequest = {
  query: string;
  variables?: Record<string, unknown>;
};

export class ShopifyClient {
  private endpoint: string;
  private restBase: string;
  private apiVersion: string;

  constructor(private config: ShopifyConfig) {
    const version = resolveShopifyApiVersion(config.apiVersion);
    this.apiVersion = version;
    this.endpoint = `https://${config.shopDomain}/admin/api/${version}/graphql.json`;
    this.restBase = `https://${config.shopDomain}/admin/api/${version}`;
  }

  private shopifyTimeoutMs() {
    return parsePositiveInt(process.env.SHOPIFY_TIMEOUT_MS, 30000);
  }

  private async requestRest<T>(path: string, options: { method: string; body?: unknown }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.shopifyTimeoutMs());
    try {
      const response = await fetch(`${this.restBase}${path}`, {
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.config.accessToken,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Shopify REST error: ${response.status} ${text}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private async request<T>(body: GraphQlRequest) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.shopifyTimeoutMs());
    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.config.accessToken,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // Si Shopify sirvió una versión distinta a la pedida, la app está anclada a
    // una versión retirada y el esquema real no es el que espera este código.
    assertShopifyApiVersionMatches(this.apiVersion, response.headers.get("X-Shopify-API-Version"), {
      shopDomain: this.config.shopDomain,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ShopifyRequestError(`Shopify GraphQL error: ${response.status} ${text}`, {
        status: response.status,
      });
    }

    const json = (await response.json()) as GraphQlResponse<T>;
    if (json.errors?.length) {
      throw new ShopifyRequestError(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`, {
        status: response.status,
        graphQlErrors: json.errors,
      });
    }
    if (!json.data) {
      throw new ShopifyRequestError("Shopify GraphQL missing data", { status: response.status });
    }
    return json.data;
  }

  /**
   * Ejecuta una mutación y convierte sus `userErrors` en una excepción.
   *
   * Antes se ignoraban por completo: una mutación podía "tener éxito" a nivel
   * HTTP y GraphQL mientras Shopify rechazaba el cambio en `userErrors`, y el
   * sync lo daba por bueno (fallo silencioso).
   */
  private async mutate<T extends Record<string, { userErrors?: Array<{ field?: string[] | null; message: string }> } | undefined>>(
    body: GraphQlRequest,
    mutationName: keyof T & string
  ): Promise<T> {
    const data = await this.request<T>(body);
    const userErrors = data?.[mutationName]?.userErrors;
    if (Array.isArray(userErrors) && userErrors.length) {
      throw new ShopifyRequestError(
        `Shopify ${mutationName} userErrors: ${JSON.stringify(userErrors)}`,
        { userErrors }
      );
    }
    return data;
  }

  /**
   * Resuelve el producto dueño de una variante.
   *
   * `productVariantsBulkUpdate` exige `productId`, cosa que la mutación
   * eliminada `productVariantUpdate` no pedía. Los llamadores que ya conocen el
   * producto deben pasarlo; este atajo cubre a los que sólo tienen el variantId.
   */
  async getProductIdByVariantId(variantId: string) {
    const data = await this.request<{ productVariant: { id: string; product?: { id: string } | null } | null }>(
      <GraphQlRequest>{
        query: PRODUCT_ID_BY_VARIANT_QUERY,
        variables: { id: variantId },
      }
    );
    const productId = data.productVariant?.product?.id;
    if (!productId) {
      throw new ShopifyRequestError(`No se pudo resolver el producto de la variante ${variantId}`);
    }
    return productId;
  }

  async createOrderRest(order: Record<string, unknown>) {
    return this.requestRest<{ order: { id: number; name?: string; order_number?: number } }>(`/orders.json`, {
      method: "POST",
      body: { order },
    });
  }

  async createDraftOrderRest(draftOrder: Record<string, unknown>) {
    return this.requestRest<{ draft_order: { id: number; name?: string; invoice_url?: string } }>(
      `/draft_orders.json`,
      { method: "POST", body: { draft_order: draftOrder } }
    );
  }

  async getOrderById(id: string) {
    return this.request<{ order: ShopifyOrder }>(<GraphQlRequest>{
      query: ORDER_BY_ID_QUERY,
      variables: { id },
    });
  }

  async getCustomerById(id: string) {
    return this.request<{ customer: ShopifyCustomer }>(<GraphQlRequest>{
      query: CUSTOMER_BY_ID_QUERY,
      variables: { id },
    });
  }

  async listOrdersUpdatedSince(updatedAtMin: string) {
    return this.listAllOrdersByQuery(`updated_at:>='${updatedAtMin}'`);
  }

  async listOrdersByQuery(query: string) {
    return this.listAllOrdersByQuery(query);
  }

  async listAllOrdersByQuery(query: string, limit?: number) {
    let cursor: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    const MAX_PAGES = 200;
    const orders: ShopifyOrder[] = [];
    while (hasNextPage && pageCount < MAX_PAGES) {
      pageCount += 1;
      const data: { orders: ShopifyOrderConnection } = await this.request<{ orders: ShopifyOrderConnection }>(<
        GraphQlRequest
      >{
        query: ORDERS_PAGED_QUERY,
        variables: { query, cursor },
      });
      const page = data.orders?.edges?.map((edge: { node: ShopifyOrder }) => edge.node) || [];
      orders.push(...page);
      if (limit && orders.length >= limit) {
        return orders.slice(0, limit);
      }
      hasNextPage = Boolean(data.orders?.pageInfo?.hasNextPage);
      cursor = data.orders?.pageInfo?.endCursor || null;
      if (!cursor) {
        hasNextPage = false;
      }
    }
    return orders;
  }

  async listAllProductsByQuery(query: string, limit?: number) {
    let cursor: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    const MAX_PAGES = 200;
    const products: ShopifyProduct[] = [];
    while (hasNextPage && pageCount < MAX_PAGES) {
      pageCount += 1;
      const data: { products: ShopifyProductConnection } = await this.request<{ products: ShopifyProductConnection }>(<
        GraphQlRequest
      >{
        query: PRODUCTS_PAGED_QUERY,
        variables: { query, cursor },
      });
      const page = data.products?.edges?.map((edge: { node: ShopifyProduct }) => edge.node) || [];
      products.push(...page);
      if (limit && products.length >= limit) {
        return products.slice(0, limit);
      }
      hasNextPage = Boolean(data.products?.pageInfo?.hasNextPage);
      cursor = data.products?.pageInfo?.endCursor || null;
      if (!cursor) {
        hasNextPage = false;
      }
    }
    return products;
  }

  async listAllCustomers(limit?: number) {
    let cursor: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    const MAX_PAGES = 200;
    const customers: ShopifyCustomer[] = [];
    while (hasNextPage && pageCount < MAX_PAGES) {
      pageCount += 1;
      const data: { customers: ShopifyCustomerConnection } = await this.request<{
        customers: ShopifyCustomerConnection;
      }>(<GraphQlRequest>{
        query: CUSTOMERS_PAGED_QUERY,
        variables: { cursor },
      });
      const page = data.customers?.edges?.map((edge: { node: ShopifyCustomer }) => edge.node) || [];
      customers.push(...page);
      if (limit && customers.length >= limit) {
        return customers.slice(0, limit);
      }
      hasNextPage = Boolean(data.customers?.pageInfo?.hasNextPage);
      cursor = data.customers?.pageInfo?.endCursor || null;
      if (!cursor) {
        hasNextPage = false;
      }
    }
    return customers;
  }

  async listAllCustomersByQuery(query: string, limit?: number) {
    let cursor: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    const MAX_PAGES = 200;
    const customers: ShopifyCustomer[] = [];
    const cleanedQuery = String(query || "").trim();
    while (hasNextPage && pageCount < MAX_PAGES) {
      pageCount += 1;
      const data: { customers: ShopifyCustomerConnection } = await this.request<{
        customers: ShopifyCustomerConnection;
      }>(<GraphQlRequest>{
        query: CUSTOMERS_PAGED_QUERY,
        variables: { query: cleanedQuery || null, cursor },
      });
      const page = data.customers?.edges?.map((edge: { node: ShopifyCustomer }) => edge.node) || [];
      customers.push(...page);
      if (limit && customers.length >= limit) {
        return customers.slice(0, limit);
      }
      hasNextPage = Boolean(data.customers?.pageInfo?.hasNextPage);
      cursor = data.customers?.pageInfo?.endCursor || null;
      if (!cursor) {
        hasNextPage = false;
      }
    }
    return customers;
  }

  async searchCustomers(query: string) {
    const data = await this.request<{ customers: ShopifyCustomerConnection }>(<GraphQlRequest>{
      query: CUSTOMERS_PAGED_QUERY,
      variables: { query },
    });
    return data.customers?.edges?.map((edge) => edge.node) || [];
  }

  async getProductById(id: string) {
    return this.request<{ product: ShopifyProduct }>(<GraphQlRequest>{
      query: PRODUCT_BY_ID_QUERY,
      variables: { id },
    });
  }

  async listProductsUpdatedSince(updatedAtMin: string) {
    return this.request<{ products: ShopifyProductConnection }>(<GraphQlRequest>{
      query: PRODUCTS_UPDATED_SINCE_QUERY,
      variables: { query: `updated_at:>='${updatedAtMin}'` },
    });
  }

  /**
   * @param productId producto dueño de la variante. Es obligatorio para
   * `productVariantsBulkUpdate`; si no se pasa se resuelve con una query extra,
   * así que conviene proporcionarlo cuando ya se conoce.
   */
  async updateVariantPrice(
    variantId: string,
    price: string,
    compareAtPrice?: string | null,
    productId?: string | null
  ) {
    const resolvedProductId = productId || (await this.getProductIdByVariantId(variantId));
    return this.mutate<{ productVariantsBulkUpdate: ShopifyMutationResult }>(
      <GraphQlRequest>{
        query: VARIANT_PRICE_MUTATION,
        variables: {
          productId: resolvedProductId,
          variants: [
            {
              id: variantId,
              price,
              compareAtPrice: compareAtPrice ?? null,
            },
          ],
        },
      },
      "productVariantsBulkUpdate"
    );
  }

  async addOrderTag(orderId: string, tag: string) {
    return this.request<{ tagsAdd: ShopifyMutationResult }>(<GraphQlRequest>{
      query: TAGS_ADD_MUTATION,
      variables: { id: orderId, tags: [tag] },
    });
  }

  async createProductFromItem(input: {
    title: string;
    sku?: string;
    price: string;
    publish: boolean;
    trackInventory?: boolean;
    allowOversell?: boolean;
  }) {
    const trackInventory = typeof input.trackInventory === "boolean" ? input.trackInventory : undefined;

    // Paso 1: crear el producto. `ProductCreateInput` ya no admite `variants`;
    // Shopify crea automáticamente la variante inicial por defecto.
    const created = await this.mutate<{ productCreate: ShopifyProductCreateResult }>(
      <GraphQlRequest>{
        query: PRODUCT_CREATE_MUTATION,
        variables: {
          product: {
            title: input.title,
            status: input.publish ? "ACTIVE" : "DRAFT",
          },
        },
      },
      "productCreate"
    );

    const productId = created.productCreate?.product?.id;
    const defaultVariantId = created.productCreate?.product?.variants?.edges?.[0]?.node?.id;
    if (!productId || !defaultVariantId) {
      throw new ShopifyRequestError(
        `productCreate no devolvió producto/variante para "${input.title}"`
      );
    }

    // Paso 2: aplicar los datos de la variante inicial. El SKU vive ahora en
    // `inventoryItem.sku`, no directamente en la variante, y `inventoryManagement`
    // desapareció en favor de `inventoryItem.tracked`.
    const variantInput: {
      id: string;
      price: string;
      inventoryPolicy?: "CONTINUE" | "DENY";
      inventoryItem?: { sku?: string; tracked?: boolean };
    } = {
      id: defaultVariantId,
      price: input.price,
    };
    const inventoryItem: { sku?: string; tracked?: boolean } = {};
    if (input.sku) inventoryItem.sku = input.sku;
    if (typeof trackInventory === "boolean") inventoryItem.tracked = trackInventory;
    if (Object.keys(inventoryItem).length) variantInput.inventoryItem = inventoryItem;
    if (input.allowOversell === true) variantInput.inventoryPolicy = "CONTINUE";

    const updated = await this.mutate<{ productVariantsBulkUpdate: ShopifyVariantsBulkUpdateResult }>(
      <GraphQlRequest>{
        query: PRODUCT_CREATE_VARIANT_MUTATION,
        variables: { productId, variants: [variantInput] },
      },
      "productVariantsBulkUpdate"
    );

    const appliedVariant = updated.productVariantsBulkUpdate?.productVariants?.[0];

    // Se conserva la forma `{ productCreate: { product: { variants: { edges } } } }`
    // que esperan los llamadores, ya con los datos de la variante aplicados.
    return {
      productCreate: {
        ...created.productCreate,
        product: {
          ...created.productCreate.product!,
          variants: {
            edges: [
              {
                node: {
                  id: defaultVariantId,
                  sku: appliedVariant?.sku ?? input.sku ?? null,
                  barcode: appliedVariant?.barcode ?? null,
                  inventoryItem: appliedVariant?.inventoryItem ?? undefined,
                },
              },
            ],
          },
        },
      },
    };
  }

  async updateVariantInventoryPolicy(
    variantId: string,
    policy: "CONTINUE" | "DENY",
    productId?: string | null
  ) {
    const resolvedProductId = productId || (await this.getProductIdByVariantId(variantId));
    return this.mutate<{ productVariantsBulkUpdate: ShopifyMutationResult }>(
      <GraphQlRequest>{
        query: VARIANT_INVENTORY_POLICY_MUTATION,
        variables: {
          productId: resolvedProductId,
          variants: [{ id: variantId, inventoryPolicy: policy }],
        },
      },
      "productVariantsBulkUpdate"
    );
  }

  async updateInventoryItemTracking(inventoryItemId: string, tracked: boolean) {
    return this.request<{ inventoryItemUpdate: ShopifyMutationResult }>(<GraphQlRequest>{
      query: INVENTORY_ITEM_TRACKING_MUTATION,
      variables: {
        id: inventoryItemId,
        input: {
          tracked,
        },
      },
    });
  }

  async createProduct(input: {
    title: string;
    status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
    descriptionHtml?: string;
    vendor?: string;
    productType?: string;
    tags?: string[];
    options?: string[];
    variants?: Array<{
      price?: string;
      sku?: string;
      barcode?: string;
      options?: string[];
      inventoryPolicy?: "CONTINUE" | "DENY" | null;
      inventoryItem?: { tracked?: boolean };
      inventoryManagement?: "SHOPIFY" | "NOT_MANAGED";
    }>;
    trackInventory?: boolean;
  }) {
    const trackInventory = typeof input.trackInventory === "boolean" ? input.trackInventory : undefined;

    // `ProductInput.variants` y `options` desaparecieron con el modelo de
    // producto nuevo. `productSet` es el reemplazo para crear un producto con
    // todas sus variantes en una sola llamada.
    //
    // CUIDADO: en campos de lista `productSet` BORRA las entradas que no vengan
    // en el input. Aquí sólo se usa para CREAR productos nuevos, donde no hay
    // nada que borrar. No reutilizar para actualizaciones parciales.
    // https://shopify.dev/docs/api/admin-graphql/latest/mutations/productSet
    const optionNames = Array.isArray(input.options) && input.options.length ? input.options : ["Title"];
    const sourceVariants = Array.isArray(input.variants) && input.variants.length ? input.variants : [{}];

    const variants = sourceVariants.map((variant) => {
      const variantOptions = Array.isArray(variant.options) ? variant.options : [];
      const optionValues = optionNames.map((optionName, index) => ({
        optionName,
        // Un producto sin opciones reales usa la opción implícita
        // "Title" / "Default Title" que Shopify asigna a la variante única.
        name: String(variantOptions[index] ?? "Default Title"),
      }));

      const inventoryItem: { sku?: string; tracked?: boolean } = {};
      if (variant.sku) inventoryItem.sku = variant.sku;
      if (typeof trackInventory === "boolean") inventoryItem.tracked = trackInventory;
      else if (typeof variant.inventoryItem?.tracked === "boolean") {
        inventoryItem.tracked = variant.inventoryItem.tracked;
      }

      return {
        optionValues,
        price: variant.price,
        sku: variant.sku,
        barcode: variant.barcode,
        ...(variant.inventoryPolicy ? { inventoryPolicy: variant.inventoryPolicy } : {}),
        ...(Object.keys(inventoryItem).length ? { inventoryItem } : {}),
      };
    });

    // Cada opción declara los valores distintos que usan sus variantes.
    const productOptions = optionNames.map((name, index) => ({
      name,
      values: Array.from(new Set(variants.map((variant) => variant.optionValues[index].name))).map((value) => ({
        name: value,
      })),
    }));

    const response = await this.mutate<{ productSet: ShopifyProductSetResult }>(
      <GraphQlRequest>{
        query: PRODUCT_SET_MUTATION,
        variables: {
          input: {
            title: input.title,
            status: input.status,
            descriptionHtml: input.descriptionHtml,
            vendor: input.vendor,
            productType: input.productType,
            tags: input.tags,
            productOptions,
            variants,
          },
        },
      },
      "productSet"
    );

    // Se conserva la forma de retorno de `productCreate` que esperan los
    // llamadores (`product.variants.edges[].node`).
    const product = response.productSet?.product;
    return {
      product: product
        ? {
            id: product.id,
            variants: {
              edges: (product.variants?.nodes || []).map((node) => ({ node })),
            },
          }
        : undefined,
      userErrors: [],
    } satisfies ShopifyProductCreateResult;
  }

  private resolveNumericId(id: string) {
    const text = String(id || "");
    const match = text.match(/(\d+)(?:\D*)$/);
    return match ? match[1] : null;
  }

  async addProductImagesByUrl(productId: string, urls: string[]) {
    const numericId = this.resolveNumericId(productId);
    if (!numericId) {
      return { added: 0, skipped: urls.length };
    }
    const list = Array.isArray(urls) ? urls : [];
    const unique = Array.from(new Set(list.map((url) => String(url || "").trim()).filter((url) => url.length > 0)));
    if (!unique.length) {
      return { added: 0, skipped: 0 };
    }
    let added = 0;
    for (const src of unique.slice(0, 15)) {
      const response = await fetch(`${this.restBase}/products/${numericId}/images.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.config.accessToken,
        },
        body: JSON.stringify({ image: { src } }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Shopify images error: ${response.status} ${text}`);
      }
      added += 1;
    }
    return { added, skipped: Math.max(0, unique.length - Math.min(unique.length, 15)) };
  }

  async updateProductStatus(productId: string, publish: boolean) {
    return this.mutate<{ productUpdate: ShopifyMutationResult }>(
      <GraphQlRequest>{
        query: PRODUCT_STATUS_MUTATION,
        variables: {
          product: {
            id: productId,
            status: publish ? "ACTIVE" : "DRAFT",
          },
        },
      },
      "productUpdate"
    );
  }

  async createCustomer(input: Record<string, unknown>) {
    const data = await this.request<{ customerCreate: ShopifyCustomerMutationResult }>(<GraphQlRequest>{
      query: CUSTOMER_CREATE_MUTATION,
      variables: { input },
    });
    const errors = data.customerCreate?.userErrors || [];
    if (errors.length) {
      throw new Error(`Shopify customerCreate: ${JSON.stringify(errors)}`);
    }
    return data.customerCreate?.customer;
  }

  async updateCustomer(id: string, input: Record<string, unknown>) {
    const data = await this.request<{ customerUpdate: ShopifyCustomerMutationResult }>(<GraphQlRequest>{
      query: CUSTOMER_UPDATE_MUTATION,
      variables: { input: { id, ...input } },
    });
    const errors = data.customerUpdate?.userErrors || [];
    if (errors.length) {
      throw new Error(`Shopify customerUpdate: ${JSON.stringify(errors)}`);
    }
    return data.customerUpdate?.customer;
  }

  async createWebhookSubscription(topic: string, callbackUrl: string) {
    return this.request<{ webhookSubscriptionCreate: WebhookSubscriptionCreateResult }>(<GraphQlRequest>{
      query: WEBHOOK_SUBSCRIPTION_CREATE_MUTATION,
      variables: {
        topic,
        webhookSubscription: {
          callbackUrl,
          format: "JSON",
        },
      },
    });
  }

  async listWebhookSubscriptions(first = 50) {
    return this.request<{
      webhookSubscriptions: { edges: Array<{ node: WebhookSubscriptionNode }> };
    }>(<GraphQlRequest>{
      query: WEBHOOK_SUBSCRIPTION_LIST_QUERY,
      variables: { first },
    });
  }

  async deleteWebhookSubscription(id: string) {
    return this.request<{ webhookSubscriptionDelete: WebhookSubscriptionDeleteResult }>(<GraphQlRequest>{
      query: WEBHOOK_SUBSCRIPTION_DELETE_MUTATION,
      variables: { id },
    });
  }

  async findVariantByIdentifier(identifier: string) {
    const escaped = identifier.replace(/"/g, '\\"');
    const query = `sku:"${escaped}" OR barcode:"${escaped}"`;
    return this.request<{
      productVariants: {
        edges: Array<{
          node: {
            id: string;
            sku?: string | null;
            barcode?: string | null;
            inventoryPolicy?: string | null;
            inventoryItem?: { id: string; tracked?: boolean } | null;
            product?: { id: string; status?: string | null } | null;
          };
        }>;
      };
    }>(<GraphQlRequest>{
      query: PRODUCT_VARIANT_BY_IDENTIFIER_QUERY,
      variables: { query },
    });
  }

  async findVariantBySku(sku: string) {
    const escaped = sku.replace(/"/g, '\\"');
    const query = `sku:"${escaped}"`;
    return this.request<{
      productVariants: {
        edges: Array<{
          node: {
            id: string;
            sku?: string | null;
            barcode?: string | null;
            inventoryPolicy?: string | null;
            inventoryItem?: { id: string; tracked?: boolean } | null;
            product?: { id: string; status?: string | null } | null;
          };
        }>;
      };
    }>(<GraphQlRequest>{
      query: PRODUCT_VARIANT_BY_IDENTIFIER_QUERY,
      variables: { query },
    });
  }

  async adjustInventory(inventoryItemId: string, locationId: string, availableDelta: number) {
    return this.request<{ inventoryAdjustQuantity: ShopifyMutationResult }>(<GraphQlRequest>{
      query: INVENTORY_ADJUST_MUTATION,
      variables: {
        input: {
          inventoryItemId,
          locationId,
          availableDelta,
        },
      },
    });
  }

  async setInventoryOnHand(inventoryItemId: string, locationId: string, quantity: number) {
    return this.request<{ inventorySetOnHandQuantities: ShopifyMutationResult }>(<GraphQlRequest>{
      query: INVENTORY_SET_ON_HAND_MUTATION,
      variables: {
        input: {
          reason: "correction",
          setQuantities: [
            {
              inventoryItemId,
              locationId,
              quantity,
            },
          ],
        },
      },
    });
  }

  async getPrimaryLocationId() {
    const response = await this.request<{
      locations: { edges: Array<{ node?: { id?: string } }> };
    }>(<GraphQlRequest>{
      query: LOCATIONS_FIRST_QUERY,
    });
    const edges = response?.locations?.edges || [];
    return String(edges[0]?.node?.id || "").trim();
  }
}

export type ShopifyOrder = {
  id: string;
  name: string;
  email?: string | null;
  displayFinancialStatus?: string | null;
  displayFulfillmentStatus?: string | null;
  paymentGatewayNames?: string[] | null;
  taxesIncluded?: boolean | null;
  tags?: string[] | null;
  updatedAt?: string | null;
  processedAt?: string | null;
  shippingAddress?: {
    address1?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    countryCodeV2?: string | null;
    company?: string | null;
  } | null;
  shippingLine?: {
    title?: string | null;
    originalPriceSet?: { shopMoney: { amount: string; currencyCode: string } } | null;
  } | null;
  totalPriceSet?: {
    shopMoney: { amount: string; currencyCode: string };
  };
  customer?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        quantity: number;
        originalUnitPriceSet?: {
          shopMoney: { amount: string; currencyCode: string };
        };
        discountedUnitPriceSet?: {
          shopMoney: { amount: string; currencyCode: string };
        };
        variant?: {
          id: string;
          sku?: string | null;
          inventoryItem?: { id: string } | null;
        } | null;
      };
    }>;
  };
};

export type ShopifyCustomer = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  note?: string | null;
  defaultAddress?: {
    address1?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    countryCodeV2?: string | null;
  } | null;
};

export type ShopifyProduct = {
  id: string;
  title: string;
  status: string;
  updatedAt?: string | null;
  descriptionHtml?: string | null;
  productType?: string | null;
  vendor?: string | null;
  tags?: string[] | null;
  options?: Array<{
    name: string;
    values: string[];
  }> | null;
  images?: {
    edges: Array<{
      node: {
        url?: string | null;
        altText?: string | null;
      };
    }>;
  } | null;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku?: string | null;
        barcode?: string | null;
        price: string;
        inventoryQuantity?: number | null;
        inventoryItem?: { id: string } | null;
        selectedOptions?: Array<{ name: string; value: string }> | null;
      };
    }>;
  };
};

type ShopifyOrderConnection = {
  edges: Array<{ node: ShopifyOrder }>;
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

type ShopifyCustomerConnection = {
  edges: Array<{ node: ShopifyCustomer }>;
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

type ShopifyProductConnection = {
  edges: Array<{ node: ShopifyProduct }>;
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

type ShopifyMutationResult = {
  userErrors: Array<{ field?: string[]; message: string }>;
};

type ShopifyProductSetResult = {
  product?: {
    id: string;
    variants?: {
      nodes: Array<{
        id: string;
        sku?: string | null;
        barcode?: string | null;
        inventoryItem?: { id: string } | null;
      }>;
    };
  };
  userErrors: Array<{ field?: string[]; message: string }>;
};

type ShopifyVariantsBulkUpdateResult = {
  productVariants?: Array<{
    id: string;
    sku?: string | null;
    barcode?: string | null;
    inventoryItem?: { id: string } | null;
  }>;
  userErrors: Array<{ field?: string[]; message: string }>;
};

type ShopifyProductCreateResult = {
  product?: {
    id: string;
    variants?: {
      edges: Array<{
        node: {
          id: string;
          sku?: string | null;
          barcode?: string | null;
          inventoryItem?: { id: string } | null;
        };
      }>;
    };
  };
  userErrors: Array<{ field?: string[]; message: string }>;
};

type ShopifyCustomerMutationResult = {
  customer?: ShopifyCustomer | null;
  userErrors: Array<{ field?: string[]; message: string }>;
};

type WebhookSubscriptionCreateResult = {
  webhookSubscription?: {
    id: string;
    topic?: string | null;
    endpoint?: { callbackUrl?: string | null } | null;
  } | null;
  userErrors: Array<{ field?: string[]; message: string }>;
};

type WebhookSubscriptionDeleteResult = {
  deletedWebhookSubscriptionId?: string | null;
  userErrors: Array<{ field?: string[]; message: string }>;
};

type WebhookSubscriptionNode = {
  id: string;
  topic: string;
  endpoint?: { __typename?: string; callbackUrl?: string | null } | null;
};

const ORDER_BY_ID_QUERY = `
  query OrderById($id: ID!) {
    order(id: $id) {
      id
      name
      email
      displayFinancialStatus
      displayFulfillmentStatus
      paymentGatewayNames
      taxesIncluded
      updatedAt
      processedAt
      shippingAddress { address1 city province zip countryCodeV2 company }
      shippingLine { title originalPriceSet { shopMoney { amount currencyCode } } }
      totalPriceSet {
        shopMoney { amount currencyCode }
      }
      customer {
        id
        email
        firstName
        lastName
        phone
      }
      lineItems(first: 250) {
        edges {
          node {
            id
            title
            quantity
            originalUnitPriceSet {
              shopMoney { amount currencyCode }
            }
            discountedUnitPriceSet {
              shopMoney { amount currencyCode }
            }
            variant {
              id
              sku
              inventoryItem { id }
            }
          }
        }
      }
    }
  }
`;

const CUSTOMER_BY_ID_QUERY = `
  query CustomerById($id: ID!) {
    customer(id: $id) {
      id
      email
      firstName
      lastName
      phone
      note
      defaultAddress { address1 city province zip countryCodeV2 }
    }
  }
`;

const CUSTOMERS_PAGED_QUERY = `
  query CustomersPaged($query: String, $cursor: String) {
    customers(first: 50, after: $cursor, query: $query) {
      edges {
        node {
          id
          email
          firstName
          lastName
          phone
          note
          defaultAddress { address1 city province zip countryCodeV2 }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ORDERS_UPDATED_SINCE_QUERY = `
  query OrdersUpdatedSince($query: String!) {
    orders(first: 50, query: $query) {
      edges {
        node {
          id
          name
          email
          displayFinancialStatus
          displayFulfillmentStatus
          paymentGatewayNames
          taxesIncluded
          updatedAt
          processedAt
          shippingAddress { address1 city province zip countryCodeV2 company }
          shippingLine { title originalPriceSet { shopMoney { amount currencyCode } } }
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          customer { id email firstName lastName phone }
          lineItems(first: 250) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPriceSet {
                  shopMoney { amount currencyCode }
                }
                discountedUnitPriceSet {
                  shopMoney { amount currencyCode }
                }
                variant { id sku inventoryItem { id } }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const ORDERS_PAGED_QUERY = `
  query OrdersPaged($query: String!, $cursor: String) {
    orders(first: 50, after: $cursor, query: $query) {
      edges {
        node {
          id
          name
          email
          displayFinancialStatus
          displayFulfillmentStatus
          paymentGatewayNames
          taxesIncluded
          updatedAt
          processedAt
          shippingAddress { address1 city province zip countryCodeV2 company }
          shippingLine { title originalPriceSet { shopMoney { amount currencyCode } } }
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          customer { id email firstName lastName phone }
          lineItems(first: 250) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPriceSet {
                  shopMoney { amount currencyCode }
                }
                discountedUnitPriceSet {
                  shopMoney { amount currencyCode }
                }
                variant { id sku inventoryItem { id } }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `
  query ProductById($id: ID!) {
    product(id: $id) {
      id
      title
      status
      descriptionHtml
      productType
      vendor
      tags
      options {
        name
        values
      }
      images(first: 20) {
        edges {
          node { url altText }
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            sku
            barcode
            price
            inventoryQuantity
            inventoryItem { id }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

const PRODUCTS_UPDATED_SINCE_QUERY = `
  query ProductsUpdatedSince($query: String!) {
    products(first: 50, query: $query) {
      edges {
        node {
          id
          title
          status
          updatedAt
          descriptionHtml
          productType
          vendor
          tags
          options {
            name
            values
          }
          images(first: 20) {
            edges {
              node { url altText }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                barcode
                price
                inventoryQuantity
                inventoryItem { id }
                selectedOptions { name value }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PRODUCTS_PAGED_QUERY = `
  query ProductsPaged($query: String!, $cursor: String) {
    products(first: 50, after: $cursor, query: $query) {
      edges {
        node {
          id
          title
          status
          updatedAt
          descriptionHtml
          productType
          vendor
          tags
          options {
            name
            values
          }
          images(first: 20) {
            edges {
              node { url altText }
            }
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                barcode
                price
                inventoryQuantity
                inventoryItem { id }
                selectedOptions { name value }
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const CUSTOMER_CREATE_MUTATION = `
  mutation CustomerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id email firstName lastName phone }
      userErrors { field message }
    }
  }
`;

const CUSTOMER_UPDATE_MUTATION = `
  mutation CustomerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer { id email firstName lastName phone }
      userErrors { field message }
    }
  }
`;

// `productVariantUpdate` fue ELIMINADA de la Admin API. El reemplazo oficial es
// `productVariantsBulkUpdate`, que exige `productId` además del id de variante.
// https://shopify.dev/docs/api/admin-graphql/latest/mutations/productVariantsBulkUpdate
const VARIANT_PRICE_MUTATION = `
  mutation UpdateVariantPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price compareAtPrice }
      userErrors { field message }
    }
  }
`;

const VARIANT_INVENTORY_POLICY_MUTATION = `
  mutation UpdateVariantInventoryPolicy($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id inventoryPolicy }
      userErrors { field message }
    }
  }
`;

// Crea un producto completo con todas sus variantes en una sola llamada.
// Sustituye al antiguo `productCreate(input: ProductInput!)` con `variants`.
const PRODUCT_SET_MUTATION = `
  mutation SetProduct($input: ProductSetInput!) {
    productSet(input: $input) {
      product {
        id
        variants(first: 100) {
          nodes { id sku barcode inventoryItem { id } }
        }
      }
      userErrors { field message }
    }
  }
`;

// Aplica los datos de la variante inicial recién creada por `productCreate`.
// Devuelve los campos que el llamador necesita para guardar el mapeo.
const PRODUCT_CREATE_VARIANT_MUTATION = `
  mutation SetInitialVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id sku barcode inventoryItem { id } }
      userErrors { field message }
    }
  }
`;

const PRODUCT_ID_BY_VARIANT_QUERY = `
  query ProductIdByVariant($id: ID!) {
    productVariant(id: $id) {
      id
      product { id }
    }
  }
`;

const INVENTORY_ITEM_TRACKING_MUTATION = `
  mutation UpdateInventoryItemTracking($id: ID!, $input: InventoryItemInput!) {
    inventoryItemUpdate(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

const TAGS_ADD_MUTATION = `
  mutation tagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors { field message }
    }
  }
`;

const WEBHOOK_SUBSCRIPTION_CREATE_MUTATION = `
  mutation WebhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      userErrors { field message }
      webhookSubscription {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
    }
  }
`;

const WEBHOOK_SUBSCRIPTION_LIST_QUERY = `
  query WebhookSubscriptions($first: Int!) {
    webhookSubscriptions(first: $first) {
      edges {
        node {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
      }
    }
  }
`;

const WEBHOOK_SUBSCRIPTION_DELETE_MUTATION = `
  mutation WebhookSubscriptionDelete($id: ID!) {
    webhookSubscriptionDelete(id: $id) {
      deletedWebhookSubscriptionId
      userErrors { field message }
    }
  }
`;

const INVENTORY_ADJUST_MUTATION = `
  mutation AdjustInventory($input: InventoryAdjustQuantityInput!) {
    inventoryAdjustQuantity(input: $input) {
      userErrors { field message }
    }
  }
`;

const INVENTORY_SET_ON_HAND_MUTATION = `
  mutation SetOnHand($input: InventorySetOnHandQuantitiesInput!) {
    inventorySetOnHandQuantities(input: $input) {
      userErrors { field message }
    }
  }
`;

// `productUpdate(input: ProductInput!)` está deprecado; el argumento vigente es
// `product: ProductUpdateInput!`. Se migra ahora para no repetir la avería que
// causó `productVariantUpdate` cuando Shopify retiró la firma antigua.
const PRODUCT_STATUS_MUTATION = `
  mutation UpdateProductStatus($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id status }
      userErrors { field message }
    }
  }
`;

// `ProductInput.variants` fue ELIMINADO: en el modelo de producto actual
// `productCreate` sólo crea el producto y su variante inicial por defecto, y el
// argumento pasó a llamarse `product: ProductCreateInput!`. Los datos de la
// variante (precio, SKU, política de inventario) se aplican después con
// `productVariantsBulkUpdate`.
// https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreate
const PRODUCT_CREATE_MUTATION = `
  mutation CreateProduct($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product {
        id
        variants(first: 100) {
          edges {
            node { id sku barcode inventoryItem { id } }
          }
        }
      }
      userErrors { field message }
    }
  }
`;

const PRODUCT_VARIANT_BY_IDENTIFIER_QUERY = `
  query VariantByIdentifier($query: String!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          id
          sku
          barcode
          inventoryPolicy
          inventoryItem { id tracked }
          product { id status }
        }
      }
    }
  }
`;

const LOCATIONS_FIRST_QUERY = `
  query LocationsFirst {
    locations(first: 1) {
      edges {
        node { id }
      }
    }
  }
`;
