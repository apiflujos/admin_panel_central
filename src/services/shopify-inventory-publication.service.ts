import fs from "fs";
import path from "path";
import { Pool } from "pg";

import { buildShopifyVariantIndex, planPreparedRowsForShopify } from "../../packages/domain/src";
import type {
  PreparedInventoryWorkbookRow,
  PreparedInventoryWorkbookSummary,
  PublicationMatchedRow,
  PublicationPlan,
  PublicationUnmatchedRow,
  ShopifyProductForPublication,
} from "../../packages/shared/src";
import { decryptString } from "../utils/crypto";

export type ShopifyPublicationCliOptions = {
  shopDomain?: string;
  apiVersion?: string;
  locationId?: string;
};

export type LoadedShopifyPublicationConfig = {
  shopDomain: string;
  accessToken: string;
  locationId: string;
  apiVersion: string;
  source: "env" | "database";
  cleanup: () => Promise<void>;
};

export type ShopifyPublicationReport = {
  mode: "apply" | "dry_run";
  sourceFile: string;
  shopDomain: string;
  configSource: "env" | "database";
  locationId: string;
  selectedWarehouse: string;
  consideredRows: number;
  matchedRows: number;
  unmatchedRows: number;
  updatesNeeded: number;
  priceUpdatesNeeded: number;
  unchangedRows: number;
  sampleMatched: PublicationMatchedRow[];
  sampleUnmatched: PublicationUnmatchedRow[];
  summary: PreparedInventoryWorkbookSummary;
  appliedBatches?: number;
  appliedRows?: number;
  batchResults?: Array<Record<string, unknown>>;
  appliedPriceBatches?: number;
  appliedPriceRows?: number;
  priceBatchResults?: Array<Record<string, unknown>>;
};

type ReportOutputPaths = {
  baseDir: string;
  preparedStem: string;
  reportPath: string;
  unmatchedJsonPath: string;
  unmatchedCsvPath: string;
};

