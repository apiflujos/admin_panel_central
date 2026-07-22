"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../lib/api";

type Provider = "alegra" | "shopify";

type StoreOption = {
  id: number;
  name: string;
  hasAlegra: boolean;
  hasShopify: boolean;
  shopDomain: string;
};

type Progress = { processed: number; failed: number; skipped: number; scanned: number };
type Phase = "config" | "running" | "done" | "error";

export function SyncContactsButton() {
  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [provider, setProvider] = useState<Provider>("alegra");
  const [storeId, setStoreId] = useState<number | null>(null);
  const [onlyClients, setOnlyClients] = useState(false);
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
              hasAlegra: Boolean(providers.alegra),
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

  const eligibleStores = useMemo(
    () => stores.filter((s) => (provider === "alegra" ? s.hasAlegra : s.hasShopify)),
    [stores, provider]
  );

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
    const selected = eligibleStores.find((s) => s.id === storeId);
    reset();
    setPhase("running");
    const endpoint = provider === "alegra" ? "/api/sync/contacts/from-alegra" : "/api/sync/contacts/bulk";
    const body =
      provider === "alegra"
        ? { stream: true, storeId, onlyClients }
        : { stream: true, shopDomain: selected?.shopDomain || "", source: "shopify" };
    try {
      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `sync_failed:${response.status}`);
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
          if (evt.type === "error") throw new Error(String(evt.error || "Error en la sincronización"));
          setProgress((prev) => ({
            processed: typeof evt.processed === "number" ? (evt.processed as number) : prev.processed,
            failed: typeof evt.failed === "number" ? (evt.failed as number) : prev.failed,
            skipped: typeof evt.skipped === "number" ? (evt.skipped as number) : prev.skipped,
            scanned: typeof evt.scanned === "number" ? (evt.scanned as number) : prev.scanned,
          }));
        }
        if (cancelRef.current) {
          void reader.cancel();
          break;
        }
      }
      setPhase("done");
      setMessage(cancelRef.current ? "Sincronización detenida." : "Sincronización completada.");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "No se pudo sincronizar.");
    }
  }

  function requestCancel() {
    cancelRef.current = true;
    const stop = provider === "alegra" ? "/api/sync/contacts/from-alegra/stop" : "/api/sync/contacts/bulk/stop";
    void apiFetch(stop, { method: "POST" }).catch(() => undefined);
  }

  const total = progress.scanned || progress.processed + progress.failed + progress.skipped;
  const pct = total > 0 ? Math.min(100, Math.round(((progress.processed + progress.failed) / total) * 100)) : 0;

  return (
    <>
      <button className="btn primary btn-compact" type="button" onClick={() => setOpen(true)}>
        Sincronizar contactos
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation" onClick={close}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Contactos</p>
                <h3>Sincronizar contactos</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={close}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              {phase === "config" || phase === "error" ? (
                <>
                  <label className="connection-form-row">
                    <span>Origen</span>
                    <div className="page-module-actions">
                      <button
                        type="button"
                        className={`btn btn-compact ${provider === "alegra" ? "primary" : "ghost"}`}
                        onClick={() => setProvider("alegra")}
                      >
                        Desde Alegra
                      </button>
                      <button
                        type="button"
                        className={`btn btn-compact ${provider === "shopify" ? "primary" : "ghost"}`}
                        onClick={() => setProvider("shopify")}
                      >
                        Desde Shopify
                      </button>
                    </div>
                  </label>
                  <label className="connection-form-row">
                    <span>Tienda</span>
                    <select
                      className="input"
                      value={storeId ?? ""}
                      onChange={(e) => setStoreId(Number(e.target.value) || null)}
                    >
                      {!eligibleStores.length ? (
                        <option value="">
                          {provider === "alegra"
                            ? "Sin tiendas con Alegra conectado"
                            : "Sin tiendas con Shopify conectado"}
                        </option>
                      ) : null}
                      {eligibleStores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {provider === "alegra" ? (
                    <label className="connection-form-row">
                      <span>Tipo</span>
                      <div className="page-module-actions">
                        <button
                          type="button"
                          className={`btn btn-compact ${!onlyClients ? "primary" : "ghost"}`}
                          onClick={() => setOnlyClients(false)}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          className={`btn btn-compact ${onlyClients ? "primary" : "ghost"}`}
                          onClick={() => setOnlyClients(true)}
                        >
                          Solo clientes
                        </button>
                      </div>
                    </label>
                  ) : null}
                  {message ? <p className="app-state-copy">{message}</p> : null}
                  <div className="page-module-actions">
                    <button
                      className="btn primary"
                      type="button"
                      disabled={!storeId}
                      onClick={() => {
                        void run();
                      }}
                    >
                      Iniciar sincronización
                    </button>
                  </div>
                </>
              ) : null}

              {phase === "running" || phase === "done" ? (
                <>
                  <div className="sync-progress-bar" aria-hidden="true">
                    <div
                      style={{
                        width: `${phase === "done" ? 100 : pct}%`,
                        height: 8,
                        background: "var(--accent, #6d28d9)",
                        borderRadius: 999,
                        transition: "width .3s ease",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                    <span className="pill pill-info">Procesados · {progress.processed}</span>
                    <span className="pill">Omitidos · {progress.skipped}</span>
                    <span className="pill pill-bad">Fallidos · {progress.failed}</span>
                    <span className="pill">Revisados · {progress.scanned}</span>
                  </div>
                  {message ? (
                    <p className="app-state-copy" style={{ marginTop: 12 }}>
                      {message}
                    </p>
                  ) : null}
                  <div className="page-module-actions" style={{ marginTop: 12 }}>
                    {phase === "running" ? (
                      <button className="btn ghost" type="button" onClick={requestCancel}>
                        Detener
                      </button>
                    ) : (
                      <>
                        <button className="btn ghost" type="button" onClick={reset}>
                          Otra sincronización
                        </button>
                        <button className="btn primary" type="button" onClick={close}>
                          Listo
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
