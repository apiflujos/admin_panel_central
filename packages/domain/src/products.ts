import type { AdminWebProductRowDto, AdminWebProductsListDto } from "../../shared/src/admin-web";

type ProductsListFiltersInput = {
  start?: unknown;
  limit?: unknown;
  query?: unknown;
  shopDomain?: unknown;
  inStockOnly?: unknown;
  warehouseIds?: unknown;
};

type ProductsListServiceItem = {
  id?: unknown;
  alegra_item_id?: unknown;
  shopify_product_id?: unknown;
  name?: unknown;
  reference?: unknown;
  sku?: unknown;
  barcode?: unknown;
  status_alegra?: unknown;
  status_shopify?: unknown;
  inventory_quantity?: unknown;
  source?: unknown;
  updated_at?: unknown;
  payload_json?: unknown;
};

function extractImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const fromArray = (value: unknown): string | null => {
    if (!Array.isArray(value) || !value.length) return null;
    const first = value[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const obj = first as Record<string, unknown>;
      const url = obj.url || obj.src || obj.image;
      return typeof url === "string" ? url : null;
    }
    return null;
  };
  const fromObject = (value: unknown): string | null => {
    if (!value || typeof value !== "object") return null;
    const obj = value as Record<string, unknown>;
    const url = obj.src || obj.url;
    return typeof url === "string" ? url : null;
  };
  return (
    fromArray(record.images) ||
    fromObject(record.image) ||
    (typeof record.imageUrl === "string" ? record.imageUrl : null) ||
    null
  );
}

function extractBarcode(row: ProductsListServiceItem): string | null {
  if (row.barcode) return String(row.barcode);
  const payload = row.payload_json;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record.barcode) return String(record.barcode);
    const customFields = Array.isArray(record.customFields) ? record.customFields : [];
    const match = customFields.find((field) => {
      const name = String((field as Record<string, unknown>)?.name || "");
      return /codigo de barras|código de barras|barcode/i.test(name);
    }) as Record<string, unknown> | undefined;
    if (match && match.value) return String(match.value);
  }
  return null;
}

type ProductsListServiceResult = {
  items: ProductsListServiceItem[];
  total: number;
  limit: number;
  offset: number;
};

function coerceOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function coerceOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBooleanLike(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  const lowered = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!lowered) return fallback;
  if (["1", "true", "yes", "on"].includes(lowered)) return true;
  if (["0", "false", "no", "off"].includes(lowered)) return false;
  return fallback;
}

export type NormalizedProductsListFilters = {
  offset?: number;
  limit?: number;
  query?: string;
  shopDomain?: string;
  inStockOnly: boolean;
  warehouseIds?: string[];
};

export function normalizeProductsListFilters(input: ProductsListFiltersInput): NormalizedProductsListFilters {
  const offset = coerceOptionalNumber(input.start);
  const limit = coerceOptionalNumber(input.limit);
  const query = coerceOptionalString(input.query);
  const shopDomain = coerceOptionalString(input.shopDomain);
  const warehouseIds = String(input.warehouseIds || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return {
    offset: typeof offset === "number" && offset >= 0 ? offset : 0,
    limit: typeof limit === "number" && limit > 0 ? limit : 30,
    query,
    shopDomain,
    inStockOnly: parseBooleanLike(input.inStockOnly, false),
    warehouseIds: warehouseIds.length ? warehouseIds : undefined,
  };
}

export function toAdminWebProductRowDto(row: ProductsListServiceItem): AdminWebProductRowDto {
  return {
    id: Number(row.id),
    alegraItemId: row.alegra_item_id ? String(row.alegra_item_id) : null,
    shopifyProductId: row.shopify_product_id ? String(row.shopify_product_id) : null,
    name: String(row.name || ""),
    reference: String(row.reference || ""),
    sku: String(row.sku || ""),
    barcode: extractBarcode(row),
    imageUrl: extractImageUrl(row.payload_json),
    alegraStatus: row.status_alegra ? String(row.status_alegra) : null,
    shopifyStatus: row.status_shopify ? String(row.status_shopify) : null,
    inventoryQuantity:
      row.inventory_quantity === null || row.inventory_quantity === undefined ? null : Number(row.inventory_quantity),
    source: row.source ? String(row.source) : null,
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
    stores: Array.isArray((row as { stores?: unknown }).stores)
      ? ((row as { stores?: unknown[] }).stores as unknown[]).map((s) => String(s)).filter(Boolean)
      : [],
  };
}

export function toAdminWebProductsListDto(result: ProductsListServiceResult): AdminWebProductsListDto {
  const items = result.items.map(toAdminWebProductRowDto);
  const matchedCount = items.filter((item) => Boolean(item.shopifyProductId)).length;
  const inStockCount = items.filter((item) => (item.inventoryQuantity ?? 0) > 0).length;

  return {
    items,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    summary: {
      matchedCount,
      pendingCount: items.length - matchedCount,
      inStockCount,
    },
  };
}