function normalizeShopDomain(value: string): string {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function resolveShopifyApiVersion(version?: string): string {
  const value = String(version || "").trim();
  return value || "2024-10";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  return Array.from(new Map(items.map((item) => [keyFn(item), item])).values());
}

function buildOutputPaths(xlsxPath: string, outDir?: string): ReportOutputPaths {
  const parsed = path.parse(xlsxPath);
  const baseDir = outDir ? path.resolve(outDir) : path.join(parsed.dir, "Descargas", "preparados-shopify");
  fs.mkdirSync(baseDir, { recursive: true });
  const preparedStem = parsed.name.replace(/[^\w.-]+/g, "_");
  return {
    baseDir,
    preparedStem,
    reportPath: path.join(baseDir, `${preparedStem}.shopify-inventory-report.json`),
    unmatchedJsonPath: path.join(baseDir, `${preparedStem}.shopify-unmatched.json`),
    unmatchedCsvPath: path.join(baseDir, `${preparedStem}.shopify-unmatched.csv`),
  };
}

function writeUnmatchedOutputs(paths: ReportOutputPaths, unmatched: PublicationUnmatchedRow[]) {
  const headers = ["reference", "parentName", "variantLabel", "name", "selectedQuantity", "reason"];
  const csvLines = [
    headers.join(","),
    ...unmatched.map((row) => headers.map((header) => escapeCsv(row[header as keyof PublicationUnmatchedRow])).join(",")),
  ];
  fs.writeFileSync(paths.unmatchedJsonPath, JSON.stringify(unmatched, null, 2));
  fs.writeFileSync(paths.unmatchedCsvPath, csvLines.join("\n"));
  return {
    jsonPath: paths.unmatchedJsonPath,
    csvPath: paths.unmatchedCsvPath,
  };
}

export class ShopifyApiClient {
  readonly shopDomain: string;
  readonly accessToken: string;
  readonly apiVersion: string;
  readonly endpoint: string;

  constructor(config: { shopDomain: string; accessToken: string; apiVersion?: string }) {
    this.shopDomain = normalizeShopDomain(config.shopDomain);
    this.accessToken = String(config.accessToken || "").trim();
    this.apiVersion = resolveShopifyApiVersion(config.apiVersion);
    this.endpoint = `https://${this.shopDomain}/admin/api/${this.apiVersion}/graphql.json`;
  }

  private timeoutMs(): number {
    return parsePositiveInt(process.env.SHOPIFY_TIMEOUT_MS, 30000);
  }

  async request<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": this.accessToken,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Shopify GraphQL error ${response.status}: ${text}`);
      }
      const json = JSON.parse(text) as { errors?: unknown[]; data?: T };
      if (Array.isArray(json.errors) && json.errors.length) {
        throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
      }
      return json.data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async getPrimaryLocationId(): Promise<string> {
    const data = await this.request<{ locations?: { edges?: Array<{ node?: { id?: string } }> } }>(`
      query LocationsFirst {
        locations(first: 10) {
          edges { node { id name } }
        }
      }
    `);
    return String(data?.locations?.edges?.[0]?.node?.id || "").trim();
  }

  async listAllProducts(): Promise<ShopifyProductForPublication[]> {
    const products: ShopifyProductForPublication[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    const maxPages = 500;

    type ProductsPagedResult = {
      products?: {
        edges?: Array<{ node: ShopifyProductForPublication }>;
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      };
    };
    while (hasNextPage && pageCount < maxPages) {
      pageCount += 1;
      const data: ProductsPagedResult = await this.request<ProductsPagedResult>(
        `
        query ProductsPaged($cursor: String) {
          products(first: 50, after: $cursor, query: "") {
            edges {
              node {
                id
                title
                status
                variants(first: 100) {
                  edges {
                    node {
                      productId: product { id }
                      productTitle: product { title }
                      productStatus: product { status }
                      variantId: id
                      variantTitle: title
                      sku
                      barcode
                      price
                      compareAtPrice
                      inventoryQuantity
                      inventoryItem { id }
                      selectedOptions { value }
                    }
                  }
                }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
        `,
        { cursor }
      );

      const edges = data?.products?.edges || [];
      for (const edge of edges) {
        const node = edge.node;
        products.push({
          id: String(node.id || ""),
          title: String(node.title || ""),
          status: String(node.status || ""),
          variants: {
            edges: (node.variants?.edges || []).map((variantEdge) => ({
              node: {
                productId: String((variantEdge.node as unknown as { productId?: { id?: string } }).productId?.id || node.id || ""),
                productTitle: String((variantEdge.node as unknown as { productTitle?: { title?: string } }).productTitle?.title || node.title || ""),
                productStatus: String((variantEdge.node as unknown as { productStatus?: { status?: string } }).productStatus?.status || node.status || ""),
                variantId: String((variantEdge.node as unknown as { variantId?: string }).variantId || ""),
                variantTitle: String((variantEdge.node as unknown as { variantTitle?: string }).variantTitle || ""),
                sku: String(variantEdge.node.sku || "").trim(),
                barcode: String(variantEdge.node.barcode || "").trim(),
                price: variantEdge.node.price ? String(variantEdge.node.price) : null,
                compareAtPrice: variantEdge.node.compareAtPrice ? String(variantEdge.node.compareAtPrice) : null,
                inventoryQuantity: Number.isFinite(Number(variantEdge.node.inventoryQuantity))
                  ? Number(variantEdge.node.inventoryQuantity)
                  : null,
                inventoryItemId: String(
                  (variantEdge.node as unknown as { inventoryItem?: { id?: string } }).inventoryItem?.id || ""
                ).trim(),
                selectedOptions: Array.isArray(variantEdge.node.selectedOptions)
                  ? variantEdge.node.selectedOptions.map((item) =>
                      String((item as unknown as { value?: string })?.value || "")
                    )
                  : [],
              },
            })),
          },
        });
      }
      hasNextPage = Boolean(data?.products?.pageInfo?.hasNextPage);
      cursor = data?.products?.pageInfo?.endCursor || null;
      if (!cursor) hasNextPage = false;
    }

    return products;
  }

  async setInventoryOnHandBatch(
    locationId: string,
    updates: Array<{ inventoryItemId: string; quantity: number }>
  ): Promise<{ applied: number; userErrors: Array<Record<string, unknown>> }> {
    if (!updates.length) {
      return { applied: 0, userErrors: [] };
    }
    const data = await this.request<{
      inventorySetOnHandQuantities?: { userErrors?: Array<Record<string, unknown>> };
    }>(
      `
      mutation InventorySetOnHand($input: InventorySetOnHandQuantitiesInput!) {
        inventorySetOnHandQuantities(input: $input) {
          userErrors { field message }
        }
      }
      `,
      {
        input: {
          reason: "correction",
          setQuantities: updates.map((item) => ({
            inventoryItemId: item.inventoryItemId,
            locationId,
            quantity: item.quantity,
          })),
        },
      }
    );
    return {
      applied: updates.length,
      userErrors: data?.inventorySetOnHandQuantities?.userErrors || [],
    };
  }

  async updateVariantPricingBatch(
    productId: string,
    updates: Array<{ variantId: string; price: string | null; compareAtPrice: string | null }>
  ): Promise<{ applied: number; userErrors: Array<Record<string, unknown>> }> {
    if (!updates.length) {
      return { applied: 0, userErrors: [] };
    }
    const data = await this.request<{
      productVariantsBulkUpdate?: { userErrors?: Array<Record<string, unknown>> };
    }>(
      `
      mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          userErrors { field message }
        }
      }
      `,
      {
        productId,
        variants: updates.map((item) => ({
          id: item.variantId,
          price: item.price,
          compareAtPrice: item.compareAtPrice,
        })),
      }
    );
    return {
      applied: updates.length,
      userErrors: data?.productVariantsBulkUpdate?.userErrors || [],
    };
  }
}

export async function loadShopifyPublicationConfig(
  options: ShopifyPublicationCliOptions
): Promise<LoadedShopifyPublicationConfig> {
  const directDomain = normalizeShopDomain(options.shopDomain || process.env.SHOP_DOMAIN || process.env.SHOPIFY_DOMAIN || "");
  const directToken = String(process.env.SHOPIFY_ACCESS_TOKEN || "").trim();

  if (directDomain && directToken) {
    return {
      shopDomain: directDomain,
      accessToken: directToken,
      locationId: String(options.locationId || process.env.SHOPIFY_LOCATION_ID || "").trim(),
      apiVersion: String(options.apiVersion || process.env.SHOPIFY_API_VERSION || "").trim(),
      source: "env",
      cleanup: async () => {},
    };
  }

  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    throw new Error("Faltan SHOPIFY_DOMAIN + SHOPIFY_ACCESS_TOKEN o DATABASE_URL para leer la conexion guardada.");
  }

  const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
  const orgId = Number(process.env.APP_ORG_ID || "1");
  if (!Number.isInteger(orgId) || orgId <= 0) {
    throw new Error("APP_ORG_ID invalido");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl,
    options: "-c search_path=public",
    max: 2,
  });

  const params: unknown[] = [orgId];
  let where = "WHERE organization_id = $1";
  if (directDomain) {
    params.push(directDomain);
    where += " AND shop_domain = $2";
  }

  const result = await pool.query<{ shop_domain: string; access_token_encrypted: string }>(
    `
    SELECT shop_domain, access_token_encrypted
    FROM shopify_stores
    ${where}
    ORDER BY created_at DESC
    LIMIT 1
    `,
    params
  );

  const row = result.rows[0];
  if (!row?.access_token_encrypted) {
    await pool.end().catch(() => {});
    throw new Error("No se encontro conexion Shopify guardada.");
  }

  const decrypted = JSON.parse(decryptString(row.access_token_encrypted)) as {
    accessToken?: string;
    locationId?: string;
    apiVersion?: string;
  };
  const accessToken = String(decrypted.accessToken || "").trim();
  if (!accessToken) {
    await pool.end().catch(() => {});
    throw new Error("La conexion Shopify guardada no tiene access token.");
  }

  return {
    shopDomain: normalizeShopDomain(row.shop_domain),
    accessToken,
    locationId: String(options.locationId || decrypted.locationId || "").trim(),
    apiVersion: String(options.apiVersion || decrypted.apiVersion || "").trim(),
    source: "database",
    cleanup: async () => {
      await pool.end().catch(() => {});
    },
  };
}

