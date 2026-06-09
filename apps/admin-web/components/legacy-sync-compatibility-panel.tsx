"use client";

import { useEffect, useState } from "react";

type InventoryCheckpointResponse = {
  updatedAt?: string | null;
  intervalMs?: number | null;
  status?: string | null;
  error?: string;
};

function formatCheckpointDate(value?: string | null) {
  if (!value) return "Sin datos";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatInterval(value?: number | null) {
  const intervalMs = Number(value || 0);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return "Inactivo";
  return `${Math.round(intervalMs / 1000)}s`;
}

export function LegacySyncCompatibilityPanel() {
  const [checkpoint, setCheckpoint] = useState<InventoryCheckpointResponse | null>(null);
  const [loading, setLoading] = useState(true);

  function refreshCheckpoint() {
    let cancelled = false;
    setLoading(true);
    fetch("/api/checkpoints/inventory-adjustments", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as InventoryCheckpointResponse;
        if (!response.ok) {
          throw new Error(payload.error || `checkpoint_failed:${response.status}`);
        }
        if (!cancelled) {
          setCheckpoint(payload);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setCheckpoint({ error: error instanceof Error ? error.message : "No disponible" });
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
  }

  useEffect(() => {
    const cleanup = refreshCheckpoint();
    return () => {
      cleanup();
    };
  }, []);

  return (
    <section className="card connection-card">
      <div className="connection-card-head">
        <div>
          <h3>Soporte avanzado restante</h3>
          <p>Estos flujos siguen como respaldo mientras cerramos el traspaso final.</p>
        </div>
        <span className="pill pill-warn">Respaldo</span>
      </div>

      <div className="store-configs-grid">
        <article className="store-warehouse-card compatibility-card">
          <div className="store-warehouse-head">
            <strong>Sync contactos</strong>
            <span className="pill pill-ok">Recuperado</span>
          </div>
          <p className="connection-inline-note">
            La dirección, creación automática y masivos por fecha ya viven en la superficie nueva por tienda.
          </p>
          <p className="connection-inline-note">
            Aquí solo queda como referencia de transición, no como flujo principal.
          </p>
        </article>

        <article className="store-warehouse-card compatibility-card">
          <div className="store-warehouse-head">
            <strong>Sync órdenes</strong>
            <span className="pill pill-ok">Recuperado</span>
          </div>
          <p className="connection-inline-note">
            Los modos Shopify → Alegra y Alegra → Shopify ya vuelven a estar expuestos en la superficie nueva.
          </p>
          <p className="connection-inline-note">
            Queda solo para diagnóstico fino o lectura histórica.
          </p>
        </article>

        <article className="store-warehouse-card compatibility-card">
          <div className="store-warehouse-head">
            <strong>Shopify → Alegra productos</strong>
            <span className="pill pill-ok">Recuperado</span>
          </div>
          <p className="connection-inline-note">
            Create/update contable, prioridad de match e inventario destino ya vuelven a estar visibles en la superficie
            nueva.
          </p>
          <p className="connection-inline-note">
            Queda como respaldo, no como operación principal.
          </p>
        </article>

        <article className="store-warehouse-card compatibility-card">
          <div className="store-warehouse-head">
            <strong>Catálogo e imágenes</strong>
            <span className="pill pill-ok">Recuperado</span>
          </div>
          <p className="connection-inline-note">
            La superficie nueva ya vuelve a exponer carga histórica de catálogo e imágenes por SKU o código de barras.
          </p>
          <p className="connection-inline-note">
            Queda solo como respaldo si necesitas diagnóstico puntual.
          </p>
        </article>

        <article className="store-warehouse-card compatibility-card">
          <div className="store-warehouse-head">
            <strong>Inventory cron</strong>
            <span className={`pill ${loading ? "pill-info" : checkpoint?.error ? "pill-warn" : "pill-ok"}`}>
              {loading ? "Cargando..." : checkpoint?.error ? "Atención" : "Observado"}
            </span>
          </div>
          <p className="connection-inline-note">
            Último checkpoint: {loading ? "Cargando..." : formatCheckpointDate(checkpoint?.updatedAt)}
          </p>
          <p className="connection-inline-note">
            Intervalo reportado: {loading ? "Cargando..." : formatInterval(checkpoint?.intervalMs)}
          </p>
          <p className="connection-inline-note">
            Decisión: visible y accionable desde Next, con el cron de fondo todavía ejecutado por worker shared.
          </p>
          {checkpoint?.error ? (
            <p className="connection-inline-note connection-inline-note-error">{checkpoint.error}</p>
          ) : null}
        </article>
      </div>

      <div className="connection-card-actions">
        <button className="btn ghost" type="button" onClick={() => void refreshCheckpoint()}>
          Refrescar checkpoint
        </button>
        <a className="btn ghost" href="/legacy/settings/connections">
          Ver ajustes avanzados
        </a>
      </div>
    </section>
  );
}
