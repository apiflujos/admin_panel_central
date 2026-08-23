"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { fetchWorkerSettings, setWorkerEnabledRemote, type WorkerSettingDto } from "../lib/api";
import { PageToolbar } from "./ui/page-toolbar";
import { StatusPill } from "./ui/status-pill";

const GRUPOS: { key: WorkerSettingDto["group"]; label: string; description: string }[] = [
  {
    key: "facturacion",
    label: "Facturación",
    description: "Convierte los pedidos de las tiendas en facturas de Alegra. No modifica el catálogo.",
  },
  {
    key: "sincronizacion",
    label: "Sincronización de catálogo",
    description: "Lleva precios y existencias de Alegra hacia las tiendas. SÍ modifica el catálogo.",
  },
  {
    key: "mantenimiento",
    label: "Mantenimiento",
    description: "Tareas internas: limpieza de registros, vigilancia y reporte mensual.",
  },
];

function formatoFecha(iso: string | null) {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${fecha.toLocaleDateString("es-CO")} ${fecha.toLocaleTimeString("es-CO")}`;
}

export function WorkersPanel({ conCabecera = false }: { conCabecera?: boolean } = {}) {
  const [items, setItems] = useState<WorkerSettingDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setItems(await fetchWorkerSettings());
      setAviso(null);
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cargar." });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cambiar(worker: WorkerSettingDto, siguiente: boolean) {
    // Encender algo que escribe en la tienda se confirma. Apagarlo NO se
    // confirma nunca: frenar tiene que ser inmediato.
    if (siguiente && worker.writesToStore) {
      const seguro = window.confirm(
        `"${worker.label}" MODIFICA las tiendas (precios, existencias y publicación).\n\n` +
          "Al encenderlo empezará a cambiar el catálogo según lo que diga Alegra.\n\n" +
          "¿Confirmas que quieres encenderlo?"
      );
      if (!seguro) return;
    }
    setGuardando(worker.key);
    setAviso(null);
    try {
      await setWorkerEnabledRemote(worker.key, siguiente);
      setItems((previos) =>
        previos.map((item) =>
          item.key === worker.key
            ? { ...item, enabled: siguiente, isDefault: false, updatedAt: new Date().toISOString() }
            : item
        )
      );
      setAviso({
        tone: "ok",
        text: `"${worker.label}" quedó ${siguiente ? "encendido" : "apagado"}. Surte efecto en menos de un minuto.`,
      });
    } catch (error) {
      setAviso({ tone: "error", text: error instanceof Error ? error.message : "No se pudo cambiar." });
    } finally {
      setGuardando(null);
    }
  }

  const encendidos = useMemo(() => items.filter((item) => item.enabled).length, [items]);
  const escribenEncendidos = useMemo(() => items.filter((item) => item.enabled && item.writesToStore), [items]);

  return (
    <section className="page-stack" id="trabajos">
      <div className="card metrics-shell">
        <h3 className="worker-group-title">
          {conCabecera ? "Trabajos automáticos" : "Trabajos automáticos de esta instalación"}
        </h3>
        <p className="worker-explicacion">
          <strong>Un trabajo no se configura aquí: se enciende o se apaga.</strong> Es el motor. Las reglas que sigue
          —qué se sincroniza, en qué dirección, con qué datos— viven en Configuración. Si una regla no surte efecto, lo
          primero que hay que mirar es si su trabajo está encendido.
        </p>

        <PageToolbar
          views={
            <>
              <span className="pill pill-info">
                Encendidos · {encendidos} de {items.length}
              </span>
              {escribenEncendidos.length ? (
                <span className="pill pill-warn">Modifican las tiendas · {escribenEncendidos.length}</span>
              ) : (
                <span className="pill">Ninguno modifica las tiendas</span>
              )}
            </>
          }
          actions={
            <button className="btn ghost btn-compact" type="button" disabled={cargando} onClick={() => void cargar()}>
              <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" /> {cargando ? "Cargando…" : "Refrescar"}
            </button>
          }
        />

        {aviso ? (
          <p
            className={`connection-inline-note${aviso.tone === "error" ? " connection-inline-note-error" : ""}`}
            role="status"
          >
            {aviso.text}
          </p>
        ) : null}

        {escribenEncendidos.length ? (
          <p className="worker-warning" role="status">
            <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>
              Hay {escribenEncendidos.length} trabajo(s) encendido(s) que cambian precios, existencias o la publicación
              de las tiendas.
            </span>
          </p>
        ) : null}

        {GRUPOS.map((grupo) => {
          const delGrupo = items.filter((item) => item.group === grupo.key);
          if (!delGrupo.length) return null;
          return (
            <section className="card page-module-shell" key={grupo.key}>
              <h3 className="worker-group-title">{grupo.label}</h3>
              <p className="worker-group-description">{grupo.description}</p>

              <div className="cron-reference-list">
                {delGrupo.map((worker) => {
                  const fecha = formatoFecha(worker.updatedAt);
                  const ocupado = guardando === worker.key;
                  return (
                    <article className="cron-reference-row worker-row" key={worker.key}>
                      <div className="cron-reference-main worker-main">
                        <div className="cron-reference-meta">
                          <strong>{worker.label}</strong>
                          <StatusPill tone={worker.enabled ? "success" : "info"} small>
                            {worker.enabled ? "Encendido" : "Apagado"}
                          </StatusPill>
                          {worker.writesToStore ? (
                            <StatusPill tone="warning" small>
                              Modifica la tienda
                            </StatusPill>
                          ) : null}
                          {worker.averiado ? (
                            <StatusPill tone="error" small>
                              Averiado
                            </StatusPill>
                          ) : null}
                        </div>
                        <p className="worker-description">{worker.comoTrabaja || worker.description}</p>
                        <p className="worker-impact">
                          <strong>Si se apaga:</strong> {worker.impactIfOff}
                        </p>
                        <p className="worker-impact">
                          <strong>Reglas que sigue:</strong> {worker.obedeceA}
                          {worker.dondeSeAjusta ? (
                            <>
                              {" "}
                              <span className="worker-donde">{worker.dondeSeAjusta}</span>
                            </>
                          ) : null}
                        </p>
                        {/* La salud va ANTES que cualquier otro dato: un trabajo
                            que lleva pasadas fallando es lo primero que hay que
                            saber. `log-retention` falló ~120 veces en un mes sin
                            que ninguna pantalla lo dijera. */}
                        {worker.averiado ? (
                          <p className="worker-averia">
                            <strong>
                              Lleva {worker.fallosSeguidos} pasada{worker.fallosSeguidos === 1 ? "" : "s"} seguidas
                              fallando.
                            </strong>{" "}
                            {worker.ultimoError ? (
                              <span className="worker-averia-error">{worker.ultimoError}</span>
                            ) : null}
                            {worker.ultimoExito ? (
                              <span className="worker-averia-desde">
                                {" "}
                                Última vez que funcionó: {formatoFecha(worker.ultimoExito) || "sin fecha"}.
                              </span>
                            ) : (
                              <span className="worker-averia-desde"> No consta que haya funcionado nunca.</span>
                            )}
                          </p>
                        ) : null}
                        <small className="cron-reference-env">
                          {worker.ultimaEjecucion
                            ? `Última pasada: ${formatoFecha(worker.ultimaEjecucion) || "sin fecha"} · ${
                                worker.ultimoResultado === "fallo" ? "falló" : "bien"
                              } — `
                            : "Todavía no ha corrido desde que se registra la salud — "}
                          {worker.isDefault
                            ? "Nadie lo ha cambiado: está en su valor por omisión"
                            : `Último cambio: ${fecha || "sin fecha"}${worker.updatedBy ? ` · ${worker.updatedBy}` : ""}`}
                        </small>
                      </div>

                      <div className="worker-actions">
                        <div className="segmented-toggle" role="group" aria-label={`Estado de ${worker.label}`}>
                          <button
                            className={`btn ${worker.enabled ? "primary" : "ghost"} btn-compact`}
                            type="button"
                            disabled={ocupado || worker.enabled}
                            onClick={() => void cambiar(worker, true)}
                          >
                            Encender
                          </button>
                          <button
                            className={`btn ${!worker.enabled ? "primary" : "ghost"} btn-compact`}
                            type="button"
                            disabled={ocupado || !worker.enabled}
                            onClick={() => void cambiar(worker, false)}
                          >
                            Apagar
                          </button>
                        </div>
                        {ocupado ? <small>Guardando…</small> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        {!cargando && !items.length ? <p className="connection-inline-note">No hay trabajos registrados.</p> : null}
      </div>
    </section>
  );
}