export function filterPreparedRowsForPublication(
  prepared: PreparedInventoryWorkbookRow[],
  options: {
    references: string[];
    includeHidden: boolean;
    limit: number;
  }
): PreparedInventoryWorkbookRow[] {
  const requestedReferences = new Set(
    options.references.map((item) => String(item).trim().toUpperCase()).filter(Boolean)
  );
  const sourceRows = prepared.filter(
    (row) =>
      row.reference &&
      (options.includeHidden || row.visibleInStore) &&
      (!requestedReferences.size || requestedReferences.has(String(row.reference || "").trim().toUpperCase()))
  );
  return options.limit > 0 ? sourceRows.slice(0, options.limit) : sourceRows;
}

export function buildPublicationReport(input: {
  mode: "apply" | "dry_run";
  sourceFile: string;
  shopDomain: string;
  configSource: "env" | "database";
  locationId: string;
  selectedWarehouse: string;
  summary: PreparedInventoryWorkbookSummary;
  plan: PublicationPlan;
}): ShopifyPublicationReport {
  const { plan } = input;
  return {
    mode: input.mode,
    sourceFile: input.sourceFile,
    shopDomain: input.shopDomain,
    configSource: input.configSource,
    locationId: input.locationId,
    selectedWarehouse: input.selectedWarehouse,
    consideredRows: plan.consideredRows,
    matchedRows: plan.matchedRows,
    unmatchedRows: plan.unmatchedRows,
    updatesNeeded: plan.inventoryUpdatesNeeded,
    priceUpdatesNeeded: plan.priceUpdatesNeeded,
    unchangedRows: plan.unchangedRows,
    sampleMatched: plan.matched.slice(0, 20),
    sampleUnmatched: plan.unmatched.slice(0, 20),
    summary: input.summary,
  };
}

