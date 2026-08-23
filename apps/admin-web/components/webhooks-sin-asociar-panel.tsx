"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Inbox } from "lucide-react";

import {
  atenderWebhookSinAsociar,
  fetchWebhooksSinAsociar,
  type WebhookSinAsociarDto,
  type WebhooksSinAsociarRespuesta,
} from "../lib/api";

const FUENTE: Record<string, string> = { shopify: "Shopify", alegra: "Alegra" };

const fecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
};

/**
 * «Lo que recibimos y no pudimos procesar».
 *
 * Si nos suscribimos a un webhook, recibirlo ya es un compromiso: no se puede
 * escuchar y luego actuar como si no hubiera llegado. Antes había cinco puntos
 * en la entrada que respondían 200 y no guardaban nada — sólo un aviso en el
 * log del servidor, que nadie lee. La consecuencia fue que no se recibió jamás
 * un webhook de Alegra y no había forma de saber si es que no llegan o si
 * llegan y los tiramos.
 *
 * Aquí se ve qué llegó, cuántas veces, por qué no se pudo procesar y qué hay
 * que hacer para arreglarlo.
 */
export function WebhooksSinAsociarPanel({ superAdmin = false }: { superAdmin?: boolean }) {
  const [datos, setDatos] = useState<WebhooksSinAsociarRespuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await fetchWebhooksSinAsociar({ superAdmin }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
    }
  }, [superAdmin]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const atender = async (item: WebhookSinAsociarDto) => {
    setOcupado(item.id);
    try {
      await atenderWebhookSinAsociar(item.id, { superAdmin });
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo marcar como revisado.");
    } finally {
      setOcupado(null);
    }
  };

  if (error) {
    return (
      <section className="card" aria-label="Lo que recibimos y no pudimos procesar">
        <h3 className="worker-group-title">Lo que recibimos y no pudimos procesar</h3>
        <p className="connection-inline-note">{error}</p>
      </section>
    );
  }

  if (!datos) return null;

  // Sin problemas vivos el panel no desaparece: decir «todo lo que llega se
  // está procesando» es información, y su ausencia se leería como que nadie
  // lo está mirando.
  if (!datos.items.length) {
    return (
      <section className="card" aria-label="Lo que recibimos y no pudimos procesar">
        <h3 className="worker-group-title">
          <Check size={16} strokeWidth={2} aria-hidden="true" /> Todo lo que llega se está procesando
        </h3>
        <p className="worker-group-description">
          No hay eventos recibidos que se hayan quedado sin asociar. Si alguno llega y no se puede procesar, aparecerá
          aquí con el motivo.
        </p>
      </section>
    );
  }

  return (
    <section className="card" aria-label="Lo que recibimos y no pudimos procesar">
      <h3 className="worker-group-title">
        <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" /> Lo que recibimos y no pudimos procesar
      </h3>
      <p className="worker-group-description">
        {datos.resumen.eventos} evento{datos.resumen.eventos === 1 ? "" : "s"} llegaron y no se pudieron asociar a
        ninguna tienda o cuenta, agrupados en {datos.resumen.problemas} problema
        {datos.resumen.problemas === 1 ? "" : "s"}. Llegaron de verdad: no se perdieron, están guardados.
      </p>

      <ul className="webhooks-sin-asociar">
        {datos.items.map((item) => (
          <li key={item.id} className={`webhook-sin-asociar${item.atendido ? " is-atendido" : ""}`}>
            <div className="webhook-sin-asociar-cabecera">
              <strong>{item.titulo}</strong>
              <span className="webhook-sin-asociar-veces">
                {item.veces} evento{item.veces === 1 ? "" : "s"}
              </span>
            </div>
            <p className="webhook-sin-asociar-que">{item.queSignifica}</p>
            {item.detalle ? <p className="webhook-sin-asociar-detalle">{item.detalle}</p> : null}
            <p className="webhook-sin-asociar-hacer">
              <strong>Qué hacer:</strong> {item.queHacer}
            </p>
            <dl className="webhook-sin-asociar-datos">
              <div>
                <dt>Origen</dt>
                <dd>{FUENTE[item.source] || item.source}</dd>
              </div>
              {item.eventType ? (
                <div>
                  <dt>Evento</dt>
                  <dd>{item.eventType}</dd>
                </div>
              ) : null}
              {item.shopDomain ? (
                <div>
                  <dt>Tienda</dt>
                  <dd>{item.shopDomain}</dd>
                </div>
              ) : null}
              {item.accountId ? (
                <div>
                  <dt>Cuenta Alegra</dt>
                  <dd>{item.accountId}</dd>
                </div>
              ) : null}
              <div>
                <dt>Primera vez</dt>
                <dd>{fecha(item.primeraVez)}</dd>
              </div>
              <div>
                <dt>Última vez</dt>
                <dd>{fecha(item.ultimaVez)}</dd>
              </div>
            </dl>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void atender(item)}
              disabled={ocupado === item.id}
            >
              <Inbox size={14} strokeWidth={2} aria-hidden="true" />
              {ocupado === item.id ? "Guardando…" : "Marcar como revisado"}
            </button>
            <p className="webhook-sin-asociar-nota">
              Marcarlo no lo borra. Si el problema vuelve a ocurrir, reaparece aquí solo.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
