"use client";

import { useMemo, useState } from "react";

import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { StoreMarketingConfigPanel } from "./store-marketing-config-panel";
import { ProviderMark } from "./ui/provider-mark";
import { StageGuide } from "./ui/stage-guide";

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
          <p>Configuración de pixel y webhooks por tienda Shopify, en un flujo corto y verificable.</p>
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
          <span className="metric-note">Con pixel y webhooks administrables desde Next</span>
        </article>
        <article className="metric-card metric-card-mint">
          <span className="metric-label">Ads conectados</span>
          <strong className="metric-value">{connectedAds}</strong>
          <span className="metric-note">Google, Meta o TikTok con estado conectado</span>
        </article>
        <article className="metric-card metric-card-amber">
          <span className="metric-label">Tienda activa</span>
          <strong className="metric-value">{activeStore?.name || "Sin tienda"}</strong>
          <span className="metric-note">{activeShopDomain || "Selecciona una tienda Shopify para operar"}</span>
        </article>
      </section>

      <StageGuide
        title="Flujo del submódulo"
        description="Primero eliges la tienda. Luego copias o rotas el script, después administras webhooks y al final pasas a la analítica cuando la configuración esté sana."
        items={[
          "Selecciona la tienda Shopify que vas a operar.",
          "Copia script, revisa key y confirma webhooks.",
          "Solo entra a analítica cuando la configuración quede sana.",
        ]}
        next={
          <>
            <span className="pill pill-info">1. Seleccionar tienda</span>
            <span className="pill">2. Instalar script</span>
            <span className="pill">3. Validar webhooks</span>
            <span className="pill">4. Ir a analítica</span>
          </>
        }
      />

      <section className="page-module-shell page-module-shell-compact">
        <div className="settings-subsection">
          <div className="settings-subsection-head">
            <strong>Tienda objetivo</strong>
            <span>Define sobre qué tienda Shopify operas el pixel y los webhooks.</span>
          </div>
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
              <a className="btn ghost" href="/marketing">
                Ver analítica cuando la configuración esté lista
              </a>
            </div>
          </div>
        </div>
      </section>

      <StoreMarketingConfigPanel stores={marketingStores} activeStoreId={activeStoreId} />
    </section>
  );
}
