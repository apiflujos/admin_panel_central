"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createMarketingWebhooks,
  deleteMarketingWebhooks,
  getMarketingPixelConfig,
  getMarketingWebhookStatus,
  rotateMarketingPixelKey,
  type AdminWebMarketingPixelConfig,
  type AdminWebMarketingWebhookStatus,
} from "../lib/api";
import type { WorkspaceStore } from "../lib/connections-workspace";
import { ProviderMark } from "./ui/provider-mark";

export function StoreMarketingConfigPanel({
  stores,
  activeStoreId,
}: {
  stores: WorkspaceStore[];
  activeStoreId: number | null;
}) {
  const [pixelConfig, setPixelConfig] = useState<AdminWebMarketingPixelConfig | null>(null);
  const [webhookStatus, setWebhookStatus] = useState<AdminWebMarketingWebhookStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionState, setActionState] = useState<"" | "rotate" | "create" | "delete">("");
  const [message, setMessage] = useState("");

  const activeStore = useMemo(
    () => stores.find((store) => store.id === activeStoreId) ?? stores[0] ?? null,
    [activeStoreId, stores]
  );
  const shopDomain = activeStore?.providers.shopify?.shopDomain || "";

  async function loadMarketingState() {
    if (!shopDomain) {
      setPixelConfig(null);
      setWebhookStatus(null);
      return;
    }
    setLoading(true);
    try {
      const [nextPixelConfig, nextWebhookStatus] = await Promise.all([
        getMarketingPixelConfig(shopDomain),
        getMarketingWebhookStatus(shopDomain),
      ]);
      setPixelConfig(nextPixelConfig);
      setWebhookStatus(nextWebhookStatus);
    } catch (error) {
      setPixelConfig(null);
      setWebhookStatus(null);
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración de marketing.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMessage("");
    void loadMarketingState();
  }, [shopDomain]);

  async function copyToClipboard(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copiado.`);
    } catch {
      setMessage(`No se pudo copiar ${label.toLowerCase()}.`);
    }
  }

  async function rotateKey() {
    if (!shopDomain) return;
    const confirmed = window.confirm(
      `Esto rotará el pixel key de ${activeStore?.name || shopDomain} y puede invalidar instalaciones existentes. ¿Continuar?`
    );
    if (!confirmed) return;
    setActionState("rotate");
    setMessage("");
    try {
      const next = await rotateMarketingPixelKey(shopDomain);
      setPixelConfig(next);
      setMessage("Pixel key rotado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo rotar el pixel key.");
    } finally {
      setActionState("");
    }
  }

  async function mutateWebhooks(kind: "create" | "delete") {
    if (!shopDomain) return;
    const confirmed =
      kind === "create"
        ? window.confirm(
            `Se recrearán o actualizarán los webhooks de marketing para ${activeStore?.name || shopDomain}. ¿Continuar?`
          )
        : window.confirm(`Esto eliminará los webhooks de marketing de ${activeStore?.name || shopDomain}. ¿Continuar?`);
    if (!confirmed) return;
    setActionState(kind);
    setMessage("");
    try {
      if (kind === "create") {
        await createMarketingWebhooks(shopDomain);
        setMessage("Webhooks de marketing creados o actualizados.");
      } else {
        await deleteMarketingWebhooks(shopDomain);
        setMessage("Webhooks de marketing eliminados.");
      }
      await loadMarketingState();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `No se pudo ${kind === "create" ? "crear" : "eliminar"} webhooks de marketing.`
      );
    } finally {
      setActionState("");
    }
  }

  const canOperate = Boolean(shopDomain);
  const webhookTone = webhookStatus?.ok ? "pill-ok" : "pill-warn";

  return (
    <section className="card connection-card connection-card-dense">
      <div className="connection-card-head">
        <div>
          <h3>Configuración de marketing</h3>
          <p>Script, pixel key y webhooks de la tienda activa dentro del flujo de Shopify.</p>
        </div>
        <div className="connection-card-actions">
          {activeStore ? <span className="pill">Tienda · {activeStore.name}</span> : null}
          {shopDomain ? <span className="pill pill-info">{shopDomain}</span> : null}
          {webhookStatus ? (
            <span className={`pill ${webhookTone}`}>
              Webhooks · {webhookStatus.connected}/{webhookStatus.total}
            </span>
          ) : null}
        </div>
      </div>

      {!canOperate ? (
        <p className="connection-inline-note">
          Selecciona una tienda con Shopify conectado para operar Pixel y Webhooks de Marketing.
        </p>
      ) : null}
      {canOperate && !loading && !pixelConfig && !webhookStatus && message ? (
        <p className="connection-inline-note connection-inline-note-error">
          No se pudo cargar el estado de marketing para la tienda activa. Revisa la conexión Shopify o entra a ajustes
          avanzados.
        </p>
      ) : null}

      <div className="settings-subsection">
        <div className="settings-subsection-head">
          <strong>Script y key</strong>
          <span>Instalación de la tienda.</span>
        </div>
        <p className="connection-inline-note">
          Instala script o key antes de revisar webhooks.
        </p>
        <div className="provider-mark-row compact-provider-row">
          <ProviderMark provider="Shopify" />
          <span className="pill pill-info">{shopDomain || "Sin tienda Shopify activa"}</span>
        </div>
        <div className="store-configs-grid">
          <label className="store-config-field store-config-field-span-2">
            <span>Pixel key</span>
            <div className="connection-card-actions">
              <input
                className="input"
                value={pixelConfig?.pixelKey || ""}
                readOnly
                placeholder={loading ? "Cargando..." : "Sin datos"}
              />
              <button
                className="btn ghost btn-compact"
                type="button"
                disabled={!pixelConfig?.pixelKey}
                onClick={() => void copyToClipboard(pixelConfig?.pixelKey || "", "Pixel key")}
              >
                Copiar
              </button>
              <button
                className="btn primary btn-compact"
                type="button"
                disabled={!canOperate || actionState === "rotate"}
                onClick={() => void rotateKey()}
              >
                {actionState === "rotate" ? "Rotando..." : "Rotar key"}
              </button>
            </div>
            <small>Identifica el pixel de esa tienda.</small>
          </label>

          <label className="store-config-field store-config-field-span-2">
            <span>Script para Shopify</span>
            <div className="connection-card-actions">
              <input
                className="input"
                value={pixelConfig?.pixelScriptTag || ""}
                readOnly
                placeholder={loading ? "Cargando..." : "Sin datos"}
              />
              <button
                className="btn ghost btn-compact"
                type="button"
                disabled={!pixelConfig?.pixelScriptTag}
                onClick={() => void copyToClipboard(pixelConfig?.pixelScriptTag || "", "Script")}
              >
                Copiar script
              </button>
            </div>
            <small>Pégalo en `theme.liquid`.</small>
          </label>

          <label className="store-config-field store-config-field-span-2">
            <span>URL del webhook</span>
            <div className="connection-card-actions">
              <input
                className="input"
                value={pixelConfig?.webhookUrl || webhookStatus?.callbackUrl || ""}
                readOnly
                placeholder={loading ? "Cargando..." : "Sin datos"}
              />
              <button
                className="btn ghost btn-compact"
                type="button"
                disabled={!pixelConfig?.webhookUrl && !webhookStatus?.callbackUrl}
                onClick={() =>
                  void copyToClipboard(pixelConfig?.webhookUrl || webhookStatus?.callbackUrl || "", "URL del webhook")
                }
              >
                Copiar URL
              </button>
            </div>
            <small>Callback para `orders`, `checkouts` y `customers`.</small>
          </label>
        </div>
      </div>

      <div className="settings-subsection">
        <div className="settings-subsection-head">
          <strong>Webhooks</strong>
          <span>Eventos y acciones.</span>
        </div>
        <p className="connection-inline-note">
          Si falta un topic, recréalo antes de pasar a analítica.
        </p>
        <div className="store-configs-grid">
          <div className="store-config-field store-config-field-span-2">
            <span>Eventos esperados</span>
            <div className="connection-card-actions">
              {(pixelConfig?.webhookTopics || []).map((topic) => (
                <span key={topic} className="pill">
                  {topic}
                </span>
              ))}
            </div>
            <small>El estado compara estos eventos contra las suscripciones reales de Shopify.</small>
          </div>

          <div className="store-config-field store-config-field-span-2">
            <span>Acciones</span>
            <div className="connection-card-actions">
              <button
                className="btn primary"
                type="button"
                disabled={!canOperate || actionState === "create"}
                onClick={() => void mutateWebhooks("create")}
              >
                {actionState === "create" ? "Creando..." : "Crear webhooks"}
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={!canOperate || actionState === "delete"}
                onClick={() => void mutateWebhooks("delete")}
              >
                {actionState === "delete" ? "Eliminando..." : "Eliminar webhooks"}
              </button>
              <button
                className="btn ghost"
                type="button"
                disabled={!canOperate || loading}
                onClick={() => void loadMarketingState()}
              >
                Refrescar estado
              </button>
              <a className="btn ghost" href="/marketing">
                Ver analítica
              </a>
            </div>
            <small>Cuando la configuración quede estable, continúa con el módulo de analítica y embudo.</small>
          </div>
        </div>
      </div>

      {webhookStatus && webhookStatus.missing.length ? (
        <p className="connection-inline-note connection-inline-note-error">
          Faltan eventos: {webhookStatus.missing.join(", ")}.
        </p>
      ) : null}
      {message ? <p className="connection-inline-note">{message}</p> : null}
    </section>
  );
}
