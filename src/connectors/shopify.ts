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

  constructor(private config: ShopifyConfig) {
    const version = config.apiVersion || "2024-04";
    this.endpoint = `https://${config.shopDomain}/admin/api/${version}/graphql.json`;
  }

  private async request<T>(body: GraphQlRequest) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.config.accessToken,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
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

  async getOrderById(id: string) {
    return this.request<{ order: ShopifyOrder }>(<GraphQlRequest>{
      query: ORDER_BY_ID_QUERY,
      variables: { id },
    });
  }

  async listOrdersUpdatedSince(updatedAtMin: string) {
    return this.request<{ orders: ShopifyOrderConnection }>(<GraphQlRequest>{
      query: ORDERS_UPDATED_SINCE_QUERY,
      variables: { query: `updated_at:>='${updatedAtMin}'` },
    });
  }

  async listOrdersByQuery(query: string) {
    return this.request<{ orders: ShopifyOrderConnection }>(<GraphQlRequest>{
      query: ORDERS_UPDATED_SINCE_QUERY,
      variables: { query },
    });
  }

  async listAllOrdersByQuery(query: string, limit?: number) {
    let cursor: string | null = null;
    let hasNextPage = true;
    const orders: ShopifyOrder[] = [];
    while (hasNextPage) {
      const data: { orders: ShopifyOrderConnection } =
        await this.request<{ orders: ShopifyOrderConnection }>(
        <GraphQlRequest>{
          query: ORDERS_PAGED_QUERY,
          variables: { query, cursor },
        }
      );
      const page =
        data.orders?.edges?.map((edge: { node: ShopifyOrder }) => edge.node) || [];
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

  async updateVariantPrice(variantId: string, price: string) {
    return this.request<{ productVariantUpdate: ShopifyMutationResult }>(
      <GraphQlRequest>{
        query: VARIANT_PRICE_MUTATION,
        variables: {
          input: {
            id: variantId,
            price,
          },
        },
      }
    );
  }

  async createProductFromItem(input: {
    title: string;
    sku?: string;
    price: string;
    publish: boolean;
  }) {
    return this.request<{ productCreate: ShopifyProductCreateResult }>(
      <GraphQlRequest>{
        query: PRODUCT_CREATE_MUTATION,
        variables: {
          input: {
            title: input.title,
            status: input.publish ? "ACTIVE" : "DRAFT",
            variants: [
              {
                price: input.price,
                sku: input.sku,
              },
            ],
          },
        },
      }
    );
  }

  async updateProductStatus(productId: string, publish: boolean) {
    return this.request<{ productUpdate: ShopifyMutationResult }>(
      <GraphQlRequest>{
        query: PRODUCT_STATUS_MUTATION,
        variables: {
          input: {
            id: productId,
            status: publish ? "ACTIVE" : "DRAFT",
          },
        },
      }
    );
  }

  async findVariantByIdentifier(identifier: string) {
    const escaped = identifier.replace(/"/g, '\\"');
    const query = `sku:\"${escaped}\" OR barcode:\"${escaped}\"`;
    return this.request<{
      productVariants: {
        edges: Array<{
          node: {
            id: string;
            sku?: string | null;
            barcode?: string | null;
            inventoryItem?: { id: string } | null;
            product?: { id: string; status?: string | null } | null;
          };
        }>;
      };
    }>(<GraphQlRequest>{
      query: PRODUCT_VARIANT_BY_IDENTIFIER_QUERY,
      variables: { query },
    });
  }

  async adjustInventory(
    inventoryItemId: string,
    locationId: string,
    availableDelta: number
  ) {
    return this.request<{ inventoryAdjustQuantity: ShopifyMutationResult }>(
      <GraphQlRequest>{
        query: INVENTORY_ADJUST_MUTATION,
        variables: {
          input: {
            inventoryItemId,
            locationId,
            availableDelta,
          },
        },
      }
    );
  }

  async setInventoryOnHand(
    inventoryItemId: string,
    locationId: string,
    quantity: number
  ) {
    return this.request<{ inventorySetOnHandQuantities: ShopifyMutationResult }>(
      <GraphQlRequest>{
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
      }
    );
  }

}

export type ShopifyOrder = {
  id: string;
  name: string;
  email?: string | null;
  displayFinancialStatus?: string | null;
  updatedAt?: string | null;
  processedAt?: string | null;
  shippingAddress?: {
    address1?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    countryCodeV2?: string | null;
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

export type ShopifyProduct = {
  id: string;
  title: string;
  status: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku?: string | null;
        price: string;
        inventoryItem?: { id: string } | null;
      };
    }>;
  };
};

type ShopifyOrderConnection = {
  edges: Array<{ node: ShopifyOrder }>;
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

type ShopifyProductConnection = {
  edges: Array<{ node: ShopifyProduct }>;
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

type ShopifyMutationResult = {
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
          inventoryItem?: { id: string } | null;
        };
      }>;
    };
  };
  userErrors: Array<{ field?: string[]; message: string }>;
};


const ORDER_BY_ID_QUERY = `
  query OrderById($id: ID!) {
    order(id: $id) {
      id
      name
      email
      displayFinancialStatus
      updatedAt
      processedAt
      shippingAddress { address1 city province zip countryCodeV2 }
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

const ORDERS_UPDATED_SINCE_QUERY = `
  query OrdersUpdatedSince($query: String!) {
    orders(first: 50, query: $query) {
      edges {
        node {
      id
      name
      email
      displayFinancialStatus
      updatedAt
      processedAt
      shippingAddress { address1 city province zip countryCodeV2 }
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
          processedAt
          shippingAddress { address1 city province zip countryCodeV2 }
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
      variants(first: 100) {
        edges {
          node { id title sku price inventoryItem { id } }
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
          variants(first: 100) {
            edges {
              node { id title sku price inventoryItem { id } }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const VARIANT_PRICE_MUTATION = `
  mutation UpdateVariantPrice($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
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

const PRODUCT_STATUS_MUTATION = `
  mutation UpdateProductStatus($input: ProductInput!) {
    productUpdate(input: $input) {
      userErrors { field message }
    }
  }
`;

const PRODUCT_CREATE_MUTATION = `
  mutation CreateProduct($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        variants(first: 1) {
          edges {
            node { id sku inventoryItem { id } }
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
          inventoryItem { id }
            product { id status }
        }
      }
    }
  }
`;
