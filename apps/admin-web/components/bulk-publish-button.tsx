"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../lib/api";

type StoreOption = { id: number; name: string; hasShopify: boolean; shopDomain: string };
type Action = "publish" | "unpublish";
type Phase = "config" | "running" | "done" | "error";
type Progress = { processed: number; failed: number; skipped: number; scanned: number; total?: number };

/**
 * Publicar / despublicar productos en Shopify de forma MASIVA (streaming),
 * con el mismo estilo que el modal de sincronización. Cambia el estado
 * ACTIVE/DRAFT de los productos ya existentes en Shopify.
 */
export function BulkPublishButton() {
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [action, setAction] = useState<Action>("publish");
  const [onlyMatched, setOnlyMatched] = useState(false);
  const [phase, setPhase] = useState<Phase>("config");
  const [progress, setProgress] = useState<Progress>({ processed: 0, failed: 0, skipped: 0, scanned: 0 });
  const [message, setMessage] = useState("");
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void apiFetch("/api/admin-web/connections/workspace", { method: "GET" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { stores?: Array<Record<string, unknown>> }) => {
        if (!alive) return;
        setStores(
          (data.stores || []).map((s) => {
            const providers = (s.providers || {}) as Record<string, { shopDomain?: string } | null>;
            return {
              id: Number(s.id),
              name: String(s.name || `Tienda ${s.id}`),
              hasShopify: Boolean(providers.shopify),
              shopDomain: String(providers.shopify?.shopDomain || ""),
            };
          })
        );
      })
      .catch(() => setStores([]));
    return () => {
      alive = false;
    };
  }, [open]);

  const eligibleStores = useMemo(() => stores.filter((s) => s.hasShopify), [stores]);

  useEffect(() => {
    if (!eligibleStores.length) {
      setStoreId(null);
      return;
    }
    if (!eligibleStores.some((s) => s.id === storeId)) setStoreId(eligibleStores[0].id);
  }, [eligibleStores, storeId]);

  function reset() {
    setPhase("config");
    setProgress({ processed: 0, failed: 0, skipped: 0, scanned: 0 });
    setMessage("");
    cancelRef.current = false;
  }
  function close() {
    setOpen(false);
    reset();
  }

  async function run() {
    if (!storeId) {
      setMessage("Selecciona una tienda.");
      return;
    }
    reset();
    setPhase("running");
    try {
      const response = await apiFetch("/api/shopify/publish/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream: true, storeId, action, filter: { onlyMatched } }),
      });
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `bulk_publish_failed:${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(trimmed);
          } catch {
            continue;
          }
          if (evt.type === "error") throw new Error(String(evt.error || "Error al publicar"));
          setProgress((prev) => ({
            processed: typeof evt.processed === "number" ? (evt.processed as number) : prev.processed,
            failed: typeof evt.failed === "number" ? (evt.failed as number) : prev.failed,
            skipped: typeof evt.skipped === "number" ? (evt.skipped as number) : prev.skipped,
            scanned: typeof evt.scanned === "number" ? (evt.scanned as number) : prev.scanned,
            total: typeof evt.total === "number" ? (evt.total as number) : prev.total,
          }));
        }
        if (cancelRef.current) {
          void reader.cancel();
          break;
        }
      }
      setPhase("done");
      setMessage(cancelRef.current ? "Detenido." : action === "publish" ? "Productos publicados." : "Productos despublicados.");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "No se pudo completar.");
    }
  }

  return (
    <>
      <button className="btn ghost btn-compact" type="button" onClick={() => setOpen(true)}>
        Publicar masivo
      </button>
      {open ? (
        <div className="modal-backdrop" role="presentation" onClick={close}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Productos</p>
                <h3>Publicar / despublicar en Shopify</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={close}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              {phase === "config" ? (
                <>
                  <div className="field">
                    <span>Acción</span>
                    <div className="page-module-actions">
                      <button
                        type="button"
                        className={`btn btn-compact ${action === "publish" ? "primary" : "ghost"}`}
                        onClick={() => setAction("publish")}
                      >
                        Publicar
                      </button>
                      <button
                        type="button"
                        className={`btn btn-compact ${action === "unpublish" ? "primary" : "ghost"}`}
                        onClick={() => setAction("unpublish")}
                      >
                        Despublicar
                      </button>
                    </div>
                  </div>
                  <label className="field">
                    <span>Tienda</span>
                    <select
                      className="input"
                      value={storeId ?? ""}
                      onChange={(e) => setStoreId(Number(e.target.value) || null)}
                    >
                      {!eligibleStores.length ? <option value="">Sin tiendas con Shopify conectado</option> : null}
                      {eligibleStores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="field">
                    <span>Alcance</span>
                    <div className="page-module-actions">
                      <button
                        type="button"
                        className={`btn btn-compact ${!onlyMatched ? "primary" : "ghost"}`}
                        onClick={() => setOnlyMatched(false)}
                      >
                        Todos en Shopify
                      </button>
                      <button
                        type="button"
                        className={`btn btn-compact ${onlyMatched ? "primary" : "ghost"}`}
                        onClick={() => setOnlyMatched(true)}
                      >
                        Solo matcheados
                      </button>
                    </div>
                  </div>
                  <div className="page-module-actions">
                    <button className="btn primary" type="button" disabled={!storeId} onClick={() => void run()}>
                      Iniciar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="sync-progress-bar" aria-hidden="true" />
                  <div className="page-module-actions" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span className="pill pill-info">Procesados · {progress.processed}</span>
                    <span className="pill">Omitidos · {progress.skipped}</span>
                    <span className="pill pill-bad">Fallidos · {progress.failed}</span>
                    {typeof progress.total === "number" ? <span className="pill">Total · {progress.total}</span> : null}
                  </div>
                  {message ? <p className="connection-inline-note">{message}</p> : null}
                  {phase === "running" ? (
                    <button className="btn ghost btn-compact" type="button" onClick={() => (cancelRef.current = true)}>
                      Detener
                    </button>
                  ) : (
                    <button className="btn primary btn-compact" type="button" onClick={close}>
                      Cerrar
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
