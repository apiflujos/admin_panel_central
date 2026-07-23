"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "../lib/api";

type Status = { configured: boolean; source: "db" | "env" | "none"; apiKeyMasked: string };

const DEFAULT_SCOPES =
  "read_orders,write_orders,read_products,write_products,read_customers,write_customers,read_inventory,write_inventory";

/**
 * Configura las credenciales del app OAuth de Shopify (API key + secret + scopes)
 * y las guarda en la base de datos (cifradas), en vez de depender del .env del
 * servidor. Lee el estado actual y permite actualizarlas desde el panel.
 */
export function ShopifyAppCredentialsForm() {
  const [status, setStatus] = useState<Status | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [scopes, setScopes] = useState(DEFAULT_SCOPES);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function loadStatus() {
    try {
      const res = await apiFetch("/api/settings/shopify-app");
      if (res.ok) {
        setStatus((await res.json()) as Status);
      }
    } catch {
      // silencioso: si falla, el formulario sigue usable
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function save() {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setNote({ tone: "error", text: "API key y API secret son requeridos." });
      return;
    }
    setSaving(true);
    setNote(null);
    try {
      const res = await apiFetch("/api/settings/shopify-app", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), scopes: scopes.trim() }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || `shopify_app_save_failed:${res.status}`);
      }
      setApiKey("");
      setApiSecret("");
      setNote({ tone: "ok", text: "Credenciales de Shopify guardadas en la base de datos." });
      await loadStatus();
    } catch (error) {
      setNote({ tone: "error", text: error instanceof Error ? error.message : "No se pudo guardar." });
    } finally {
      setSaving(false);
    }
  }

  const sourceLabel =
    status?.source === "db"
      ? "guardadas en la base de datos"
      : status?.source === "env"
        ? "tomadas de variables de entorno (.env)"
        : "sin configurar";

  return (
    <details className="page-module-shell page-module-shell-compact">
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        Credenciales del app Shopify (OAuth)
        {status ? (
          <span className={`pill pill-mini ${status.configured ? "pill-ok" : "pill-bad"}`} style={{ marginLeft: 8 }}>
            {status.configured ? `Configurado · ${sourceLabel}` : "Sin configurar"}
          </span>
        ) : null}
      </summary>

      <p className="connection-inline-note" style={{ marginTop: 8 }}>
        Estas claves habilitan “Conectar Shopify”. Se guardan cifradas en la base de datos (no en el .env). Se obtienen
        en el Partner Dashboard de Shopify → tu app → Client credentials.
        {status?.apiKeyMasked ? <> Actual: <code>{status.apiKeyMasked}</code></> : null}
      </p>

      <div className="config-active-store-grid">
        <label className="field">
          <span>API key (Client ID)</span>
          <input
            className="input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={status?.configured ? "•••••• (dejar vacío para no cambiar)" : "f3e4477d..."}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>API secret (Client secret)</span>
          <input
            className="input"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder={status?.configured ? "•••••• (dejar vacío para no cambiar)" : "shpss_..."}
            autoComplete="off"
          />
        </label>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span>Scopes</span>
          <input className="input" value={scopes} onChange={(e) => setScopes(e.target.value)} />
        </label>
      </div>

      <div className="page-module-actions" style={{ marginTop: 8 }}>
        <button className="btn primary btn-compact" type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Guardando…" : "Guardar credenciales"}
        </button>
        {note ? (
          <span className={note.tone === "error" ? "auth-inline-state-error" : "auth-inline-state"} role="status">
            {note.text}
          </span>
        ) : null}
      </div>
    </details>
  );
}
