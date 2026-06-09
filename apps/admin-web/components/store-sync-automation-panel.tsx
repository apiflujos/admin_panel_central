"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionsWorkspace, CriticalStoreConfig, WorkspaceStore } from "../lib/connections-workspace";
import { getInventoryAdjustmentsCheckpoint } from "../lib/api";

function formatCheckpoint(value?: string | null) {
  if (!value) return "Sin datos todavía";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatIntervalMinutes(intervalMs?: number) {
  const minutes = Math.round(Number(intervalMs || 0) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0) return "Inactivo";
  return `Cada ${minutes} min`;
}

function formatOrderEntryMode(value: CriticalStoreConfig["sync"]["orders"]["shopifyToAlegra"]) {
  switch (value) {
    case "db_only":
      return "Guardar pedido";
    case "contact_only":
      return "Solo contacto";
    case "invoice":
      return "Crear factura";
    case "off":
      return "Apagado";
    default:
      return value;
  }
}

function formatOrderReturnMode(value: CriticalStoreConfig["sync"]["orders"]["alegraToShopify"]) {
  switch (value) {
    case "draft":
      return "Crear borrador";
    case "active":
      return "Crear activo";
    case "off":
      return "Apagado";
    default:
      return value;
  }
}

export function StoreSyncAutomationPanel({
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
  const commerceLabel = activeStore?.providers.shopify
    ? "Shopify"
    : activeStore?.providers.woocommerce
      ? "WooCommerce"
      : "Tienda";
  const accountingLabel = activeStore?.providers.alegra ? "Alegra" : "Contable";

  const [checkpoint, setCheckpoint] = useState<{
    checkpoint?: { updatedAt?: string | null } | null;
    intervalMs?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getInventoryAdjustmentsCheckpoint(activeStore?.providers.shopify?.shopDomain)
      .then((payload) => {
        if (!cancelled) {
          setCheckpoint(payload);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No se pudo consultar el checkpoint.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeStore?.providers.shopify?.shopDomain]);

  if (!activeStore) {
    return (
      <section className="card connection-card">
        <div className="connection-card-head">
          <div>
            <h3>Automatización activa</h3>
            <p>Selecciona una tienda para revisar qué corre en automático y cuál fue el último movimiento.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card connection-card">
      <div className="connection-card-head">
        <div>
          <h3>Automatización activa</h3>
          <p>Estado rápido de procesos automáticos por tienda, con checkpoint visible para inventario.</p>
        </div>
        <span className="pill">Tienda #{activeStore.id}</span>
      </div>

      <div className="operational-hub-grid">
        <article className="card operational-hub-card">
          <div className="settings-subsection-head">
            <div>
              <strong>Contactos</strong>
              <span>Sincronización automática y creación en ambos sentidos.</span>
            </div>
            <span className={`pill ${effectiveSync.contacts.enabled ? "pill-ok" : "pill-warn"}`}>
              {effectiveSync.contacts.enabled ? "Activo" : "Pausado"}
            </span>
          </div>
          <div className="page-module-actions compact-pills">
            <span className={`pill ${effectiveSync.contacts.fromShopify ? "pill-ok" : ""}`}>
              {commerceLabel} → {accountingLabel}
            </span>
            <span className={`pill ${effectiveSync.contacts.fromAlegra ? "pill-ok" : ""}`}>
              {accountingLabel} → {commerceLabel}
            </span>
            <span className="pill">Match {effectiveSync.contacts.matchPriority.join(" / ")}</span>
          </div>
          <p className="connection-inline-note">
            Altas automáticas: {accountingLabel} {effectiveSync.contacts.createInAlegra ? "sí" : "no"} ·{" "}
            {commerceLabel}{" "}
            {effectiveSync.contacts.createInShopify ? "sí" : "no"}.
          </p>
        </article>

        <article className="card operational-hub-card">
          <div className="settings-subsection-head">
            <div>
              <strong>Pedidos y facturas</strong>
              <span>Direcciones y modo de ejecución automática por tienda.</span>
            </div>
            <span className={`pill ${effectiveSync.orders.shopifyEnabled ? "pill-ok" : "pill-warn"}`}>
              {effectiveSync.orders.shopifyEnabled ? "Pedidos activos" : "Pedidos pausados"}
            </span>
          </div>
          <div className="page-module-actions compact-pills">
            <span className="pill">{commerceLabel} → {accountingLabel} {formatOrderEntryMode(effectiveSync.orders.shopifyToAlegra)}</span>
            <span className={`pill ${effectiveSync.orders.alegraEnabled ? "pill-ok" : ""}`}>
              {accountingLabel} → {commerceLabel} {formatOrderReturnMode(effectiveSync.orders.alegraToShopify)}
            </span>
          </div>
          <p className="connection-inline-note">
            El módulo automático usa estas reglas para decidir si crea base, contacto, factura o retorno a la tienda.
          </p>
        </article>

        <article className="card operational-hub-card">
          <div className="settings-subsection-head">
            <div>
              <strong>Productos y publicación</strong>
              <span>Automatización entre {accountingLabel} y {commerceLabel}.</span>
            </div>
            <span className={`pill ${effectiveRules.syncEnabled ? "pill-ok" : "pill-warn"}`}>
              {effectiveRules.syncEnabled ? "Sync activo" : "Sync pausado"}
            </span>
          </div>
          <div className="page-module-actions compact-pills">
            <span className={`pill ${effectiveRules.createInShopify ? "pill-ok" : ""}`}>Crear en {commerceLabel}</span>
            <span className={`pill ${effectiveRules.updateInShopify ? "pill-ok" : ""}`}>
              Actualizar en {commerceLabel}
            </span>
            <span className={`pill ${effectiveSync.products.shopifyEnabled ? "pill-ok" : ""}`}>
              {commerceLabel} → {accountingLabel}
            </span>
            <span className={`pill ${effectiveRules.includeImages ? "pill-ok" : ""}`}>Exigir imágenes</span>
          </div>
          <p className="connection-inline-note">
            Inventario en sync {commerceLabel} → {accountingLabel}:{" "}
            {effectiveSync.products.includeInventory ? "incluido" : "apagado"}.
          </p>
        </article>

        <article className="card operational-hub-card">
          <div className="settings-subsection-head">
            <div>
              <strong>Inventario automático</strong>
              <span>Checkpoint y frecuencia del worker para ajustes de inventario.</span>
            </div>
            <span className={`pill ${effectiveRules.inventoryAdjustmentsEnabled ? "pill-ok" : "pill-warn"}`}>
              {effectiveRules.inventoryAdjustmentsEnabled ? "Worker activo" : "Worker pausado"}
            </span>
          </div>
          <div className="page-module-actions compact-pills">
            <span className="pill">Frecuencia {formatIntervalMinutes(checkpoint?.intervalMs)}</span>
            <span className="pill">Regla tienda {effectiveRules.inventoryAdjustmentsIntervalMinutes} min</span>
            <span className={`pill ${effectiveRules.inventoryAdjustmentsAutoPublish ? "pill-ok" : ""}`}>
              Auto-publicar {effectiveRules.inventoryAdjustmentsAutoPublish ? "sí" : "no"}
            </span>
          </div>
          <p className="connection-inline-note">
            Último movimiento: {loading ? "Cargando..." : formatCheckpoint(checkpoint?.checkpoint?.updatedAt)}.
          </p>
          {error ? <p className="connection-inline-note connection-inline-note-error">{error}</p> : null}
        </article>
      </div>
    </section>
  );
}
