import { getAlegraCredential } from "./settings.service";
import { getAlegraConnectionByDomain } from "./store-connections.service";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { syncAlegraInventoryById } from "./alegra-to-shopify.service";

const fetchAlegraAdjustments = async (query: URLSearchParams, shopDomain?: string) => {
  const alegra = shopDomain ? await getAlegraConnectionByDomain(shopDomain) : await getAlegraCredential();
  const baseUrl = getAlegraBaseUrl(alegra.environment || "prod");
  const auth = Buffer.from(`${alegra.email}:${alegra.apiKey}`).toString("base64");
  const url = `${baseUrl}/inventory-adjustments?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    const details = text ? `: ${text}` : "";
    throw new Error(`Alegra HTTP ${response.status} ${response.statusText}${details}`);
  }
  return response.json() as Promise<unknown>;
};

const fetchWithRetry = async (query: URLSearchParams, shopDomain?: string, maxRetries = 3) => {
  let attempt = 0;
  while (true) {
    try {
      return await fetchAlegraAdjustments(query, shopDomain);
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      const waitMs = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      attempt += 1;
    }
  }
};

export const extractAdjustmentItems = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { items?: unknown[]; data?: unknown[] };
  const items = Array.isArray(data.items) ? data.items : Array.isArray(data.data) ? data.data : [];
  return items as Array<{
    id?: string | number;
    items?: Array<{ id?: string | number }>;
  }>;
};

export async function syncInventoryAdjustments(
  query: URLSearchParams,
  options?: {
    autoPublish?: boolean;
    shopDomain?: string;
    onProgress?: (payload: Record<string, unknown>) => void | Promise<void>;
  }
) {
  if (!query.has("metadata")) query.set("metadata", "true");
  if (!query.has("date")) {
    query.set("date", new Date().toISOString().slice(0, 10));
  }
  const rawLimit = Number(query.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 30) : 30;
  const adjustments: Array<{
    id?: string | number;
    items?: Array<{ id?: string | number }>;
  }> = [];
  let start = Number(query.get("start") || 0);
  const shopDomain = options?.shopDomain ? String(options.shopDomain).trim() : "";
  while (true) {
    const pageQuery = new URLSearchParams(query.toString());
    pageQuery.set("start", String(start));
    pageQuery.set("limit", String(limit));
    const payload = await fetchWithRetry(pageQuery, shopDomain || undefined);
    const batch = extractAdjustmentItems(payload);
    await options?.onProgress?.({
      type: "adjustments_page",
      start,
      limit,
      fetched: batch.length,
      loaded: adjustments.length + batch.length,
    });
    if (!batch.length) {
      break;
    }
    adjustments.push(...batch);
    if (batch.length < limit) {
      break;
    }
    start += batch.length;
  }
  const itemIds = new Set<string>();
  adjustments.forEach((adjustment) => {
    (adjustment.items || []).forEach((item) => {
      if (item?.id) itemIds.add(String(item.id));
    });
  });
  const ids = Array.from(itemIds);
  const autoPublish = options?.autoPublish !== false;
  await options?.onProgress?.({
    type: "adjustments_loaded",
    adjustmentsCount: adjustments.length,
    itemCount: ids.length,
    autoPublish,
  });
  const results: PromiseSettledResult<unknown>[] = [];
  if (autoPublish) {
    const BATCH = 5;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(
        batch.map((id) => syncAlegraInventoryById(id, shopDomain || undefined))
      );
      results.push(...batchResults);
      await options?.onProgress?.({
        type: "publish_batch",
        processed: results.length,
        total: ids.length,
        synced: results.filter((result) => result.status === "fulfilled").length,
        failed: results.filter((result) => result.status === "rejected").length,
      });
    }
  }
  const synced = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - synced;

  return {
    adjustmentsCount: adjustments.length,
    itemCount: ids.length,
    synced,
    failed,
    autoPublish,
  };
}
