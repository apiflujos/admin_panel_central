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
          <h3>Configuración avanzada</h3>
          <p>Opciones que aún no están en esta vista y estado del cron de inventario.</p>
        </div>
      </div>

      <article className="store-warehouse-card compatibility-card">
        <div className="store-warehouse-head">
          <strong>Cron de inventario</strong>
          <span className={`pill ${loading ? "pill-info" : checkpoint?.error ? "pill-warn" : "pill-ok"}`}>
            {loading ? "Cargando..." : checkpoint?.error ? "Atención" : "OK"}
          </span>
        </div>
        <p className="connection-inline-note">
          Último checkpoint: {loading ? "Cargando..." : formatCheckpointDate(checkpoint?.updatedAt)}
        </p>
        <p className="connection-inline-note">
          Intervalo reportado: {loading ? "Cargando..." : formatInterval(checkpoint?.intervalMs)}
        </p>
        {checkpoint?.error ? (
          <p className="connection-inline-note connection-inline-note-error">{checkpoint.error}</p>
        ) : null}
      </article>

      <div className="connection-card-actions">
        <button className="btn ghost" type="button" onClick={() => void refreshCheckpoint()}>
          Refrescar checkpoint
        </button>
        <a className="btn ghost" href="/legacy/settings/connections">
          Abrir configuración avanzada
        </a>
      </div>
    </section>
  );
}
