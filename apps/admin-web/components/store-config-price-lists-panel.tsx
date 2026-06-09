"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionsWorkspace, CriticalStoreConfig, WorkspaceStore } from "../lib/connections-workspace";
import { saveStoreConfig } from "../lib/api";

type PriceListDraft = CriticalStoreConfig["priceLists"];

type PriceListOption = {
  id: string;
  name: string;
};

const defaultDraft: PriceListDraft = {
  generalId: "",
  discountId: "",
  wholesaleId: "",
  currency: "",
};

function isDraftEqual(left: PriceListDraft, right: PriceListDraft) {
  return (
    left.generalId === right.generalId &&
    left.discountId === right.discountId &&
    left.wholesaleId === right.wholesaleId &&
    left.currency === right.currency
  );
}

function normalizeOptions(
  items: Array<{ id?: string | number; _id?: string | number; name?: string; value?: string | number }>
): PriceListOption[] {
  return items
    .map((item) => ({
      id: String(item.id || item._id || item.value || "").trim(),
      name: String(item.name || item.id || item._id || item.value || "").trim(),
    }))
    .filter((item) => item.id)
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}

export function StoreConfigPriceListsPanel({
  stores,
  storeConfigs,
  defaults,
  activeStoreId,
  onStoreConfigSaved,
}: {
  stores: WorkspaceStore[];
  storeConfigs: CriticalStoreConfig[];
  defaults: ConnectionsWorkspace["storeConfigDefaults"];
  activeStoreId: number | null;
  onStoreConfigSaved: (nextConfig: CriticalStoreConfig) => void;
}) {
  const [draft, setDraft] = useState<PriceListDraft>(defaultDraft);
  const [catalog, setCatalog] = useState<PriceListOption[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  const activeStore = useMemo(
    () => stores.find((store) => store.id === activeStoreId) ?? null,
    [activeStoreId, stores]
  );
  const activeConfig = useMemo(
    () => storeConfigs.find((config) => config.storeId === activeStoreId) ?? null,
    [activeStoreId, storeConfigs]
  );
  const baseDraft = defaults.priceLists;
  const shopDomain = activeConfig?.shopDomain ?? activeStore?.providers.shopify?.shopDomain ?? "";

  useEffect(() => {
    setDraft(activeConfig?.priceLists ?? baseDraft);
    setSaveState("idle");
    setSaveMessage("");
  }, [activeConfig, baseDraft]);

  const dirty = useMemo(
    () => !isDraftEqual(draft, activeConfig?.priceLists ?? baseDraft),
    [activeConfig?.priceLists, baseDraft, draft]
  );

  useEffect(() => {
    if (!shopDomain) {
      setCatalog([]);
      return;
    }
    let cancelled = false;
    setLoadingCatalog(true);
    fetch(`/api/alegra/price-lists?shopDomain=${encodeURIComponent(shopDomain)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          items?: Array<{ id?: string | number; _id?: string | number; name?: string; value?: string | number }>;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || `price_lists_failed:${response.status}`);
        }
        if (!cancelled) {
          setCatalog(normalizeOptions(Array.isArray(payload.items) ? payload.items : []));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCatalog(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shopDomain]);

  async function persist() {
    if (!activeStore) {
      setSaveState("error");
      setSaveMessage("Selecciona una tienda antes de guardar.");
      return;
    }
    setSaveState("saving");
    setSaveMessage("");
    try {
      await saveStoreConfig(String(activeStore.id), {
        storeId: activeStore.id,
        shopDomain: activeConfig?.shopDomain ?? shopDomain,
        priceLists: draft,
        transfers: activeConfig?.transfers ?? defaults.transfers,
        rules: activeConfig?.rules ?? defaults.rules,
        invoice: activeConfig?.invoice ?? defaults.invoice,
        sync: activeConfig?.sync ?? defaults.sync,
      });
      onStoreConfigSaved({
        storeId: activeStore.id,
        storeName: activeStore.name,
        shopDomain: activeConfig?.shopDomain ?? activeStore.providers.shopify?.shopDomain,
        priceLists: draft,
        transfers: activeConfig?.transfers ?? defaults.transfers,
        rules: activeConfig?.rules ?? defaults.rules,
        invoice: activeConfig?.invoice ?? defaults.invoice,
        sync: activeConfig?.sync ?? defaults.sync,
      });
      setSaveState("saved");
      setSaveMessage("Price lists guardadas por tienda.");
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar el bloque de price lists.");
    }
  }

  return (
    <section className="card connection-card">
      {!activeStore ? (
        <p className="connection-inline-note">Selecciona una tienda para editar sus listas de precio.</p>
      ) : (
        <div className="store-configs-grid">
          <label className="store-config-field">
            <span>Lista general</span>
            <select
              className="input"
              value={draft.generalId}
              disabled={!shopDomain || loadingCatalog}
              onChange={(event) => setDraft((current) => ({ ...current, generalId: event.target.value }))}
            >
              <option value="">Sin asignar</option>
              {catalog.map((item) => (
                <option key={`general:${item.id}`} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="store-config-field">
            <span>Lista descuento</span>
            <select
              className="input"
              value={draft.discountId}
              disabled={!shopDomain || loadingCatalog}
              onChange={(event) => setDraft((current) => ({ ...current, discountId: event.target.value }))}
            >
              <option value="">Sin asignar</option>
              {catalog.map((item) => (
                <option key={`discount:${item.id}`} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="store-config-field">
            <span>Lista mayorista</span>
            <select
              className="input"
              value={draft.wholesaleId}
              disabled={!shopDomain || loadingCatalog}
              onChange={(event) => setDraft((current) => ({ ...current, wholesaleId: event.target.value }))}
            >
              <option value="">Sin asignar</option>
              {catalog.map((item) => (
                <option key={`wholesale:${item.id}`} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="store-config-field">
            <span>Moneda</span>
            <input
              className="input"
              value={draft.currency}
              onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
              placeholder="COP"
              maxLength={8}
            />
          </label>
        </div>
      )}

      {!shopDomain && activeStore ? (
        <p className="connection-inline-note">
          La tienda necesita contexto Shopify/Alegra para cargar listas disponibles.
        </p>
      ) : loadingCatalog ? (
        <p className="connection-inline-note">Cargando listas de precio desde Alegra…</p>
      ) : activeStore && !catalog.length ? (
        <p className="connection-inline-note">No hay listas disponibles para esta tienda o cuenta conectada.</p>
      ) : null}

      <div className="connection-card-actions">
        <button
          className="btn primary"
          type="button"
          disabled={!activeStore || !dirty || saveState === "saving"}
          onClick={() => void persist()}
        >
          {saveState === "saving" ? "Guardando..." : "Guardar price lists"}
        </button>
        {saveMessage ? <span>{saveMessage}</span> : null}
      </div>
    </section>
  );
}