export async function applyInventoryUpdates(
  shopify: ShopifyApiClient,
  locationId: string,
  updates: PublicationMatchedRow[],
  batchSize: number
): Promise<{ appliedRows: number; batchResults: Array<Record<string, unknown>> }> {
  const batches = chunk(dedupeBy(updates, (item) => item.inventoryItemId), Math.max(1, batchSize));
  const batchResults: Array<Record<string, unknown>> = [];
  let appliedRows = 0;

  for (const batch of batches) {
    const response = await shopify.setInventoryOnHandBatch(
      locationId,
      batch.map((item) => ({ inventoryItemId: item.inventoryItemId, quantity: item.selectedQuantity }))
    );
    if (!response.userErrors.length) {
      appliedRows += batch.length;
      batchResults.push({
        size: batch.length,
        userErrors: [],
        references: batch.map((item) => `${item.reference}:${item.variantLabel}`),
      });
      await sleep(250);
      continue;
    }

    const retryResults = [];
    for (const item of batch) {
      const single = await shopify.setInventoryOnHandBatch(locationId, [
        { inventoryItemId: item.inventoryItemId, quantity: item.selectedQuantity },
      ]);
      if (!single.userErrors.length) {
        appliedRows += 1;
      }
      retryResults.push({
        reference: `${item.reference}:${item.variantLabel}`,
        userErrors: single.userErrors,
      });
      await sleep(150);
    }

    batchResults.push({
      size: batch.length,
      userErrors: response.userErrors,
      references: batch.map((item) => `${item.reference}:${item.variantLabel}`),
      retriedIndividually: true,
      retryResults,
    });
    await sleep(250);
  }

  return { appliedRows, batchResults };
}

export async function applyPriceUpdates(
  shopify: ShopifyApiClient,
  updates: PublicationMatchedRow[]
): Promise<{ appliedPriceRows: number; priceBatchResults: Array<Record<string, unknown>> }> {
  const priceGroups = new Map<
    string,
    Array<{ variantId: string; price: string | null; compareAtPrice: string | null; reference: string; variantLabel: string }>
  >();

  for (const item of dedupeBy(updates, (row) => row.variantId)) {
    const list = priceGroups.get(item.productId) || [];
    list.push({
      variantId: item.variantId,
      price: item.desiredPrice,
      compareAtPrice: item.desiredCompareAtPrice,
      reference: item.reference,
      variantLabel: item.variantLabel,
    });
    priceGroups.set(item.productId, list);
  }

  const priceBatchResults: Array<Record<string, unknown>> = [];
  let appliedPriceRows = 0;

  for (const [productId, items] of priceGroups.entries()) {
    const response = await shopify.updateVariantPricingBatch(productId, items);
    if (!response.userErrors.length) {
      appliedPriceRows += items.length;
      priceBatchResults.push({
        productId,
        size: items.length,
        userErrors: [],
        references: items.map((item) => `${item.reference}:${item.variantLabel}`),
      });
      await sleep(250);
      continue;
    }

    const retryResults = [];
    for (const item of items) {
      const single = await shopify.updateVariantPricingBatch(productId, [item]);
      if (!single.userErrors.length) {
        appliedPriceRows += 1;
      }
      retryResults.push({
        reference: `${item.reference}:${item.variantLabel}`,
        userErrors: single.userErrors,
      });
      await sleep(150);
    }

    priceBatchResults.push({
      productId,
      size: items.length,
      userErrors: response.userErrors,
      references: items.map((item) => `${item.reference}:${item.variantLabel}`),
      retriedIndividually: true,
      retryResults,
    });
    await sleep(250);
  }

  return { appliedPriceRows, priceBatchResults };
}

export async function prepareShopifyPublicationPlan(params: {
  rows: PreparedInventoryWorkbookRow[];
  shopify: ShopifyApiClient;
}): Promise<PublicationPlan> {
  const products = await params.shopify.listAllProducts();
  const index = buildShopifyVariantIndex(products);
  return planPreparedRowsForShopify(params.rows, index);
}

export function writePublicationArtifacts(params: {
  xlsxPath: string;
  outDir?: string;
  report: ShopifyPublicationReport;
  unmatched: PublicationUnmatchedRow[];
}) {
  const paths = buildOutputPaths(params.xlsxPath, params.outDir);
  const unmatchedPaths = writeUnmatchedOutputs(paths, params.unmatched);
  fs.writeFileSync(paths.reportPath, JSON.stringify(params.report, null, 2));
  return {
    reportPath: paths.reportPath,
    unmatchedPaths,
  };
}
