"use client";

import { useMemo, useState } from "react";

import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { StoreMarketingConfigPanel } from "./store-marketing-config-panel";
import { ProviderMark } from "./ui/provider-mark";

export function SettingsMarketingPage({ workspace }: { workspace: ConnectionsWorkspace }) {
  const marketingStores = useMemo(
    () => workspace.stores.filter((store) => Boolean(store.providers.shopify?.shopDomain)),
    [workspace.stores]
  );
  const [activeStoreId, setActiveStoreId] = useState<number | null>(marketingStores[0]?.id ?? null);

  const activeStore = marketingStores.find((store) => store.id === activeStoreId) ?? marketingStores[0] ?? null;
  const activeShopDomain = activeStore?.providers.shopify?.shopDomain || "";
  const connectedAds = workspace.ads.filter((ad) => ad.status === "connected").length;

  return (
    <section className="page-stack">
      <section className="page-header-standard">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>Marketing</h1>
          <p>Pixel y webhooks por tienda Shopify.</p>
        </div>
        <div className="page-header-actions">
          <a className="btn ghost" href="/settings/connections">
            Volver a conexiones
          </a>
        </div>
      </section>

      <section className="metrics-kpis-tight metrics-kpis-compact">
        <article className="metric-card metric-card-violet">
          <span className="metric-label">Tiendas Shopify</span>
          <strong className="metric-value">{marketingStores.length}</strong>
        </article>
        <article className="metric-card metric-card-mint">
          <span className="metric-label">Ads conectados</span>
          <strong className="metric-value">{connectedAds}</strong>
        </article>
        <article className="metric-card metric-card-amber">
          <span className="metric-label">Tienda activa</span>
          <strong className="metric-value">{activeStore?.name || "—"}</strong>
          <span className="metric-note">{activeShopDomain || "Selecciona una tienda Shopify"}</span>
        </article>
      </section>

      <section className="page-module-shell page-module-shell-compact">
        <div className="config-active-store-grid marketing-store-grid">
          <label className="field">
            <span>Tienda Shopify</span>
            <select
              className="input"
              value={activeStoreId ?? ""}
              onChange={(event) => setActiveStoreId(event.target.value ? Number(event.target.value) : null)}
              disabled={!marketingStores.length}
            >
              {marketingStores.length ? null : <option value="">Sin tiendas Shopify conectadas</option>}
              {marketingStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} · {store.providers.shopify?.shopDomain || "sin dominio"}
                </option>
              ))}
            </select>
          </label>
          <div className="config-active-store-meta">
            {activeStore ? (
              <>
                <ProviderMark provider="Shopify" />
                <span className="pill pill-info">
                  {activeStore.providers.shopify?.shopDomain || activeStore.name}
                </span>
              </>
            ) : null}
          </div>
          <div className="page-module-actions config-active-store-copy">
            <a className="btn ghost btn-compact" href="/marketing">
              Ver analítica
            </a>
          </div>
        </div>
      </section>

      <StoreMarketingConfigPanel stores={marketingStores} activeStoreId={activeStoreId} />
    </section>
  );
}
