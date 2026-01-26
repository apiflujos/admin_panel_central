import { getAlegraCredential } from "./settings.service";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { syncAlegraInventoryById } from "./alegra-to-shopify.service";

const fetchAlegraAdjustments = async (query: URLSearchParams) => {
  const alegra = await getAlegraCredential();
  const baseUrl = getAlegraBaseUrl(alegra.environment || "prod");
  const auth = Buffer.from(`${alegra.email}:${alegra.apiKey}`).toString("base64");
  const url = `${baseUrl}/inventory/adjustments?${query.toString()}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Alegra HTTP ${response.status}`);
  }
  return response.json() as Promise<unknown>;
};

const fetchWithRetry = async (query: URLSearchParams, maxRetries = 3) => {
  let attempt = 0;
  while (true) {
    try {
      return await fetchAlegraAdjustments(query);
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

const extractAdjustmentItems = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { items?: unknown[]; data?: unknown[] };
  const items = Array.isArray(data.items) ? data.items : Array.isArray(data.data) ? data.data : [];
  return items as Array<{
    id?: string | number;
    items?: Array<{ id?: string | number }>;
  }>;
};

export async function syncInventoryAdjustments(query: URLSearchParams) {
  if (!query.has("metadata")) query.set("metadata", "true");
  const limit = Number(query.get("limit") || 30);
  const adjustments: Array<{
    id?: string | number;
    items?: Array<{ id?: string | number }>;
  }> = [];
  let start = Number(query.get("start") || 0);
  while (true) {
    const pageQuery = new URLSearchParams(query.toString());
    pageQuery.set("start", String(start));
    pageQuery.set("limit", String(limit));
    const payload = await fetchWithRetry(pageQuery);
    const batch = extractAdjustmentItems(payload);
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
  const results = await Promise.allSettled(ids.map((id) => syncAlegraInventoryById(id)));
  const synced = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - synced;

  return {
    adjustmentsCount: adjustments.length,
    itemCount: ids.length,
    synced,
    failed,
  };
}
