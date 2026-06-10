"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionsWorkspace, CriticalStoreConfig, WorkspaceStore } from "../lib/connections-workspace";
import {
  createShopifyWebhooks,
  deleteShopifyWebhooks,
  getShopifyWebhookStatus,
  stopInvoicesSync,
  stopContactsBulkSync,
  stopOrdersBackfill,
  stopOrdersSync,
  stopProductsBackfill,
  stopProductImagesSync,
  stopProductsToAlegraSync,
  stopProductsToShopifySync,
  updateProductOversell,
  updateProductTracking,
} from "../lib/api";
import { BooleanChoice } from "./ui/boolean-choice";

function summarizeResult(result: Record<string, unknown>) {
  const processed = typeof result.processed === "number" ? result.processed : null;
  const synced = typeof result.synced === "number" ? result.synced : null;
  const failed = typeof result.failed === "number" ? result.failed : null;
  const skipped = typeof result.skipped === "number" ? result.skipped : null;
  const count = typeof result.count === "number" ? result.count : null;
  const phaseCount = Array.isArray(result.phases) ? result.phases.length : null;
  const parts = [
    count !== null ? `Total ${count}` : null,
    processed !== null ? `Procesados ${processed}` : null,
    synced !== null ? `Sincronizados ${synced}` : null,
    skipped !== null ? `Omitidos ${skipped}` : null,
    failed !== null ? `Fallidos ${failed}` : null,
    phaseCount !== null ? `Fases ${phaseCount}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Proceso ejecutado.";
}

function toPercent(processed: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((processed / total) * 100)));
}

function orderModeLabel(mode: "invoice" | "contact_only" | "db_only" | "off") {
  if (mode === "invoice") return "Facturar en Contable";
  if (mode === "contact_only") return "Solo contacto";
  if (mode === "db_only") return "Solo base interna";
  return "Apagado";
}

type DateRange = { dateStart: string; dateEnd: string; limit: string };
type OrdersRange = DateRange & { orderNumber: string };
type InvoiceRange = DateRange & { alegraInvoiceId: string };
type ProductsSyncRange = DateRange & { query: string; batchSize: string };
type ProductsBackfillRange = DateRange & {
  source: "alegra" | "shopify" | "both";
  alegraStatus: "" | "active" | "inactive";
  useCache: boolean;
  shopifyPublishedOnly: boolean;
};
type ProductImagesForm = {
  matchBy: "sku" | "barcode";
  mode: "append" | "replace";
  publishEnabled: boolean;
  publishStatus: "draft" | "active";
  attachVariant: boolean;
  dryRun: boolean;
  rowsText: string;
};
type InventoryAdjustmentsForm = {
  date: string;
  start: string;
  limit: string;
  autoPublish: boolean;
};
type ProductsToShopifyOptions = {
  onlyActive: boolean;
  onlyWithImages: boolean;
  updateExisting: boolean;
  publishOnSync: boolean;
  publishStatus: "draft" | "active";
  trackInventory: boolean;
  allowOversell: boolean;
  includeInventory: boolean;
  onlyPublishedInShopify: boolean;
};
type ProductsToAlegraOptions = {
  createInAlegra: boolean;
  updateInAlegra: boolean;
  includeInventory: boolean;
  matchPriority: "sku_barcode" | "barcode_sku";
  warehouseId: string;
};
type ProductManualControlForm = {
  sku: string;
  alegraId: string;
  trackInventoryShopify: boolean;
  trackInventoryAlegra: boolean;
  allowOversellShopify: boolean;
  allowOversellAlegra: boolean;
  inventoryQuantity: string;
  inventoryUnit: string;
};
type ContactsBulkOptions = {
  shopifyToAlegra: boolean;
  alegraToShopify: boolean;
  createInAlegra: boolean;
  createInShopify: boolean;
};
type InvoicesToShopifyOptions = {
  createShopifyOrder: boolean;
  mode: "draft" | "active";
};
type OrdersToAlegraOptions = {
  mode: "invoice" | "contact_only" | "db_only" | "off";
  generateInvoice: boolean;
  skipRules: boolean;
};
type ActionStreamState = {
  key: string;
  title: string;
  progress: number;
  detail: string;
  syncId?: string;
  stoppable: boolean;
};

type ShopifyWebhookStatus = {
  ok: boolean;
  total: number;
  connected: number;
  missing: string[];
  callbackUrl?: string;
};

const defaultRange: DateRange = { dateStart: "", dateEnd: "", limit: "" };
const defaultOrdersRange: OrdersRange = { dateStart: "", dateEnd: "", limit: "", orderNumber: "" };
const defaultInvoiceRange: InvoiceRange = { dateStart: "", dateEnd: "", limit: "", alegraInvoiceId: "" };
const defaultProductsSyncRange: ProductsSyncRange = {
  dateStart: "",
  dateEnd: "",
  limit: "",
  query: "",
  batchSize: "5",
};
const defaultProductsBackfillRange: ProductsBackfillRange = {
  dateStart: "",
  dateEnd: "",
  limit: "",
  source: "both",
  alegraStatus: "",
  useCache: true,
  shopifyPublishedOnly: false,
};
const defaultProductImagesForm: ProductImagesForm = {
  matchBy: "sku",
  mode: "append",
  publishEnabled: false,
  publishStatus: "draft",
  attachVariant: true,
  dryRun: false,
  rowsText: "",
};
const defaultProductManualControlForm: ProductManualControlForm = {
  sku: "",
  alegraId: "",
  trackInventoryShopify: true,
  trackInventoryAlegra: true,
  allowOversellShopify: false,
  allowOversellAlegra: false,
  inventoryQuantity: "",
  inventoryUnit: "u",
};
const defaultInventoryAdjustmentsForm = (autoPublish: boolean): InventoryAdjustmentsForm => ({
  date: "",
  start: "",
  limit: "",
  autoPublish,
});

function buildPhotosTemplateCsv() {
  const lines = [
    "sku,barcode,images,alt",
    'ABC123,,https://cdn.tu-dominio.com/img1.jpg|https://cdn.tu-dominio.com/img2.jpg,""',
    ',7701234567890,https://cdn.tu-dominio.com/img3.jpg,""',
  ];
  return `${lines.join("\r\n")}\r\n`;
}

function parseCsvLine(line: string, delimiter: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        const next = line[index + 1];
        if (next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);
  return out;
}

function detectCsvDelimiter(headerLine: string) {
  const comma = (headerLine.match(/,/g) || []).length;
  const semicolon = (headerLine.match(/;/g) || []).length;
  const tab = (headerLine.match(/\t/g) || []).length;
  if (tab > comma && tab > semicolon) return "\t";
  if (semicolon > comma) return ";";
  return ",";
}

function normalizeUrlList(value: string) {
  const parts = String(value || "")
    .split(/[|,\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    try {
      const url = new URL(part);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      out.push(url.toString());
    } catch {
      // ignore invalid URLs
    }
  }
  return Array.from(new Set(out));
}

function parseProductImageRows(rowsText: string) {
  return rowsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 500)
    .map((line) => {
      const [identifierRaw, urlsRaw = "", altRaw = ""] = line.split("|");
      const identifier = String(identifierRaw || "").trim();
      const urls = String(urlsRaw || "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.startsWith("http://") || value.startsWith("https://"))
        .slice(0, 10);
      const alt = String(altRaw || "").trim();
      return { identifier, urls, alt: alt || null };
    })
    .filter((row) => row.identifier && row.urls.length);
}

async function parseProductImageCsvFile(file: File, matchBy: "sku" | "barcode") {
  const text = await file.text();
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new Error("El archivo está vacío.");
  }
  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((value) =>
    String(value || "")
      .trim()
      .toLowerCase()
  );
  const idx = (name: string) => headers.indexOf(name);
  const idCandidates =
    matchBy === "barcode"
      ? ["barcode", "codigo_barras", "codbarras", "ean", "upc", "code", "codigo", "identifier"]
      : ["sku", "reference", "referencia", "ref", "code", "codigo", "identifier"];
  const idIndex = idCandidates.map(idx).find((value) => value >= 0) ?? -1;
  const imagesIndex = ["images", "image_urls", "urls", "url", "image_url"].map(idx).find((value) => value >= 0) ?? -1;
  const imageCols = headers
    .map((header, index) => ({ header, index }))
    .filter(
      ({ header }) => /^image(_\d+)?$/.test(header) || /^imageurl(_\d+)?$/.test(header) || /^url(_\d+)?$/.test(header)
    )
    .map(({ index }) => index);
  const altIndex = ["alt", "alt_text", "texto_alt"].map(idx).find((value) => value >= 0) ?? -1;

  if (idIndex < 0) {
    throw new Error(`No encuentro la columna para ${matchBy}. Usa una columna "${matchBy}" o "identifier".`);
  }

  const rows: Array<{ identifier: string; urls: string[]; alt: string | null }> = [];
  const parseErrors: string[] = [];
  for (let lineIndex = 1; lineIndex < lines.length && rows.length < 500; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex], delimiter);
    const identifier = String(values[idIndex] || "").trim();
    if (!identifier) continue;
    const urls: string[] = [];
    if (imagesIndex >= 0) {
      urls.push(...normalizeUrlList(String(values[imagesIndex] || "")));
    }
    if (imageCols.length) {
      imageCols.forEach((index) => {
        urls.push(...normalizeUrlList(String(values[index] || "")));
      });
    }
    const deduped = Array.from(new Set(urls)).filter(Boolean).slice(0, 10);
    if (!deduped.length) {
      parseErrors.push(`Línea ${lineIndex + 1}: sin URLs para ${identifier}`);
      continue;
    }
    const alt = altIndex >= 0 ? String(values[altIndex] || "").trim() : "";
    rows.push({ identifier, urls: deduped, alt: alt || null });
  }

  if (!rows.length) {
    const detail = parseErrors.slice(0, 10).join("\n");
    throw new Error(detail ? `No pude leer filas válidas.\n${detail}` : "No pude leer filas válidas.");
  }

  return { rows, parseErrors };
}

export function StoreSyncActionsPanel({
  stores,
  storeConfigs,
  defaults,
  activeStoreId,
}: {
  stores: WorkspaceStore[];
  storeConfigs: CriticalStoreConfig[];
  defaults: ConnectionsWorkspace["storeConfigDefaults"];
  activeStoreId: number | null;
}) {
  const activeStore = useMemo(
    () => stores.find((store) => store.id === activeStoreId) ?? null,
    [activeStoreId, stores]
  );
  const activeConfig = useMemo(
    () => storeConfigs.find((config) => config.storeId === activeStoreId) ?? null,
    [activeStoreId, storeConfigs]
  );
  const effectiveRules = activeConfig?.rules ?? defaults.rules;
  const effectiveSync = activeConfig?.sync ?? defaults.sync;
  const [warehouseItems, setWarehouseItems] = useState<Array<{ id: string; name: string }>>([]);

  const [contactsRange, setContactsRange] = useState<DateRange>(defaultRange);
  const [ordersRange, setOrdersRange] = useState<OrdersRange>(defaultOrdersRange);
  const [invoiceRange, setInvoiceRange] = useState<InvoiceRange>(defaultInvoiceRange);
  const [productsRange, setProductsRange] = useState<ProductsSyncRange>(defaultProductsSyncRange);
  const [productsBackRange, setProductsBackRange] = useState<DateRange>(defaultRange);
  const [productsCatalogRange, setProductsCatalogRange] = useState<ProductsBackfillRange>(defaultProductsBackfillRange);
  const [productImagesForm, setProductImagesForm] = useState<ProductImagesForm>(defaultProductImagesForm);
  const [productImageErrors, setProductImageErrors] = useState<string[]>([]);
  const [productManualControlForm, setProductManualControlForm] = useState<ProductManualControlForm>(
    defaultProductManualControlForm
  );
  const [inventoryAdjustmentsForm, setInventoryAdjustmentsForm] = useState<InventoryAdjustmentsForm>(
    defaultInventoryAdjustmentsForm(effectiveRules.inventoryAdjustmentsAutoPublish)
  );
  const [productsToShopifyWarehouseIds, setProductsToShopifyWarehouseIds] = useState<string[]>([]);
  const [contactsBulkOptions, setContactsBulkOptions] = useState<ContactsBulkOptions>({
    shopifyToAlegra: effectiveSync.contacts.fromShopify,
    alegraToShopify: effectiveSync.contacts.fromAlegra,
    createInAlegra: effectiveSync.contacts.createInAlegra,
    createInShopify: effectiveSync.contacts.createInShopify,
  });
  const [invoicesToShopifyOptions, setInvoicesToShopifyOptions] = useState<InvoicesToShopifyOptions>({
    createShopifyOrder: effectiveSync.orders.alegraToShopify !== "off",
    mode: effectiveSync.orders.alegraToShopify === "active" ? "active" : "draft",
  });
  const [ordersToAlegraOptions, setOrdersToAlegraOptions] = useState<OrdersToAlegraOptions>({
    mode: effectiveSync.orders.shopifyToAlegra,
    generateInvoice: activeConfig?.invoice?.generateInvoice ?? defaults.invoice.generateInvoice,
    skipRules: false,
  });
  const [productsToShopifyOptions, setProductsToShopifyOptions] = useState<ProductsToShopifyOptions>({
    onlyActive: effectiveRules.onlyActiveItems,
    onlyWithImages: effectiveRules.includeImages,
    updateExisting: effectiveRules.updateInShopify,
    publishOnSync: effectiveRules.createInShopify || effectiveRules.updateInShopify,
    publishStatus: effectiveRules.autoPublishStatus,
    trackInventory: effectiveRules.trackInventory,
    allowOversell: effectiveRules.allowOversell,
    includeInventory: effectiveRules.publishOnStock,
    onlyPublishedInShopify: false,
  });
  const [productsToAlegraOptions, setProductsToAlegraOptions] = useState<ProductsToAlegraOptions>({
    createInAlegra: effectiveSync.products.createInAlegra,
    updateInAlegra: effectiveSync.products.updateInAlegra,
    includeInventory: effectiveSync.products.includeInventory,
    matchPriority: effectiveSync.products.matchPriority,
    warehouseId: effectiveSync.products.warehouseId,
  });
  const [loadingKey, setLoadingKey] = useState("");
  const [message, setMessage] = useState("");
  const [streamState, setStreamState] = useState<ActionStreamState | null>(null);
  const [ordersWebhookStatus, setOrdersWebhookStatus] = useState<ShopifyWebhookStatus | null>(null);
  const [ordersWebhookLoading, setOrdersWebhookLoading] = useState(false);
  const [ordersWebhookMessage, setOrdersWebhookMessage] = useState("");
  const [ordersWebhookActionKey, setOrdersWebhookActionKey] = useState("");

  useEffect(() => {
    setContactsBulkOptions({
      shopifyToAlegra: effectiveSync.contacts.fromShopify,
      alegraToShopify: effectiveSync.contacts.fromAlegra,
      createInAlegra: effectiveSync.contacts.createInAlegra,
      createInShopify: effectiveSync.contacts.createInShopify,
    });
  }, [effectiveSync.contacts]);

  useEffect(() => {
    setProductsToShopifyOptions({
      onlyActive: effectiveRules.onlyActiveItems,
      onlyWithImages: effectiveRules.includeImages,
      updateExisting: effectiveRules.updateInShopify,
      publishOnSync: effectiveRules.createInShopify || effectiveRules.updateInShopify,
      publishStatus: effectiveRules.autoPublishStatus,
      trackInventory: effectiveRules.trackInventory,
      allowOversell: effectiveRules.allowOversell,
      includeInventory: effectiveRules.publishOnStock,
      onlyPublishedInShopify: false,
    });
    setProductsToShopifyWarehouseIds([]);
    setInventoryAdjustmentsForm(defaultInventoryAdjustmentsForm(effectiveRules.inventoryAdjustmentsAutoPublish));
  }, [effectiveRules]);

  useEffect(() => {
    setProductsToAlegraOptions({
      createInAlegra: effectiveSync.products.createInAlegra,
      updateInAlegra: effectiveSync.products.updateInAlegra,
      includeInventory: effectiveSync.products.includeInventory,
      matchPriority: effectiveSync.products.matchPriority,
      warehouseId: effectiveSync.products.warehouseId,
    });
  }, [effectiveSync.products]);

  useEffect(() => {
    setInvoicesToShopifyOptions({
      createShopifyOrder: effectiveSync.orders.alegraToShopify !== "off",
      mode: effectiveSync.orders.alegraToShopify === "active" ? "active" : "draft",
    });
  }, [effectiveSync.orders.alegraToShopify]);

  useEffect(() => {
    setOrdersToAlegraOptions({
      mode: effectiveSync.orders.shopifyToAlegra,
      generateInvoice: activeConfig?.invoice?.generateInvoice ?? defaults.invoice.generateInvoice,
      skipRules: false,
    });
  }, [activeConfig?.invoice?.generateInvoice, defaults.invoice.generateInvoice, effectiveSync.orders.shopifyToAlegra]);

  useEffect(() => {
    const shopDomain = activeStore?.providers.shopify?.shopDomain;
    if (!shopDomain) {
      setOrdersWebhookStatus(null);
      setOrdersWebhookMessage("");
      return;
    }
    let cancelled = false;
    setOrdersWebhookLoading(true);
    setOrdersWebhookMessage("");
    getShopifyWebhookStatus(shopDomain)
      .then((payload) => {
        if (!cancelled) {
          setOrdersWebhookStatus(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setOrdersWebhookStatus(null);
          setOrdersWebhookMessage(
            error instanceof Error ? error.message : "No se pudo consultar el estado de webhooks Shopify."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrdersWebhookLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeStore?.providers.shopify?.shopDomain]);

  useEffect(() => {
    const shopDomain = activeConfig?.shopDomain ?? activeStore?.providers.shopify?.shopDomain ?? "";
    if (!activeStore || !shopDomain) {
      setWarehouseItems([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/alegra/warehouses?shopDomain=${encodeURIComponent(shopDomain)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          items?: Array<{ id?: string | number; _id?: string | number; name?: string }>;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || `warehouses_failed:${response.status}`);
        }
        const nextItems = Array.isArray(payload.items)
          ? payload.items
              .map((item) => ({
                id: String(item.id || item._id || "").trim(),
                name: String(item.name || item.id || item._id || "").trim(),
              }))
              .filter((item) => item.id)
              .sort((left, right) => left.name.localeCompare(right.name, "es"))
          : [];
        if (!cancelled) {
          setWarehouseItems(nextItems);
        }
      })
      .catch(() => {
        if (!cancelled) setWarehouseItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeConfig?.shopDomain, activeStore]);

  async function runAction(key: string, action: () => Promise<Record<string, unknown>>) {
    setLoadingKey(key);
    setMessage("");
    setStreamState(null);
    try {
      const result = await action();
      setMessage(summarizeResult(result));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo ejecutar la sincronización.");
    } finally {
      setLoadingKey("");
    }
  }

  async function runStreamAction(
    key: string,
    title: string,
    path: string,
    payload: Record<string, unknown>,
    options?: { stoppable?: boolean; onPayload?: (payload: Record<string, unknown>) => void }
  ) {
    const controller = new AbortController();
    setLoadingKey(key);
    setMessage("");
    setStreamState({
      key,
      title,
      progress: 0,
      detail: "Iniciando...",
      stoppable: options?.stoppable === true,
    });
    try {
      const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}stream=1`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, stream: true }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const text = await response.text();
        throw new Error(text || "No se pudo ejecutar el sincronizador.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let eventPayload: Record<string, unknown>;
          try {
            eventPayload = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            continue;
          }
          options?.onPayload?.(eventPayload);
        }
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "No se pudo ejecutar el sincronizador.";
      setStreamState((current) =>
        current?.key === key ? { ...current, detail: nextMessage, stoppable: false } : current
      );
      setMessage(nextMessage);
    } finally {
      setLoadingKey((current) => (current === key ? "" : current));
    }
  }

  async function stopStreamAction(key: string) {
    const current = streamState;
    if (!current?.syncId) return;
    if (key === "products-to-shopify") {
      await stopProductsToShopifySync(current.syncId);
    } else if (key === "products-to-alegra") {
      await stopProductsToAlegraSync(current.syncId);
    } else if (key === "product-images") {
      await stopProductImagesSync(current.syncId);
    } else if (key === "contacts") {
      await stopContactsBulkSync(current.syncId);
    } else if (key === "orders") {
      await stopOrdersSync(current.syncId);
    } else if (key === "invoices") {
      await stopInvoicesSync(current.syncId);
    } else if (key === "invoices-backfill") {
      await stopOrdersBackfill(current.syncId);
    } else if (key === "products-backfill") {
      await stopProductsBackfill(current.syncId);
    }
    setStreamState((state) =>
      state && state.key === key ? { ...state, detail: "Deteniendo...", stoppable: false } : state
    );
  }

  async function refreshOrdersWebhookStatus() {
    const shopDomain = activeStore?.providers.shopify?.shopDomain;
    if (!shopDomain) {
      setOrdersWebhookStatus(null);
      setOrdersWebhookMessage("Selecciona una tienda con Shopify activo para revisar webhooks.");
      return;
    }
    setOrdersWebhookLoading(true);
    setOrdersWebhookMessage("");
    try {
      const payload = await getShopifyWebhookStatus(shopDomain);
      setOrdersWebhookStatus(payload);
    } catch (error) {
      setOrdersWebhookStatus(null);
      setOrdersWebhookMessage(
        error instanceof Error ? error.message : "No se pudo consultar el estado de webhooks Shopify."
      );
    } finally {
      setOrdersWebhookLoading(false);
    }
  }

  async function runOrdersWebhookAction(action: "create" | "delete") {
    const shopDomain = activeStore?.providers.shopify?.shopDomain;
    if (!shopDomain) {
      setOrdersWebhookMessage("Selecciona una tienda con Shopify activo para administrar webhooks.");
      return;
    }
    setOrdersWebhookActionKey(action);
    setOrdersWebhookMessage("");
    try {
      const payload =
        action === "create" ? await createShopifyWebhooks(shopDomain) : await deleteShopifyWebhooks(shopDomain);
      await refreshOrdersWebhookStatus();
      if (action === "create") {
        setOrdersWebhookMessage(payload.ok ? "Webhooks Shopify recreados." : "Webhooks recreados con advertencias.");
      } else {
        setOrdersWebhookMessage(
          `Webhooks eliminados ${typeof payload.deleted === "number" ? payload.deleted : 0}/${typeof payload.total === "number" ? payload.total : "?"}.`
        );
      }
    } catch (error) {
      setOrdersWebhookMessage(
        error instanceof Error ? error.message : "No se pudo ejecutar la acción sobre webhooks Shopify."
      );
    } finally {
      setOrdersWebhookActionKey("");
    }
  }

  async function loadProductImagesFile(file: File) {
    const { rows, parseErrors } = await parseProductImageCsvFile(file, productImagesForm.matchBy);
    setProductImageErrors(parseErrors);
    setProductImagesForm((current) => ({
      ...current,
      rowsText: rows.map((row) => `${row.identifier}|${row.urls.join(",")}|${row.alt || ""}`).join("\n"),
    }));
    setMessage(`Archivo listo: ${rows.length} filas válidas.`);
  }

  const productsToShopifyWarehouseSummary = useMemo(() => {
    if (!warehouseItems.length) return "Sin bodegas";
    if (!productsToShopifyWarehouseIds.length) return "Usar configuración guardada";
    if (productsToShopifyWarehouseIds.length === warehouseItems.length) return "Todas";
    return `${productsToShopifyWarehouseIds.length} seleccionadas`;
  }, [productsToShopifyWarehouseIds, warehouseItems]);

  function downloadProductImagesTemplate() {
    const blob = new Blob([buildPhotosTemplateCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_fotos_shopify.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadProductImagesErrors() {
    const lines = productImageErrors.length ? productImageErrors.join("\n") : "Sin errores.";
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "errores_fotos_shopify.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function runProductManualTrackingUpdate() {
    if (!productManualControlForm.sku.trim() && !productManualControlForm.alegraId.trim()) {
      setMessage("Escribe al menos SKU o Alegra ID para actualizar tracking.");
      return;
    }
    await runAction("product-tracking", () =>
      updateProductTracking({
        shopDomain: activeStore?.providers.shopify?.shopDomain,
        storeId: activeStore?.id,
        sku: productManualControlForm.sku.trim() || undefined,
        alegraId: productManualControlForm.alegraId.trim() || undefined,
        trackInventoryShopify: productManualControlForm.trackInventoryShopify,
        trackInventoryAlegra: productManualControlForm.trackInventoryAlegra,
        inventoryQuantity:
          productManualControlForm.inventoryQuantity.trim() !== ""
            ? Number(productManualControlForm.inventoryQuantity)
            : undefined,
        inventoryUnit: productManualControlForm.inventoryUnit.trim() || undefined,
        allowOversellAlegra: productManualControlForm.allowOversellAlegra,
      })
    );
  }

  async function runProductManualOversellUpdate() {
    if (!productManualControlForm.sku.trim() && !productManualControlForm.alegraId.trim()) {
      setMessage("Escribe al menos SKU o Alegra ID para actualizar sobreventa.");
      return;
    }
    await runAction("product-oversell", () =>
      updateProductOversell({
        shopDomain: activeStore?.providers.shopify?.shopDomain,
        storeId: activeStore?.id,
        sku: productManualControlForm.sku.trim() || undefined,
        alegraId: productManualControlForm.alegraId.trim() || undefined,
        allowOversellShopify: productManualControlForm.allowOversellShopify,
        allowOversellAlegra: productManualControlForm.allowOversellAlegra,
      })
    );
  }

  if (!activeStore) {
    return (
      <section className="card connection-card">
        <p className="connection-inline-note">Selecciona una tienda para ejecutar corridas manuales.</p>
      </section>
    );
  }

  return (
    <section className="card connection-card">

      <div className="store-configs-grid">
        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Contactos</strong>
            <span>Carga histórica de contactos por rango</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <label className="store-config-field">
                <span>Fecha inicio</span>
                <input
                  className="input"
                  type="date"
                  value={contactsRange.dateStart}
                  onChange={(event) => setContactsRange((current) => ({ ...current, dateStart: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Fecha fin</span>
                <input
                  className="input"
                  type="date"
                  value={contactsRange.dateEnd}
                  onChange={(event) => setContactsRange((current) => ({ ...current, dateEnd: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Límite</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  placeholder="200"
                  value={contactsRange.limit}
                  onChange={(event) => setContactsRange((current) => ({ ...current, limit: event.target.value }))}
                />
              </label>
            </div>
            <div className="store-configs-grid">
              <BooleanChoice
                label="Permitir E-commerce → Contable"
                value={contactsBulkOptions.shopifyToAlegra}
                onChange={(next) => setContactsBulkOptions((current) => ({ ...current, shopifyToAlegra: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Crear nuevos en Contable"
                value={contactsBulkOptions.createInAlegra}
                onChange={(next) => setContactsBulkOptions((current) => ({ ...current, createInAlegra: next }))}
                positive="Sí"
                negative="No"
                disabled={!contactsBulkOptions.shopifyToAlegra}
              />
              <BooleanChoice
                label="Permitir Contable → E-commerce"
                value={contactsBulkOptions.alegraToShopify}
                onChange={(next) => setContactsBulkOptions((current) => ({ ...current, alegraToShopify: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Crear nuevos en E-commerce"
                value={contactsBulkOptions.createInShopify}
                onChange={(next) => setContactsBulkOptions((current) => ({ ...current, createInShopify: next }))}
                positive="Sí"
                negative="No"
                disabled={!contactsBulkOptions.alegraToShopify}
              />
            </div>
            <div className="connection-card-actions">
              <button
                className="btn primary"
                type="button"
                disabled={loadingKey === "contacts"}
                onClick={() =>
                  void runStreamAction(
                    "contacts",
                    "Contactos E-commerce ↔ Contable",
                    "/api/sync/contacts/bulk",
                    {
                      direction: "bidirectional",
                      shopDomain: activeStore.providers.shopify?.shopDomain,
                      from: contactsRange.dateStart || undefined,
                      to: contactsRange.dateEnd || undefined,
                      limit: contactsRange.limit ? Number(contactsRange.limit) : undefined,
                      directions: {
                        shopifyToAlegra: contactsBulkOptions.shopifyToAlegra,
                        alegraToShopify: contactsBulkOptions.alegraToShopify,
                      },
                      createInAlegra: contactsBulkOptions.createInAlegra,
                      createInShopify: contactsBulkOptions.createInShopify,
                    },
                    {
                      onPayload: (payload) => {
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "contacts"
                              ? {
                                  ...current,
                                  progress: 0,
                                  detail: `Iniciando ${Number(payload.phaseTotal || 1)} fases...`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "progress") {
                          const total = Number(payload.total || 0);
                          const processed = Number(payload.processed || 0);
                          const phaseIndex = Number(payload.phaseIndex || 1);
                          const phaseTotal = Number(payload.phaseTotal || 1);
                          const phasePercent = toPercent(processed, total);
                          const percent = Math.max(
                            0,
                            Math.min(
                              100,
                              Math.round(((Math.max(0, phaseIndex - 1) + phasePercent / 100) / phaseTotal) * 100)
                            )
                          );
                          setStreamState((current) =>
                            current?.key === "contacts"
                              ? {
                                  ...current,
                                  progress: percent,
                                  detail: `Fase ${phaseIndex}/${phaseTotal} · ${String(payload.directionLabel || "")} · Procesados ${processed}/${total || "?"} · Sincronizados ${Number(payload.synced || 0)} · Fallidos ${Number(payload.failed || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "complete") {
                          setStreamState((current) =>
                            current?.key === "contacts"
                              ? {
                                  ...current,
                                  progress: 100,
                                  detail: `Procesados ${Number(payload.processed || 0)} · Sincronizados ${Number(payload.synced || 0)} · Omitidos ${Number(payload.skipped || 0)} · Fallidos ${Number(payload.failed || 0)}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(
                            `Contactos listos. Procesados ${Number(payload.processed || 0)} · Sincronizados ${Number(payload.synced || 0)} · Omitidos ${Number(payload.skipped || 0)} · Fallidos ${Number(payload.failed || 0)}`
                          );
                          return;
                        }
                        if (payload.type === "canceled") {
                          setStreamState((current) =>
                            current?.key === "contacts"
                              ? {
                                  ...current,
                                  detail: "Sincronización detenida por cierre de stream.",
                                  stoppable: false,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "error") {
                          throw new Error(String(payload.error || "No se pudo sincronizar contactos."));
                        }
                      },
                    }
                  )
                }
              >
                {loadingKey === "contacts" ? "Sincronizando..." : "Sincronizar contactos"}
              </button>
              {streamState?.key === "contacts" && streamState.stoppable ? (
                <button className="btn ghost" type="button" onClick={() => void stopStreamAction("contacts")}>
                  Detener
                </button>
              ) : null}
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setContactsRange(defaultRange);
                  setContactsBulkOptions({
                    shopifyToAlegra: effectiveSync.contacts.fromShopify,
                    alegraToShopify: effectiveSync.contacts.fromAlegra,
                    createInAlegra: effectiveSync.contacts.createInAlegra,
                    createInShopify: effectiveSync.contacts.createInShopify,
                  });
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Ajustes finos por producto</strong>
            <span>Corrige tracking y sobreventa por SKU o Alegra ID.</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <label className="store-config-field">
                <span>SKU en E-commerce</span>
                <input
                  className="input"
                  value={productManualControlForm.sku}
                  placeholder="SKU-001"
                  onChange={(event) =>
                    setProductManualControlForm((current) => ({ ...current, sku: event.target.value }))
                  }
                />
              </label>
              <label className="store-config-field">
                <span>Alegra ID</span>
                <input
                  className="input"
                  value={productManualControlForm.alegraId}
                  placeholder="12345"
                  onChange={(event) =>
                    setProductManualControlForm((current) => ({ ...current, alegraId: event.target.value }))
                  }
                />
              </label>
              <BooleanChoice
                label="Tracking en E-commerce"
                value={productManualControlForm.trackInventoryShopify}
                onChange={(next) =>
                  setProductManualControlForm((current) => ({ ...current, trackInventoryShopify: next }))
                }
                positive="Activo"
                negative="Inactivo"
              />
              <BooleanChoice
                label="Tracking en Contable"
                value={productManualControlForm.trackInventoryAlegra}
                onChange={(next) =>
                  setProductManualControlForm((current) => ({ ...current, trackInventoryAlegra: next }))
                }
                positive="Activo"
                negative="Inactivo"
              />
              <BooleanChoice
                label="Sobreventa en E-commerce"
                value={productManualControlForm.allowOversellShopify}
                onChange={(next) =>
                  setProductManualControlForm((current) => ({ ...current, allowOversellShopify: next }))
                }
                positive="Permitida"
                negative="Bloqueada"
                disabled={!productManualControlForm.trackInventoryShopify}
              />
              <BooleanChoice
                label="Sobreventa en Contable"
                value={productManualControlForm.allowOversellAlegra}
                onChange={(next) =>
                  setProductManualControlForm((current) => ({ ...current, allowOversellAlegra: next }))
                }
                positive="Permitida"
                negative="Bloqueada"
                disabled={!productManualControlForm.trackInventoryAlegra}
              />
              <label className="store-config-field">
                <span>Inventario inicial en Contable</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={productManualControlForm.inventoryQuantity}
                  onChange={(event) =>
                    setProductManualControlForm((current) => ({
                      ...current,
                      inventoryQuantity: event.target.value,
                    }))
                  }
                />
                <small>Solo si activas tracking en Contable.</small>
              </label>
              <label className="store-config-field">
                <span>Unidad en Contable</span>
                <input
                  className="input"
                  value={productManualControlForm.inventoryUnit}
                  placeholder="u"
                  onChange={(event) =>
                    setProductManualControlForm((current) => ({ ...current, inventoryUnit: event.target.value }))
                  }
                />
              </label>
            </div>
            <small className="connection-inline-note">Sirve para correcciones puntuales sin relanzar el catálogo. Puedes usar solo SKU, solo Alegra ID o ambos.</small>
            <div className="connection-card-actions">
              <button
                className="btn primary"
                type="button"
                disabled={loadingKey === "product-tracking"}
                onClick={() => void runProductManualTrackingUpdate()}
              >
                {loadingKey === "product-tracking" ? "Actualizando..." : "Guardar tracking"}
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={loadingKey === "product-oversell"}
                onClick={() => void runProductManualOversellUpdate()}
              >
                {loadingKey === "product-oversell" ? "Actualizando..." : "Guardar sobreventa"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setProductManualControlForm(defaultProductManualControlForm);
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Pedidos y facturas</strong>
            <span>Carga histórica de pedidos y facturas por rango</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <label className="store-config-field">
                <span>Fecha inicio</span>
                <input
                  className="input"
                  type="date"
                  value={ordersRange.dateStart}
                  onChange={(event) => setOrdersRange((current) => ({ ...current, dateStart: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Fecha fin</span>
                <input
                  className="input"
                  type="date"
                  value={ordersRange.dateEnd}
                  onChange={(event) => setOrdersRange((current) => ({ ...current, dateEnd: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Límite</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  placeholder="100"
                  value={ordersRange.limit}
                  onChange={(event) => setOrdersRange((current) => ({ ...current, limit: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Pedido puntual</span>
                <input
                  className="input"
                  value={ordersRange.orderNumber}
                  placeholder="#12345"
                  onChange={(event) => setOrdersRange((current) => ({ ...current, orderNumber: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Factura puntual Contable</span>
                <input
                  className="input"
                  value={invoiceRange.alegraInvoiceId}
                  placeholder="Alegra ID 12345"
                  onChange={(event) =>
                    setInvoiceRange((current) => ({ ...current, alegraInvoiceId: event.target.value }))
                  }
                />
                <small>Si lo llenas, usa la factura puntual en vez del rango.</small>
              </label>
            </div>
            <div className="settings-subsection">
              <div className="settings-subsection-head">
                <div>
                  <strong>Webhooks Shopify para pedidos</strong>
                  <span>Valida los eventos antes de lanzar masivos.</span>
                </div>
                {ordersWebhookStatus ? (
                  <span
                    className={`pill ${
                      ordersWebhookStatus.ok ? "pill-ok" : ordersWebhookStatus.connected ? "pill-warn" : "pill-bad"
                    }`}
                  >
                    {ordersWebhookStatus.ok
                      ? "Completos"
                      : `${ordersWebhookStatus.connected}/${ordersWebhookStatus.total}`}
                  </span>
                ) : (
                  <span className="pill">{ordersWebhookLoading ? "Consultando..." : "Sin datos"}</span>
                )}
              </div>
              <div className="page-module-actions compact-pills">
                <span className="pill">
                  Eventos {ordersWebhookStatus?.connected || 0}/{ordersWebhookStatus?.total || 0}
                </span>
                {ordersWebhookStatus?.missing?.length ? (
                  <span className="pill pill-warn">Faltan {ordersWebhookStatus.missing.join(", ")}</span>
                ) : (
                  <span className="pill pill-ok">Cobertura base lista</span>
                )}
              </div>
              <div className="connection-tech-list">
                <div className="connection-tech-item">
                  <span>URL esperada</span>
                  <strong>{ordersWebhookStatus?.callbackUrl || "Disponible al consultar el estado"}</strong>
                </div>
                <div className="connection-tech-item">
                  <span>Acción sugerida</span>
                  <strong>
                    {ordersWebhookStatus?.missing?.length
                      ? "Recrear webhooks antes de lanzar sincronizaciones de pedidos."
                      : "La tienda ya tiene la cobertura mínima para pedidos, inventario y productos."}
                  </strong>
                </div>
              </div>
              <div className="connection-card-actions">
                <button
                  className="btn ghost"
                  type="button"
                  disabled={ordersWebhookLoading}
                  onClick={() => {
                    void refreshOrdersWebhookStatus();
                  }}
                >
                  Revisar estado
                </button>
                <button
                  className="btn primary"
                  type="button"
                  disabled={ordersWebhookActionKey === "create" || !activeStore.providers.shopify?.shopDomain}
                  onClick={() => {
                    void runOrdersWebhookAction("create");
                  }}
                >
                  {ordersWebhookActionKey === "create" ? "Recreando..." : "Recrear webhooks"}
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  disabled={ordersWebhookActionKey === "delete" || !activeStore.providers.shopify?.shopDomain}
                  onClick={() => {
                    void runOrdersWebhookAction("delete");
                  }}
                >
                  {ordersWebhookActionKey === "delete" ? "Limpiando..." : "Limpiar webhooks"}
                </button>
              </div>
              {ordersWebhookMessage ? <p className="connection-inline-note">{ordersWebhookMessage}</p> : null}
            </div>
            <div className="store-configs-grid">
              <label className="store-config-field">
                <span>Modo Shopify → Contable</span>
                <select
                  className="input"
                  value={ordersToAlegraOptions.mode}
                  onChange={(event) =>
                    setOrdersToAlegraOptions((current) => ({
                      ...current,
                      mode:
                        event.target.value === "contact_only" ||
                        event.target.value === "db_only" ||
                        event.target.value === "off"
                          ? event.target.value
                          : "invoice",
                    }))
                  }
                >
                  <option value="invoice">Facturar en Contable</option>
                  <option value="contact_only">Solo contacto</option>
                  <option value="db_only">Solo base interna</option>
                  <option value="off">Apagado</option>
                </select>
                <small>Define la profundidad de la corrida manual.</small>
              </label>
              <BooleanChoice
                label="Generar factura"
                value={ordersToAlegraOptions.generateInvoice}
                onChange={(next) => setOrdersToAlegraOptions((current) => ({ ...current, generateInvoice: next }))}
                positive="Sí"
                negative="No"
                disabled={ordersToAlegraOptions.mode !== "invoice"}
                help="Solo para esta corrida manual."
              />
              <BooleanChoice
                label="Ignorar reglas logísticas"
                value={ordersToAlegraOptions.skipRules}
                onChange={(next) => setOrdersToAlegraOptions((current) => ({ ...current, skipRules: next }))}
                positive="Sí"
                negative="No"
                help="Registra el pedido aún si una regla lo bloquearía."
              />
              <BooleanChoice
                label="Crear pedido en E-commerce"
                value={invoicesToShopifyOptions.createShopifyOrder}
                onChange={(next) =>
                  setInvoicesToShopifyOptions((current) => ({ ...current, createShopifyOrder: next }))
                }
                positive="Sí"
                negative="No"
                help="Si lo apagas, usa solo la carga a base desde Contable."
              />
              <label className="store-config-field">
                <span>Crear como</span>
                <select
                  className="input"
                  value={invoicesToShopifyOptions.mode}
                  disabled={!invoicesToShopifyOptions.createShopifyOrder}
                  onChange={(event) =>
                    setInvoicesToShopifyOptions((current) => ({
                      ...current,
                      mode: event.target.value === "active" ? "active" : "draft",
                    }))
                  }
                >
                  <option value="draft">Borrador</option>
                  <option value="active">Activo</option>
                </select>
                <small>Define si la factura regresa como borrador o pedido activo.</small>
              </label>
            </div>
            <div className="connection-card-actions">
              <button
                className="btn primary"
                type="button"
                disabled={loadingKey === "orders"}
                onClick={() =>
                  void runStreamAction(
                    "orders",
                    "Pedidos Shopify → Contable",
                    "/api/sync/orders",
                    {
                      shopDomain: activeStore.providers.shopify?.shopDomain,
                      mode: ordersToAlegraOptions.mode,
                      generateInvoice:
                        ordersToAlegraOptions.mode === "invoice" ? ordersToAlegraOptions.generateInvoice : false,
                      skipRules: ordersToAlegraOptions.skipRules,
                      filters: {
                        dateStart: ordersRange.dateStart || undefined,
                        dateEnd: ordersRange.dateEnd || undefined,
                        limit: ordersRange.limit ? Number(ordersRange.limit) : undefined,
                        orderNumber: ordersRange.orderNumber.trim() || undefined,
                      },
                    },
                    {
                      stoppable: true,
                      onPayload: (payload) => {
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "orders"
                              ? {
                                  ...current,
                                  syncId: typeof payload.syncId === "string" ? payload.syncId : current.syncId,
                                  progress: 0,
                                  detail: `Preparando ${Number(payload.total || 0)} pedidos...`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "progress") {
                          const total = Number(payload.total || 0);
                          const processed = Number(payload.processed || 0);
                          setStreamState((current) =>
                            current?.key === "orders"
                              ? {
                                  ...current,
                                  syncId: typeof payload.syncId === "string" ? payload.syncId : current.syncId,
                                  progress: toPercent(processed, total),
                                  detail: `Procesados ${processed}/${total || "?"} · Facturados ${Number(payload.synced || 0)} · Existentes ${Number(payload.skipped || 0)} · Fallidos ${Number(payload.failed || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "canceled") {
                          setStreamState((current) =>
                            current?.key === "orders"
                              ? { ...current, detail: "Sincronización de pedidos detenida.", stoppable: false }
                              : current
                          );
                          setMessage("Sincronización de pedidos detenida.");
                          return;
                        }
                        if (payload.type === "complete") {
                          setStreamState((current) =>
                            current?.key === "orders"
                              ? {
                                  ...current,
                                  progress: 100,
                                  detail: `Procesados ${Number(payload.processed || 0)} · Facturados ${Number(payload.synced || 0)} · Existentes ${Number(payload.skipped || 0)} · Fallidos ${Number(payload.failed || 0)}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(
                            `Pedidos listos. Procesados ${Number(payload.processed || 0)} · Facturados ${Number(payload.synced || 0)} · Existentes ${Number(payload.skipped || 0)} · Fallidos ${Number(payload.failed || 0)}`
                          );
                          return;
                        }
                        if (payload.type === "error") {
                          throw new Error(String(payload.error || "No se pudo sincronizar pedidos."));
                        }
                      },
                    }
                  )
                }
              >
                {loadingKey === "orders" ? "Procesando..." : "Sincronizar pedidos"}
              </button>
              {streamState?.key === "orders" && streamState.stoppable ? (
                <button className="btn ghost" type="button" onClick={() => void stopStreamAction("orders")}>
                  Detener
                </button>
              ) : null}
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setOrdersRange(defaultOrdersRange);
                  setInvoiceRange(defaultInvoiceRange);
                  setOrdersToAlegraOptions({
                    mode: effectiveSync.orders.shopifyToAlegra,
                    generateInvoice: activeConfig?.invoice?.generateInvoice ?? defaults.invoice.generateInvoice,
                    skipRules: false,
                  });
                }}
              >
                Limpiar
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={loadingKey === "invoices" || !invoicesToShopifyOptions.createShopifyOrder}
                onClick={() =>
                  void runStreamAction(
                    "invoices",
                    "Facturas Contable → E-commerce",
                    "/api/sync/invoices",
                    {
                      shopDomain: activeStore.providers.shopify?.shopDomain,
                      mode: invoicesToShopifyOptions.mode,
                      filters: {
                        dateStart: invoiceRange.dateStart || ordersRange.dateStart || undefined,
                        dateEnd: invoiceRange.dateEnd || ordersRange.dateEnd || undefined,
                        limit:
                          invoiceRange.limit || ordersRange.limit
                            ? Number(invoiceRange.limit || ordersRange.limit)
                            : undefined,
                        alegraInvoiceId: invoiceRange.alegraInvoiceId.trim() || undefined,
                      },
                    },
                    {
                      stoppable: true,
                      onPayload: (payload) => {
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "invoices"
                              ? {
                                  ...current,
                                  syncId: typeof payload.syncId === "string" ? payload.syncId : current.syncId,
                                  progress: 0,
                                  detail: `Preparando ${Number(payload.total || 0)} facturas...`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "progress") {
                          const total = Number(payload.total || 0);
                          const processed = Number(payload.processed || 0);
                          setStreamState((current) =>
                            current?.key === "invoices"
                              ? {
                                  ...current,
                                  syncId: typeof payload.syncId === "string" ? payload.syncId : current.syncId,
                                  progress: toPercent(processed, total),
                                  detail: `Procesadas ${processed}/${total || "?"} · Creadas ${Number(payload.created || 0)} · Omitidas ${Number(payload.skipped || 0)} · Fallidas ${Number(payload.failed || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "canceled") {
                          setStreamState((current) =>
                            current?.key === "invoices"
                              ? { ...current, detail: "Retorno de facturas detenido.", stoppable: false }
                              : current
                          );
                          setMessage("Retorno de facturas detenido.");
                          return;
                        }
                        if (payload.type === "complete") {
                          setStreamState((current) =>
                            current?.key === "invoices"
                              ? {
                                  ...current,
                                  progress: 100,
                                  detail: `Procesadas ${Number(payload.processed || 0)} · Creadas ${Number(payload.created || 0)} · Omitidas ${Number(payload.skipped || 0)} · Fallidas ${Number(payload.failed || 0)}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(
                            `Facturas listas. Procesadas ${Number(payload.processed || 0)} · Creadas ${Number(payload.created || 0)} · Omitidas ${Number(payload.skipped || 0)} · Fallidas ${Number(payload.failed || 0)}`
                          );
                          return;
                        }
                        if (payload.type === "error") {
                          throw new Error(String(payload.error || "No se pudo sincronizar facturas."));
                        }
                      },
                    }
                  )
                }
              >
                {loadingKey === "invoices"
                  ? "Procesando..."
                  : invoiceRange.alegraInvoiceId.trim()
                    ? "Crear pedido desde factura puntual"
                    : "Crear pedidos desde facturas"}
              </button>
              {streamState?.key === "invoices" && streamState.stoppable ? (
                <button className="btn ghost" type="button" onClick={() => void stopStreamAction("invoices")}>
                  Detener
                </button>
              ) : null}
              <button
                className="btn ghost"
                type="button"
                disabled={loadingKey === "invoices-backfill"}
                onClick={() =>
                  void runStreamAction(
                    "invoices-backfill",
                    "Carga histórica desde Contable",
                    "/api/backfill/orders",
                    {
                      source: "alegra",
                      shopDomain: activeStore.providers.shopify?.shopDomain,
                      dateStart: invoiceRange.dateStart || ordersRange.dateStart || undefined,
                      dateEnd: invoiceRange.dateEnd || ordersRange.dateEnd || undefined,
                      limit:
                        invoiceRange.limit || ordersRange.limit
                          ? Number(invoiceRange.limit || ordersRange.limit)
                          : undefined,
                    },
                    {
                      stoppable: true,
                      onPayload: (payload) => {
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "invoices-backfill"
                              ? {
                                  ...current,
                                  syncId: typeof payload.syncId === "string" ? payload.syncId : current.syncId,
                                  progress: 0,
                                  detail: "Leyendo facturas desde Contable...",
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "progress") {
                          const total = Number(payload.total || 0);
                          const processed = Number(payload.processed || 0);
                          setStreamState((current) =>
                            current?.key === "invoices-backfill"
                              ? {
                                  ...current,
                                  syncId: typeof payload.syncId === "string" ? payload.syncId : current.syncId,
                                  progress: toPercent(processed, total),
                                  detail: `Procesadas ${processed}/${total || "?"} · Páginas ${Number(payload.pages || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "canceled") {
                          setStreamState((current) =>
                            current?.key === "invoices-backfill"
                              ? { ...current, detail: "Carga histórica detenida.", stoppable: false }
                              : current
                          );
                          setMessage("Carga histórica de facturas detenida.");
                          return;
                        }
                        if (payload.type === "complete") {
                          const alegra = payload.alegra && typeof payload.alegra === "object" ? payload.alegra : null;
                          const processed = Number((alegra as { processed?: number } | null)?.processed || 0);
                          setStreamState((current) =>
                            current?.key === "invoices-backfill"
                              ? {
                                  ...current,
                                  progress: 100,
                                  detail: `Facturas cargadas desde Contable: ${processed}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(`Carga histórica lista. Facturas desde Contable: ${processed}`);
                          return;
                        }
                        if (payload.type === "error") {
                          throw new Error(String(payload.error || "No se pudo cargar desde Contable."));
                        }
                      },
                    }
                  )
                }
              >
                {loadingKey === "invoices-backfill" ? "Procesando..." : "Cargar desde Contable"}
              </button>
              {streamState?.key === "invoices-backfill" && streamState.stoppable ? (
                <button className="btn ghost" type="button" onClick={() => void stopStreamAction("invoices-backfill")}>
                  Detener
                </button>
              ) : null}
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setOrdersRange(defaultOrdersRange);
                  setInvoiceRange(defaultInvoiceRange);
                  setInvoicesToShopifyOptions({
                    createShopifyOrder: effectiveSync.orders.alegraToShopify !== "off",
                    mode: effectiveSync.orders.alegraToShopify === "active" ? "active" : "draft",
                  });
                }}
              >
                Limpiar retorno
              </button>
              <a className="btn ghost" href="/operations">
                Abrir mesa operativa
              </a>
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Productos Contable → E-commerce</strong>
            <span>Catálogo inicial o reproceso por fechas hacia Shopify</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <label className="store-config-field">
                <span>Fecha inicio</span>
                <input
                  className="input"
                  type="date"
                  value={productsRange.dateStart}
                  onChange={(event) => setProductsRange((current) => ({ ...current, dateStart: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Fecha fin</span>
                <input
                  className="input"
                  type="date"
                  value={productsRange.dateEnd}
                  onChange={(event) => setProductsRange((current) => ({ ...current, dateEnd: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Límite</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  placeholder="100"
                  value={productsRange.limit}
                  onChange={(event) => setProductsRange((current) => ({ ...current, limit: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>SKU / Barcode / referencia</span>
                <input
                  className="input"
                  value={productsRange.query}
                  placeholder="SKU-001 o 770123..."
                  onChange={(event) => setProductsRange((current) => ({ ...current, query: event.target.value }))}
                />
                <small>Búsqueda puntual o reintento sin recorrer todo el catálogo.</small>
              </label>
              <label className="store-config-field">
                <span>Concurrencia</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={10}
                  placeholder="5"
                  value={productsRange.batchSize}
                  onChange={(event) => setProductsRange((current) => ({ ...current, batchSize: event.target.value }))}
                />
                <small>Workers en paralelo para esta corrida.</small>
              </label>
            </div>
            <div className="store-configs-grid">
              <BooleanChoice
                label="Solo activos"
                value={productsToShopifyOptions.onlyActive}
                onChange={(next) => setProductsToShopifyOptions((current) => ({ ...current, onlyActive: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Solo con fotos"
                value={productsToShopifyOptions.onlyWithImages}
                onChange={(next) => setProductsToShopifyOptions((current) => ({ ...current, onlyWithImages: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Actualizar existentes"
                value={productsToShopifyOptions.updateExisting}
                onChange={(next) => setProductsToShopifyOptions((current) => ({ ...current, updateExisting: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Publicar en E-commerce"
                value={productsToShopifyOptions.publishOnSync}
                onChange={(next) => setProductsToShopifyOptions((current) => ({ ...current, publishOnSync: next }))}
                positive="Sí"
                negative="No"
              />
              <label className="store-config-field">
                <span>Estado al publicar</span>
                <select
                  className="input"
                  value={productsToShopifyOptions.publishStatus}
                  disabled={!productsToShopifyOptions.publishOnSync}
                  onChange={(event) =>
                    setProductsToShopifyOptions((current) => ({
                      ...current,
                      publishStatus: event.target.value === "active" ? "active" : "draft",
                    }))
                  }
                >
                  <option value="draft">Borrador</option>
                  <option value="active">Activo</option>
                </select>
              </label>
              <BooleanChoice
                label="Seguimiento de inventario"
                value={productsToShopifyOptions.trackInventory}
                onChange={(next) => setProductsToShopifyOptions((current) => ({ ...current, trackInventory: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Permitir sobreventa"
                value={productsToShopifyOptions.allowOversell}
                onChange={(next) => setProductsToShopifyOptions((current) => ({ ...current, allowOversell: next }))}
                positive="Sí"
                negative="No"
                disabled={!productsToShopifyOptions.trackInventory}
              />
              <BooleanChoice
                label="Publicar existencias"
                value={productsToShopifyOptions.includeInventory}
                onChange={(next) => setProductsToShopifyOptions((current) => ({ ...current, includeInventory: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Solo ya publicados"
                value={productsToShopifyOptions.onlyPublishedInShopify}
                onChange={(next) =>
                  setProductsToShopifyOptions((current) => ({ ...current, onlyPublishedInShopify: next }))
                }
                positive="Sí"
                negative="No"
                disabled={!productsToShopifyOptions.publishOnSync}
              />
              <div className="store-config-field store-config-field-span-2">
                <span>Bodegas para stock (masivo)</span>
                <small>Sin selección, usa las bodegas guardadas en la tienda.</small>
                <div className="store-warehouse-card">
                  <div className="store-warehouse-head">
                    <strong>{productsToShopifyWarehouseSummary}</strong>
                    <span>{`${warehouseItems.length} disponibles`}</span>
                  </div>
                  <div className="store-warehouse-grid">
                    {warehouseItems.length ? (
                      warehouseItems.map((warehouse) => {
                        const checked = productsToShopifyWarehouseIds.includes(warehouse.id);
                        return (
                          <label className="store-warehouse-option" key={`sync-${warehouse.id}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setProductsToShopifyWarehouseIds((current) => {
                                  const next = new Set(current);
                                  if (event.target.checked) next.add(warehouse.id);
                                  else next.delete(warehouse.id);
                                  return Array.from(next).sort((left, right) => left.localeCompare(right, "es"));
                                })
                              }
                            />
                            <span>{warehouse.name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="connection-inline-note">Sin bodegas disponibles para esta tienda.</p>
                    )}
                  </div>
                  <div className="connection-card-actions">
                    <button
                      className="btn ghost btn-compact"
                      type="button"
                      onClick={() => setProductsToShopifyWarehouseIds(warehouseItems.map((item) => item.id))}
                    >
                      Seleccionar todas
                    </button>
                    <button
                      className="btn ghost btn-compact"
                      type="button"
                      onClick={() => setProductsToShopifyWarehouseIds([])}
                    >
                      Usar configuración guardada
                    </button>
                  </div>
                </div>
              </div>
              <label className="store-config-field">
                <span>Fecha ajustes</span>
                <input
                  className="input"
                  type="date"
                  value={inventoryAdjustmentsForm.date}
                  onChange={(event) =>
                    setInventoryAdjustmentsForm((current) => ({ ...current, date: event.target.value }))
                  }
                />
                <small>Déjalo vacío para usar la fecha de hoy.</small>
              </label>
              <label className="store-config-field">
                <span>Inicio manual</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={inventoryAdjustmentsForm.start}
                  onChange={(event) =>
                    setInventoryAdjustmentsForm((current) => ({ ...current, start: event.target.value }))
                  }
                />
                <small>Para retomar una página concreta.</small>
              </label>
              <label className="store-config-field">
                <span>Límite manual</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  placeholder="30"
                  value={inventoryAdjustmentsForm.limit}
                  onChange={(event) =>
                    setInventoryAdjustmentsForm((current) => ({ ...current, limit: event.target.value }))
                  }
                />
              </label>
              <BooleanChoice
                label="Auto-publicar en esta corrida"
                value={inventoryAdjustmentsForm.autoPublish}
                onChange={(next) => setInventoryAdjustmentsForm((current) => ({ ...current, autoPublish: next }))}
                positive="Sí"
                negative="No"
                help="Sobreescribe el worker para esta ejecución."
              />
            </div>
            <div className="connection-card-actions">
              <button
                className="btn primary"
                type="button"
                disabled={loadingKey === "products-to-shopify"}
                onClick={() =>
                  void runStreamAction(
                    "products-to-shopify",
                    "Productos Contable → E-commerce",
                    "/api/sync/products",
                    {
                      shopDomain: activeStore.providers.shopify?.shopDomain,
                      mode:
                        productsRange.dateStart ||
                        productsRange.dateEnd ||
                        productsRange.limit ||
                        productsRange.query.trim()
                          ? "filtered"
                          : "full",
                      batchSize: productsRange.batchSize ? Number(productsRange.batchSize) : undefined,
                      filters: {
                        dateStart: productsRange.dateStart || undefined,
                        dateEnd: productsRange.dateEnd || undefined,
                        limit: productsRange.limit ? Number(productsRange.limit) : undefined,
                        query: productsRange.query.trim() || undefined,
                        onlyActive: productsToShopifyOptions.onlyActive,
                        onlyWithImages: productsToShopifyOptions.onlyWithImages,
                        includeInventory: productsToShopifyOptions.includeInventory,
                        warehouseIds: productsToShopifyWarehouseIds.length
                          ? productsToShopifyWarehouseIds
                          : effectiveRules.warehouseIds,
                      },
                      settings: {
                        publishOnSync: productsToShopifyOptions.publishOnSync,
                        updateExisting: productsToShopifyOptions.updateExisting,
                        trackInventory: productsToShopifyOptions.trackInventory,
                        allowOversell: productsToShopifyOptions.allowOversell,
                        status: productsToShopifyOptions.publishStatus,
                        includeImages: productsToShopifyOptions.onlyWithImages,
                        onlyPublishedInShopify: productsToShopifyOptions.onlyPublishedInShopify,
                      },
                    },
                    {
                      stoppable: true,
                      onPayload: (payload) => {
                        const syncId = typeof payload.syncId === "string" ? payload.syncId : undefined;
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "products-to-shopify"
                              ? {
                                  ...current,
                                  syncId,
                                  progress: 0,
                                  detail: `Preparando ${Number(payload.total || 0)} items...`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "progress") {
                          const total = Number(payload.total || 0);
                          const processed = Number(payload.processed || 0);
                          const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
                          setStreamState((current) =>
                            current?.key === "products-to-shopify"
                              ? {
                                  ...current,
                                  syncId: syncId || current.syncId,
                                  progress: percent,
                                  detail: `Procesados ${processed}/${total || "?"} · Publicados ${Number(payload.published || 0)} · Actualizados ${Number(payload.updated || 0)} · Fallidos ${Number(payload.failed || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "rate_limit") {
                          setStreamState((current) =>
                            current?.key === "products-to-shopify"
                              ? {
                                  ...current,
                                  detail: `Esperando límite de Contable... reintento ${Number(payload.retries || 0)} en ${Math.round(
                                    Number(payload.waitMs || 0) / 1000
                                  )}s`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "batch_start") {
                          setStreamState((current) =>
                            current?.key === "products-to-shopify"
                              ? {
                                  ...current,
                                  detail: `Batch ${Number(payload.batchNumber || 0)}/${
                                    Number(payload.totalBatches || 0) || "?"
                                  } · Items ${Number(payload.rangeStart || 0)}-${Number(payload.rangeEnd || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "batch_error") {
                          setStreamState((current) =>
                            current?.key === "products-to-shopify"
                              ? {
                                  ...current,
                                  detail: `Batch con error HTTP ${Number(payload.status || 0)}. Reintentando siguiente tramo...`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "canceled") {
                          setStreamState((current) =>
                            current?.key === "products-to-shopify"
                              ? {
                                  ...current,
                                  progress: current.progress,
                                  detail: "Sincronizador detenido.",
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage("Sincronizador de productos detenido.");
                          return;
                        }
                        if (payload.type === "complete") {
                          const inventoryAdjustments =
                            payload.inventoryAdjustments && typeof payload.inventoryAdjustments === "object"
                              ? (payload.inventoryAdjustments as {
                                  skipped?: boolean;
                                  reason?: string;
                                  adjusted?: number;
                                })
                              : null;
                          const inventoryDetail = inventoryAdjustments
                            ? inventoryAdjustments.skipped
                              ? inventoryAdjustments.reason === "include_inventory_off"
                                ? " · Inventario omitido por configuración"
                                : inventoryAdjustments.reason === "publish_off"
                                  ? " · Inventario omitido porque publicar está apagado"
                                  : ""
                              : typeof inventoryAdjustments.adjusted === "number"
                                ? ` · Ajustes de inventario ${inventoryAdjustments.adjusted}`
                                : ""
                            : "";
                          setStreamState((current) =>
                            current?.key === "products-to-shopify"
                              ? {
                                  ...current,
                                  progress: 100,
                                  detail: `Procesados ${Number(payload.processed || 0)} · Publicados ${Number(payload.published || 0)} · Actualizados ${Number(payload.updated || 0)} · Fallidos ${Number(payload.failed || 0)}${inventoryDetail}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(
                            `Productos Shopify listos. Procesados ${Number(payload.processed || 0)} · Publicados ${Number(payload.published || 0)} · Actualizados ${Number(payload.updated || 0)} · Fallidos ${Number(payload.failed || 0)}${inventoryDetail}`
                          );
                          return;
                        }
                        if (payload.type === "error") {
                          throw new Error(String(payload.error || "No se pudo sincronizar productos."));
                        }
                      },
                    }
                  )
                }
              >
                {loadingKey === "products-to-shopify" ? "Procesando..." : "Sincronizar productos"}
              </button>
              {streamState?.key === "products-to-shopify" && streamState.stoppable ? (
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => void stopStreamAction("products-to-shopify")}
                >
                  Detener
                </button>
              ) : null}
              <button
                className="btn ghost"
                type="button"
                disabled={loadingKey === "inventory-adjustments"}
                onClick={() =>
                  void runStreamAction(
                    "inventory-adjustments",
                    "Ajustes de inventario",
                    "/api/sync/inventory-adjustments",
                    {
                      shopDomain: activeStore.providers.shopify?.shopDomain,
                      autoPublish: inventoryAdjustmentsForm.autoPublish,
                      date: inventoryAdjustmentsForm.date || undefined,
                      start: inventoryAdjustmentsForm.start ? Number(inventoryAdjustmentsForm.start) : undefined,
                      limit: inventoryAdjustmentsForm.limit ? Number(inventoryAdjustmentsForm.limit) : undefined,
                    },
                    {
                      stoppable: true,
                      onPayload: (payload) => {
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "inventory-adjustments"
                              ? { ...current, progress: 0, detail: "Preparando lectura de ajustes..." }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "adjustments_page") {
                          setStreamState((current) =>
                            current?.key === "inventory-adjustments"
                              ? {
                                  ...current,
                                  detail: `Leyendo ajustes · Inicio ${Number(payload.start || 0)} · Página ${Number(
                                    payload.fetched || 0
                                  )} · Acumulados ${Number(payload.loaded || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "adjustments_loaded") {
                          const totalItems = Number(payload.itemCount || 0);
                          setStreamState((current) =>
                            current?.key === "inventory-adjustments"
                              ? {
                                  ...current,
                                  progress: totalItems > 0 && payload.autoPublish === false ? 100 : 0,
                                  detail:
                                    payload.autoPublish === false
                                      ? `Ajustes ${Number(payload.adjustmentsCount || 0)} · Items ${totalItems} · Publicación manual desactivada`
                                      : `Ajustes ${Number(payload.adjustmentsCount || 0)} · Items ${totalItems} listos para publicar`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "publish_batch") {
                          const processed = Number(payload.processed || 0);
                          const total = Number(payload.total || 0);
                          setStreamState((current) =>
                            current?.key === "inventory-adjustments"
                              ? {
                                  ...current,
                                  progress: total > 0 ? toPercent(processed, total) : current.progress,
                                  detail: `Publicados ${Number(payload.synced || 0)} · Fallidos ${Number(
                                    payload.failed || 0
                                  )} · Procesados ${processed}/${total || "?"}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "complete") {
                          setStreamState((current) =>
                            current?.key === "inventory-adjustments"
                              ? {
                                  ...current,
                                  progress: 100,
                                  detail: `Ajustes ${Number(payload.adjustmentsCount || 0)} · Items ${Number(
                                    payload.itemCount || 0
                                  )} · Publicados ${Number(payload.synced || 0)} · Fallidos ${Number(
                                    payload.failed || 0
                                  )}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(
                            `Inventario listo. Ajustes ${Number(payload.adjustmentsCount || 0)} · Items ${Number(
                              payload.itemCount || 0
                            )} · Publicados ${Number(payload.synced || 0)} · Fallidos ${Number(payload.failed || 0)}`
                          );
                          return;
                        }
                        if (payload.type === "error") {
                          throw new Error(String(payload.error || "No se pudo ejecutar ajustes de inventario."));
                        }
                      },
                    }
                  )
                }
              >
                {loadingKey === "inventory-adjustments" ? "Procesando..." : "Ajustes de inventario ahora"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setProductsRange(defaultProductsSyncRange);
                  setProductsToShopifyOptions({
                    onlyActive: effectiveRules.onlyActiveItems,
                    onlyWithImages: effectiveRules.includeImages,
                    updateExisting: effectiveRules.updateInShopify,
                    publishOnSync: effectiveRules.createInShopify || effectiveRules.updateInShopify,
                    publishStatus: effectiveRules.autoPublishStatus,
                    trackInventory: effectiveRules.trackInventory,
                    allowOversell: effectiveRules.allowOversell,
                    includeInventory: effectiveRules.publishOnStock,
                    onlyPublishedInShopify: false,
                  });
                  setProductsToShopifyWarehouseIds([]);
                  setInventoryAdjustmentsForm(
                    defaultInventoryAdjustmentsForm(effectiveRules.inventoryAdjustmentsAutoPublish)
                  );
                }}
              >
                Limpiar corrida
              </button>
              <a className="btn ghost" href="/products">
                Abrir catálogo operativo
              </a>
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Productos E-commerce → Contable</strong>
            <span>Reproceso por fechas desde Shopify hacia Alegra</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <label className="store-config-field">
                <span>Fecha inicio</span>
                <input
                  className="input"
                  type="date"
                  value={productsBackRange.dateStart}
                  onChange={(event) =>
                    setProductsBackRange((current) => ({ ...current, dateStart: event.target.value }))
                  }
                />
              </label>
              <label className="store-config-field">
                <span>Fecha fin</span>
                <input
                  className="input"
                  type="date"
                  value={productsBackRange.dateEnd}
                  onChange={(event) => setProductsBackRange((current) => ({ ...current, dateEnd: event.target.value }))}
                />
              </label>
              <label className="store-config-field">
                <span>Límite</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  placeholder="100"
                  value={productsBackRange.limit}
                  onChange={(event) => setProductsBackRange((current) => ({ ...current, limit: event.target.value }))}
                />
              </label>
            </div>
            <div className="store-configs-grid">
              <BooleanChoice
                label="Crear nuevos en Contable"
                value={productsToAlegraOptions.createInAlegra}
                onChange={(next) => setProductsToAlegraOptions((current) => ({ ...current, createInAlegra: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Actualizar existentes"
                value={productsToAlegraOptions.updateInAlegra}
                onChange={(next) => setProductsToAlegraOptions((current) => ({ ...current, updateInAlegra: next }))}
                positive="Sí"
                negative="No"
              />
              <BooleanChoice
                label="Incluir inventario"
                value={productsToAlegraOptions.includeInventory}
                onChange={(next) => setProductsToAlegraOptions((current) => ({ ...current, includeInventory: next }))}
                positive="Sí"
                negative="No"
              />
              <label className="store-config-field">
                <span>Prioridad de identificación</span>
                <select
                  className="input"
                  value={productsToAlegraOptions.matchPriority}
                  onChange={(event) =>
                    setProductsToAlegraOptions((current) => ({
                      ...current,
                      matchPriority: event.target.value === "barcode_sku" ? "barcode_sku" : "sku_barcode",
                    }))
                  }
                >
                  <option value="sku_barcode">SKU → Barcode</option>
                  <option value="barcode_sku">Barcode → SKU</option>
                </select>
              </label>
              <label className="store-config-field">
                <span>Bodega destino</span>
                <select
                  className="input"
                  value={productsToAlegraOptions.warehouseId}
                  disabled={!productsToAlegraOptions.includeInventory}
                  onChange={(event) =>
                    setProductsToAlegraOptions((current) => ({ ...current, warehouseId: event.target.value }))
                  }
                >
                  <option value="">Seleccionar...</option>
                  {warehouseItems.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                <small>Obligatoria si incluyes inventario.</small>
              </label>
            </div>
            <div className="connection-card-actions">
              <button
                className="btn primary"
                type="button"
                disabled={loadingKey === "products-to-alegra" || !activeStore.providers.shopify?.shopDomain}
                onClick={() =>
                  void runStreamAction(
                    "products-to-alegra",
                    "Productos E-commerce → Contable",
                    "/api/sync/products/shopify-to-alegra",
                    {
                      shopDomain: activeStore.providers.shopify?.shopDomain || "",
                      filters: {
                        dateStart: productsBackRange.dateStart || undefined,
                        dateEnd: productsBackRange.dateEnd || undefined,
                        limit: productsBackRange.limit ? Number(productsBackRange.limit) : undefined,
                      },
                      settings: {
                        createInAlegra: productsToAlegraOptions.createInAlegra,
                        updateInAlegra: productsToAlegraOptions.updateInAlegra,
                        includeInventory: productsToAlegraOptions.includeInventory,
                        warehouseId: productsToAlegraOptions.warehouseId || undefined,
                        matchPriority: productsToAlegraOptions.matchPriority,
                      },
                    },
                    {
                      stoppable: true,
                      onPayload: (payload) => {
                        const syncId = typeof payload.syncId === "string" ? payload.syncId : undefined;
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "products-to-alegra"
                              ? {
                                  ...current,
                                  syncId,
                                  progress: 0,
                                  detail: `Preparando ${Number(payload.totalVariants || 0)} variantes...`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "progress") {
                          const total = Number(payload.totalVariants || 0);
                          const processed = Number(payload.processed || 0);
                          const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
                          setStreamState((current) =>
                            current?.key === "products-to-alegra"
                              ? {
                                  ...current,
                                  syncId: syncId || current.syncId,
                                  progress: percent,
                                  detail: `Procesados ${processed}/${total || "?"} · Creados ${Number(payload.created || 0)} · Actualizados ${Number(payload.updated || 0)} · Fallidos ${Number(payload.failed || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "canceled") {
                          setStreamState((current) =>
                            current?.key === "products-to-alegra"
                              ? { ...current, detail: "Sincronizador detenido.", stoppable: false }
                              : current
                          );
                          setMessage("Sincronizador Shopify → Alegra detenido.");
                          return;
                        }
                        if (payload.type === "done" || payload.type === "summary") {
                          const total = Number(payload.totalVariants || payload.processed || 0);
                          const processed = Number(payload.processed || 0);
                          const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 100;
                          setStreamState((current) =>
                            current?.key === "products-to-alegra"
                              ? {
                                  ...current,
                                  progress: percent,
                                  detail: `Procesados ${processed}/${total || "?"} · Creados ${Number(payload.created || 0)} · Actualizados ${Number(payload.updated || 0)} · Fallidos ${Number(payload.failed || 0)}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(
                            `Productos a Contable listos. Procesados ${processed} · Creados ${Number(payload.created || 0)} · Actualizados ${Number(payload.updated || 0)} · Fallidos ${Number(payload.failed || 0)}`
                          );
                          return;
                        }
                        if (payload.type === "error") {
                          throw new Error(String(payload.error || "No se pudo sincronizar a Contable."));
                        }
                      },
                    }
                  )
                }
              >
                {loadingKey === "products-to-alegra" ? "Procesando..." : "Sincronizar a Contable"}
              </button>
              {streamState?.key === "products-to-alegra" && streamState.stoppable ? (
                <button className="btn ghost" type="button" onClick={() => void stopStreamAction("products-to-alegra")}>
                  Detener
                </button>
              ) : null}
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setProductsBackRange(defaultRange);
                  setProductsToAlegraOptions({
                    createInAlegra: effectiveSync.products.createInAlegra,
                    updateInAlegra: effectiveSync.products.updateInAlegra,
                    includeInventory: effectiveSync.products.includeInventory,
                    matchPriority: effectiveSync.products.matchPriority,
                    warehouseId: effectiveSync.products.warehouseId,
                  });
                }}
              >
                Limpiar corrida
              </button>
              <a className="btn ghost" href="/products">
                Abrir catálogo operativo
              </a>
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Carga histórica de catálogo</strong>
            <span>Carga inicial de catálogo desde Contable o E-commerce</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <label className="store-config-field">
                <span>Origen</span>
                <select
                  className="input"
                  value={productsCatalogRange.source}
                  onChange={(event) =>
                    setProductsCatalogRange((current) => ({
                      ...current,
                      source:
                        event.target.value === "shopify" || event.target.value === "alegra"
                          ? event.target.value
                          : "both",
                    }))
                  }
                >
                  <option value="both">Ambos</option>
                  <option value="alegra">Contable</option>
                  <option value="shopify">E-commerce</option>
                </select>
              </label>
              <label className="store-config-field">
                <span>Fecha inicio</span>
                <input
                  className="input"
                  type="date"
                  value={productsCatalogRange.dateStart}
                  onChange={(event) =>
                    setProductsCatalogRange((current) => ({ ...current, dateStart: event.target.value }))
                  }
                />
              </label>
              <label className="store-config-field">
                <span>Fecha fin</span>
                <input
                  className="input"
                  type="date"
                  value={productsCatalogRange.dateEnd}
                  onChange={(event) =>
                    setProductsCatalogRange((current) => ({ ...current, dateEnd: event.target.value }))
                  }
                />
              </label>
              <label className="store-config-field">
                <span>Límite</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  placeholder="200"
                  value={productsCatalogRange.limit}
                  onChange={(event) =>
                    setProductsCatalogRange((current) => ({ ...current, limit: event.target.value }))
                  }
                />
              </label>
              <label className="store-config-field">
                <span>Estado Contable</span>
                <select
                  className="input"
                  value={productsCatalogRange.alegraStatus}
                  onChange={(event) =>
                    setProductsCatalogRange((current) => ({
                      ...current,
                      alegraStatus:
                        event.target.value === "active" || event.target.value === "inactive" ? event.target.value : "",
                    }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </label>
              <label className="store-config-field">
                <span>Lectura desde caché</span>
                <select
                  className="input"
                  value={productsCatalogRange.useCache ? "yes" : "no"}
                  onChange={(event) =>
                    setProductsCatalogRange((current) => ({
                      ...current,
                      useCache: event.target.value !== "no",
                    }))
                  }
                >
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="store-config-field">
                <span>Solo publicados en E-commerce</span>
                <select
                  className="input"
                  value={productsCatalogRange.shopifyPublishedOnly ? "yes" : "no"}
                  onChange={(event) =>
                    setProductsCatalogRange((current) => ({
                      ...current,
                      shopifyPublishedOnly: event.target.value !== "no",
                    }))
                  }
                >
                  <option value="no">No</option>
                  <option value="yes">Sí</option>
                </select>
              </label>
            </div>
            <div className="connection-card-actions">
              <button
                className="btn primary"
                type="button"
                disabled={loadingKey === "products-backfill"}
                onClick={() =>
                  void runStreamAction(
                    "products-backfill",
                    "Carga histórica de catálogo",
                    "/api/backfill/products",
                    {
                      source: productsCatalogRange.source,
                      shopDomain: activeStore.providers.shopify?.shopDomain,
                      dateStart: productsCatalogRange.dateStart || undefined,
                      dateEnd: productsCatalogRange.dateEnd || undefined,
                      limit: productsCatalogRange.limit ? Number(productsCatalogRange.limit) : undefined,
                      alegraStatus: productsCatalogRange.alegraStatus || undefined,
                      useCache: productsCatalogRange.useCache,
                      shopifyPublishedOnly: productsCatalogRange.shopifyPublishedOnly,
                    },
                    {
                      stoppable: true,
                      onPayload: (payload) => {
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "products-backfill"
                              ? {
                                  ...current,
                                  syncId: typeof payload.syncId === "string" ? payload.syncId : current.syncId,
                                  progress: 0,
                                  detail: "Preparando carga histórica...",
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "progress") {
                          const processed = Number(payload.processed || 0);
                          const total = Number(payload.total || 0);
                          setStreamState((current) =>
                            current?.key === "products-backfill"
                              ? {
                                  ...current,
                                  syncId: typeof payload.syncId === "string" ? payload.syncId : current.syncId,
                                  progress: total > 0 ? toPercent(processed, total) : current.progress,
                                  detail: `${String(payload.source || "origen")} · Procesados ${processed}/${total || "?"} · Páginas ${Number(payload.pages || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "canceled") {
                          setStreamState((current) =>
                            current?.key === "products-backfill"
                              ? { ...current, detail: "Carga histórica detenida.", stoppable: false }
                              : current
                          );
                          setMessage("Carga histórica de catálogo detenida.");
                          return;
                        }
                        if (payload.type === "complete") {
                          const alegra =
                            payload.results && typeof payload.results === "object"
                              ? ((
                                  payload.results as {
                                    alegra?: { processed?: number };
                                    shopify?: { processed?: number };
                                  }
                                ).alegra ?? null)
                              : null;
                          const shopify =
                            payload.results && typeof payload.results === "object"
                              ? ((
                                  payload.results as {
                                    alegra?: { processed?: number };
                                    shopify?: { processed?: number };
                                  }
                                ).shopify ?? null)
                              : null;
                          setStreamState((current) =>
                            current?.key === "products-backfill"
                              ? {
                                  ...current,
                                  progress: 100,
                                  detail: `Contable ${Number(alegra?.processed || 0)} · E-commerce ${Number(shopify?.processed || 0)}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(
                            `Catálogo base listo. Contable ${Number(alegra?.processed || 0)} · E-commerce ${Number(shopify?.processed || 0)}`
                          );
                          return;
                        }
                        if (payload.type === "error") {
                          throw new Error(String(payload.error || "No se pudo cargar catálogo base."));
                        }
                      },
                    }
                  )
                }
              >
                {loadingKey === "products-backfill" ? "Cargando..." : "Cargar catálogo base"}
              </button>
              {streamState?.key === "products-backfill" && streamState.stoppable ? (
                <button className="btn ghost" type="button" onClick={() => void stopStreamAction("products-backfill")}>
                  Detener
                </button>
              ) : null}
            </div>
          </div>
        </details>

        <details className="settings-collapsible store-config-field-span-2" open>
          <summary className="settings-collapsible-summary">
            <strong>Imágenes de producto</strong>
            <span>Carga o reemplaza imágenes por SKU o código de barras</span>
          </summary>
          <div className="settings-subsection">
            <div className="store-configs-grid">
              <label className="store-config-field">
                <span>Archivo CSV</span>
                <input
                  className="input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void loadProductImagesFile(file).catch((error) => {
                      setProductImageErrors([]);
                      setMessage(error instanceof Error ? error.message : "No se pudo leer el CSV.");
                    });
                    event.currentTarget.value = "";
                  }}
                />
                <small>
                  Columnas sugeridas: <code>sku</code> o <code>barcode</code> y <code>images</code>. También acepta{" "}
                  <code>image_1</code>, <code>image_2</code>...
                </small>
              </label>
              <label className="store-config-field">
                <span>Buscar por</span>
                <select
                  className="input"
                  value={productImagesForm.matchBy}
                  onChange={(event) =>
                    setProductImagesForm((current) => ({
                      ...current,
                      matchBy: event.target.value === "barcode" ? "barcode" : "sku",
                    }))
                  }
                >
                  <option value="sku">SKU</option>
                  <option value="barcode">Código de barras</option>
                </select>
              </label>
              <label className="store-config-field">
                <span>Modo</span>
                <select
                  className="input"
                  value={productImagesForm.mode}
                  onChange={(event) =>
                    setProductImagesForm((current) => ({
                      ...current,
                      mode: event.target.value === "replace" ? "replace" : "append",
                    }))
                  }
                >
                  <option value="append">Agregar</option>
                  <option value="replace">Reemplazar</option>
                </select>
              </label>
              <label className="store-config-field">
                <span>Publicar al cargar</span>
                <select
                  className="input"
                  value={productImagesForm.publishEnabled ? productImagesForm.publishStatus : "off"}
                  onChange={(event) =>
                    setProductImagesForm((current) => ({
                      ...current,
                      publishEnabled: event.target.value !== "off",
                      publishStatus: event.target.value === "active" ? "active" : "draft",
                    }))
                  }
                >
                  <option value="off">No publicar</option>
                  <option value="draft">Publicar como borrador</option>
                  <option value="active">Publicar como activo</option>
                </select>
              </label>
              <label className="store-config-field">
                <span>Aplicar a variante</span>
                <select
                  className="input"
                  value={productImagesForm.attachVariant ? "yes" : "no"}
                  onChange={(event) =>
                    setProductImagesForm((current) => ({
                      ...current,
                      attachVariant: event.target.value !== "no",
                    }))
                  }
                >
                  <option value="yes">Sí</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="store-config-field">
                <span>Modo seguro</span>
                <select
                  className="input"
                  value={productImagesForm.dryRun ? "dry" : "real"}
                  onChange={(event) =>
                    setProductImagesForm((current) => ({
                      ...current,
                      dryRun: event.target.value === "dry",
                    }))
                  }
                >
                  <option value="real">Ejecutar cambios</option>
                  <option value="dry">Simular primero</option>
                </select>
              </label>
              <label className="store-config-field store-config-field-span-2">
                <span>Filas</span>
                <textarea
                  className="textarea-control"
                  rows={8}
                  value={productImagesForm.rowsText}
                  placeholder="SKU-001|https://cdn.ejemplo.com/1.jpg,https://cdn.ejemplo.com/2.jpg|Portada producto"
                  onChange={(event) =>
                    setProductImagesForm((current) => ({ ...current, rowsText: event.target.value }))
                  }
                />
                <small>identificador | url1,url2 | alt (opcional)</small>
              </label>
            </div>
            <div className="page-module-actions compact-pills">
              <span className="pill">Máximo 500 filas</span>
              <span className="pill">Hasta 10 URLs por fila</span>
              <span className="pill">{parseProductImageRows(productImagesForm.rowsText).length} filas válidas</span>
            </div>
            <div className="connection-card-actions">
              <button className="btn ghost" type="button" onClick={downloadProductImagesTemplate}>
                Descargar plantilla
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={downloadProductImagesErrors}
                disabled={!productImageErrors.length}
              >
                Descargar errores
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => {
                  setProductImagesForm(defaultProductImagesForm);
                  setProductImageErrors([]);
                }}
              >
                Limpiar
              </button>
              <button
                className="btn primary"
                type="button"
                disabled={loadingKey === "product-images" || !activeStore.providers.shopify?.shopDomain}
                onClick={() => {
                  const rows = parseProductImageRows(productImagesForm.rowsText);
                  if (!rows.length) {
                    setMessage("No hay filas válidas para cargar imágenes.");
                    return;
                  }
                  if (productImagesForm.mode === "replace") {
                    const confirmed = window.confirm(
                      "Modo Reemplazar elimina fotos existentes antes de subir las nuevas. ¿Seguro?"
                    );
                    if (!confirmed) return;
                  }
                  if (productImagesForm.publishEnabled) {
                    const confirmed = window.confirm(
                      `Cambiar estado del producto está activo. ¿Seguro que quieres forzar estado = ${productImagesForm.publishStatus}?`
                    );
                    if (!confirmed) return;
                  }
                  setProductImageErrors([]);
                  void runStreamAction(
                    "product-images",
                    "Imágenes de producto",
                    "/api/sync/product-images",
                    {
                      shopDomain: activeStore.providers.shopify?.shopDomain || "",
                      matchBy: productImagesForm.matchBy,
                      attachVariant: productImagesForm.attachVariant,
                      mode: productImagesForm.mode,
                      publishEnabled: productImagesForm.publishEnabled,
                      publishStatus: productImagesForm.publishStatus,
                      dryRun: productImagesForm.dryRun,
                      rows,
                    },
                    {
                      stoppable: true,
                      onPayload: (payload) => {
                        const syncId = typeof payload.syncId === "string" ? payload.syncId : undefined;
                        if (payload.type === "start") {
                          setStreamState((current) =>
                            current?.key === "product-images"
                              ? {
                                  ...current,
                                  syncId,
                                  progress: 0,
                                  detail: `Preparando ${Number(payload.total || 0)} filas...`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "progress") {
                          const total = Number(payload.total || 0);
                          const processed = Number(payload.processed || 0);
                          setStreamState((current) =>
                            current?.key === "product-images"
                              ? {
                                  ...current,
                                  syncId: syncId || current.syncId,
                                  progress: toPercent(processed, total),
                                  detail: `Procesadas ${processed}/${total || "?"} · Encontradas ${Number(payload.matched || 0)} · Fotos ${Number(payload.imagesUploaded || 0)} · Omitidas ${Number(payload.skipped || 0)} · Fallidas ${Number(payload.failed || 0)}`,
                                }
                              : current
                          );
                          return;
                        }
                        if (payload.type === "stopped") {
                          setStreamState((current) =>
                            current?.key === "product-images"
                              ? { ...current, detail: "Carga de imágenes detenida.", stoppable: false }
                              : current
                          );
                          setMessage("Carga de imágenes detenida.");
                          return;
                        }
                        if (payload.type === "done") {
                          setStreamState((current) =>
                            current?.key === "product-images"
                              ? {
                                  ...current,
                                  progress: 100,
                                  detail: `Procesadas ${Number(payload.processed || 0)} · Encontradas ${Number(payload.matched || 0)} · Fotos ${Number(payload.imagesUploaded || 0)} · Omitidas ${Number(payload.skipped || 0)} · Fallidas ${Number(payload.failed || 0)}`,
                                  stoppable: false,
                                }
                              : current
                          );
                          setMessage(String(payload.message || "Carga de imágenes completada."));
                          return;
                        }
                        if (payload.type === "row_error") {
                          const rowError = String(payload.message || "").trim();
                          if (rowError) {
                            setProductImageErrors((current) => [...current, rowError].slice(0, 200));
                          }
                          setStreamState((current) =>
                            current?.key === "product-images"
                              ? { ...current, detail: rowError || current.detail }
                              : current
                          );
                        }
                      },
                    }
                  );
                }}
              >
                {loadingKey === "product-images" ? "Procesando..." : "Sincronizar imágenes"}
              </button>
              {streamState?.key === "product-images" && streamState.stoppable ? (
                <button className="btn ghost" type="button" onClick={() => void stopStreamAction("product-images")}>
                  Detener
                </button>
              ) : null}
            </div>
            <pre className="sync-error-log">
              {productImageErrors.length ? productImageErrors.slice(0, 60).join("\n") : "Sin errores."}
            </pre>
          </div>
        </details>
      </div>

      {streamState ? (
        <section className="page-module-shell page-module-shell-compact">
          <div className="page-module-head">
            <div>
              <strong>{streamState.title}</strong>
              <span>{streamState.detail}</span>
            </div>
            <span className="pill">{streamState.progress}%</span>
          </div>
          <div className="sync-progress-bar" aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(100, streamState.progress))}%` }} />
          </div>
        </section>
      ) : null}

      {message ? <p className="connection-inline-note">{message}</p> : null}
    </section>
  );
}
