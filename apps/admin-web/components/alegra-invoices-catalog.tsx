"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../lib/api";
import { DataTable } from "./ui/data-table";

type StoreOption = { id: number; name: string; hasAlegra: boolean };
type Progress = { processed: number; failed: number; scanned: number };
type Phase = "config" | "running" | "done" | "error";

type InvoiceRow = {
  id: number;
  number: string | null;
  date: string | null;
  clientName: string | null;
  clientIdentification: string | null;
  status: string | null;
  isElectronic: boolean;
  total: number | null;
  balance: number | null;
};

const money = (n: number | null) =>
  n == null ? "—" : n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function AlegraInvoicesCatalog() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  const [open, setOpen] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("config");
  const [progress, setProgress] = useState<Progress>({ processed: 0, failed: 0, scanned: 0 });
  const [message, setMessage] = useState("");
  const cancelRef = useRef(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const r = await apiFetch("/api/alegra-invoices?limit=25", { method: "GET" });
      const data = (await r.json()) as { items?: InvoiceRow[]; total?: number };
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setRows([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void apiFetch("/api/admin-web/connections/workspace", { method: "GET" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { stores?: Array<Record<string, unknown>> }) => {
        if (!alive) return;
        const mapped = (data.stores || []).map((s) => {
          const providers = (s.providers || {}) as Record<string, unknown>;
          return { id: Number(s.id), name: String(s.name || `Tienda ${s.id}`), hasAlegra: Boolean(providers.alegra) };
        });
        setStores(mapped.filter((s) => s.hasAlegra));
      })
      .catch(() => setStores([]));
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!stores.length) {
      setStoreId(null);
      return;
    }
    if (!stores.some((s) => s.id === storeId)) setStoreId(stores[0].id);
  }, [stores, storeId]);

  function reset() {
    setPhase("config");
    setProgress({ processed: 0, failed: 0, scanned: 0 });
    setMessage("");
    cancelRef.current = false;
  }
  function close() {
    setOpen(false);
    reset();
    void loadList();
  }

  async function run() {
    if (!storeId) {
      setMessage("Selecciona una tienda.");
      return;
    }
    reset();
    setPhase("running");
    try {
      const response = await apiFetch("/api/sync/invoices/from-alegra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream: true, storeId }),
      });
      if (!response.ok || !response.body) throw new Error(`sync_failed:${response.status}`);
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
          const t = line.trim();
          if (!t) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(t);
          } catch {
            continue;
          }
          if (evt.type === "error") throw new Error(String(evt.error || "Error"));
          setProgress((prev) => ({
            processed: typeof evt.processed === "number" ? (evt.processed as number) : prev.processed,
            failed: typeof evt.failed === "number" ? (evt.failed as number) : prev.failed,
            scanned: typeof evt.scanned === "number" ? (evt.scanned as number) : prev.scanned,
          }));
        }
        if (cancelRef.current) {
          void reader.cancel();
          break;
        }
      }
      setPhase("done");
      setMessage(cancelRef.current ? "Detenido." : "Facturas sincronizadas.");
      void loadList();
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "No se pudo sincronizar.");
    }
  }

  function requestCancel() {
    cancelRef.current = true;
    void apiFetch("/api/sync/invoices/from-alegra/stop", { method: "POST" }).catch(() => undefined);
  }

  const pct = useMemo(() => {
    const t = progress.scanned || progress.processed + progress.failed;
    return t > 0 ? Math.min(100, Math.round(((progress.processed + progress.failed) / t) * 100)) : 0;
  }, [progress]);

  return (
    <section className="page-module-shell">
      <div className="page-module-head">
        <div>
          <h3>Catálogo de facturas Alegra</h3>
          <small>Todas las facturas de Alegra (incluidas las que no vienen de un pedido). {total} en total.</small>
        </div>
        <div className="page-module-actions">
          <button className="btn ghost btn-compact" type="button" onClick={() => void loadList()} disabled={loadingList}>
            Refrescar
          </button>
          <button className="btn primary btn-compact" type="button" onClick={() => setOpen(true)}>
            Sincronizar facturas
          </button>
        </div>
      </div>

      <DataTable<InvoiceRow>
        rows={rows}
        getRowKey={(r) => r.id}
        emptyState="Sin facturas importadas. Usa “Sincronizar facturas” para traer el catálogo desde Alegra."
        columns={[
          {
            key: "number",
            header: "Factura",
            render: (r) => (
              <div className="entity-cell">
                <strong>
                  {r.number || "—"}
                  {r.isElectronic ? (
                    <span className="pill pill-mini pill-info" style={{ marginLeft: 6 }}>
                      FE
                    </span>
                  ) : null}
                </strong>
                <span>{r.date || "Sin fecha"}</span>
              </div>
            ),
          },
          {
            key: "client",
            header: "Cliente",
            render: (r) => (
              <div className="entity-cell">
                <strong>{r.clientName || "—"}</strong>
                <span>{r.clientIdentification || "Sin documento"}</span>
              </div>
            ),
          },
          {
            key: "status",
            header: "Estado",
            render: (r) => (
              <span className={`pill pill-mini ${r.status === "closed" ? "pill-ok" : ""}`}>{r.status || "—"}</span>
            ),
          },
          {
            key: "total",
            header: "Total",
            columnClassName: "dataTable-num",
            render: (r) => money(r.total),
          },
          {
            key: "balance",
            header: "Saldo",
            columnClassName: "dataTable-num",
            render: (r) => money(r.balance),
          },
        ]}
      />

      {open ? (
        <div className="modal-backdrop" role="presentation" onClick={close}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Facturas</p>
                <h3>Sincronizar facturas</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={close}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              {phase === "config" || phase === "error" ? (
                <>
                  <label className="connection-form-row">
                    <span>Tienda (Alegra)</span>
                    <select
                      className="input"
                      value={storeId ?? ""}
                      onChange={(e) => setStoreId(Number(e.target.value) || null)}
                    >
                      {!stores.length ? <option value="">Sin tiendas con Alegra conectado</option> : null}
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
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
                    <span className="pill pill-info">Procesadas · {progress.processed}</span>
                    <span className="pill pill-bad">Fallidas · {progress.failed}</span>
                    <span className="pill">Revisadas · {progress.scanned}</span>
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
                      <button className="btn primary" type="button" onClick={close}>
                        Listo
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
