"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { saveStoreConfig } from "../lib/api";
import {
  SOURCE_OF_TRUTH_AREAS,
  SOURCE_OF_TRUTH_LABELS,
  normalizeSourceOfTruth,
  type SourceOfTruth,
  type SourceOfTruthArea,
  type SourceOfTruthOwner,
} from "../../../packages/shared/src/source-of-truth";
import { StatusPill } from "./ui/status-pill";

/**
 * Quién manda sobre cada área, por tienda.
 *
 * No todos los clientes trabajan igual: quien lleva el inventario en Alegra
 * necesita que la tienda no venda lo que no existe; quien opera en la tienda y
 * usa Alegra sólo para facturar necesita lo contrario.
 *
 * Lo que NO se elige aquí son los requisitos de facturación: que una factura
 * necesite identificar al cliente lo pone la DIAN, no esta pantalla.
 */
export function StoreSourceOfTruthPanel({ workspace }: { workspace: ConnectionsWorkspace }) {
  const tiendas = workspace.storeConfigs || [];
  const [activa, setActiva] = useState<number | null>(tiendas[0]?.storeId ?? null);
  const [borrador, setBorrador] = useState<Record<number, SourceOfTruth>>(() =>
    Object.fromEntries(tiendas.map((t) => [t.storeId, normalizeSourceOfTruth(t.sourceOfTruth)]))
  );
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const tienda = useMemo(() => tiendas.find((t) => t.storeId === activa) || null, [tiendas, activa]);
  const guardado = useMemo(() => (tienda ? normalizeSourceOfTruth(tienda.sourceOfTruth) : null), [tienda]);
  const actual = tienda ? borrador[tienda.storeId] || normalizeSourceOfTruth(tienda.sourceOfTruth) : null;

  const haCambiado = useMemo(() => {
    if (!actual || !guardado) return false;
    return SOURCE_OF_TRUTH_AREAS.some((area) => actual[area] !== guardado[area]);
  }, [actual, guardado]);

  function elegir(area: SourceOfTruthArea, owner: SourceOfTruthOwner) {
    if (!tienda || !actual) return;
    setAviso(null);
    setBorrador((prev) => ({ ...prev, [tienda.storeId]: { ...actual, [area]: owner } }));
  }

  async function guardar() {
    if (!tienda || !actual) return;
    // Pasar el inventario a la tienda desactiva la barrera contra la
    // sobreventa. Se confirma; lo contrario no necesita confirmación.
    if (actual.inventory === "shopify" && guardado?.inventory === "alegra") {
      const seguro = window.confirm(
        `Vas a poner a "${tienda.storeName}" al mando de las existencias.\n\n` +
          "Desde ese momento Alegra deja de ajustar sus cantidades, y la tienda podrá vender " +
          "unidades que Alegra no tiene.\n\n¿Confirmas el cambio?"
      );
      if (!seguro) return;
    }
    setGuardando(true);
    setAviso(null);
    try {
      await saveStoreConfig(String(tienda.storeId), { sourceOfTruth: actual, storeId: tienda.storeId });
      setAviso({ tone: "ok", text: "Guardado. Los trabajos automáticos lo respetan en su próxima pasada." });
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : "No se pudo guardar." });
    } finally {
      setGuardando(false);
    }
  }

  if (!tiendas.length) {
    return <p className="connection-inline-note">No hay tiendas configuradas todavía.</p>;
  }

  return (
    <section className="card page-module-shell">
      <h3 className="worker-group-title">Quién manda sobre cada cosa</h3>
      <p className="worker-group-description">Se elige por tienda y por área.</p>

      {tiendas.length > 1 ? (
        <div className="segmented-toggle" role="group" aria-label="Tienda">
          {tiendas.map((t) => (
            <button
              key={t.storeId}
              type="button"
              className={`btn ${t.storeId === activa ? "primary" : "ghost"} btn-compact`}
              onClick={() => {
                setActiva(t.storeId);
                setAviso(null);
              }}
            >
              {t.storeName}
            </button>
          ))}
        </div>
      ) : null}

      {actual ? (
        <div className="cron-reference-list">
          {SOURCE_OF_TRUTH_AREAS.map((area) => {
            const info = SOURCE_OF_TRUTH_LABELS[area];
            const owner = actual[area];
            return (
              <article className="cron-reference-row worker-row" key={area}>
                <div className="cron-reference-main worker-main">
                  <div className="cron-reference-meta">
                    <strong>{info.label}</strong>
                    <StatusPill tone={owner === "alegra" ? "info" : "warning"} small>
                      {owner === "alegra" ? "Manda Alegra" : "Manda la tienda"}
                    </StatusPill>
                  </div>
                  <p className="worker-description">{info.help[owner]}</p>
                </div>
                <div className="worker-actions">
                  <div className="segmented-toggle" role="group" aria-label={`Quién manda en ${info.label}`}>
                    <button
                      type="button"
                      className={`btn ${owner === "alegra" ? "primary" : "ghost"} btn-compact`}
                      disabled={guardando}
                      onClick={() => elegir(area, "alegra")}
                    >
                      Alegra
                    </button>
                    <button
                      type="button"
                      className={`btn ${owner === "shopify" ? "primary" : "ghost"} btn-compact`}
                      disabled={guardando}
                      onClick={() => elegir(area, "shopify")}
                    >
                      La tienda
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {actual?.inventory === "shopify" ? (
        <p className="worker-warning" role="status">
          <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" />
          <span>
            Con la tienda al mando de las existencias, Alegra no ajusta sus cantidades y los pedidos se facturan sin
            mirar stock. La tienda podrá vender lo que Alegra no tenga.
          </span>
        </p>
      ) : null}

      <p className="worker-impact">
        Esto NO cambia los requisitos para facturar. Que una factura necesite el documento del cliente lo exige la DIAN,
        no esta pantalla: un pedido sin ese dato se marca como no facturable y se explica qué falta.
      </p>

      {aviso ? (
        <p
          className={`connection-inline-note${aviso.tone === "error" ? " connection-inline-note-error" : ""}`}
          role="status"
        >
          {aviso.text}
        </p>
      ) : null}

      <div className="connection-card-actions">
        <button
          className="btn primary btn-compact"
          type="button"
          disabled={guardando || !haCambiado}
          onClick={() => void guardar()}
        >
          {guardando ? "Guardando…" : haCambiado ? "Guardar cambios" : "Sin cambios"}
        </button>
      </div>
    </section>
  );
}
