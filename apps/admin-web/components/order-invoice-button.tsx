"use client";

import { useState } from "react";

import { apiFetch } from "../lib/api";

type Phase = "idle" | "sending" | "done" | "error";

export function OrderInvoiceButton({
  orderId,
  alreadyInvoiced,
}: {
  orderId: string | null;
  alreadyInvoiced: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [electronic, setElectronic] = useState(false);
  const [idType, setIdType] = useState("CC");
  const [idNumber, setIdNumber] = useState("");
  const [fiscalName, setFiscalName] = useState("");

  if (!orderId || alreadyInvoiced) {
    return alreadyInvoiced ? <span className="pill pill-ok pill-sm">Facturado</span> : <span>—</span>;
  }

  function reset() {
    setPhase("idle");
    setMessage("");
  }

  async function generate(asElectronic: boolean) {
    setPhase("sending");
    setMessage("");
    try {
      const body: Record<string, unknown> = { electronic: asElectronic };
      if (asElectronic) {
        body.idType = idType;
        body.idNumber = idNumber;
        body.fiscalName = fiscalName;
      }
      const res = await apiFetch(`/api/operations/${encodeURIComponent(orderId!)}/generate-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data?.error === "missing_einvoice_data") {
        setPhase("error");
        setMessage(`Faltan datos fiscales: ${(data.missing || []).join(", ") || "identificación"}`);
        return;
      }
      if (!res.ok) {
        setPhase("error");
        setMessage(data?.error || `Error ${res.status}`);
        return;
      }
      setPhase("done");
      setMessage(asElectronic ? "Factura electrónica generada." : "Factura generada.");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "No se pudo generar la factura.");
    }
  }

  return (
    <>
      <button
        className="btn ghost btn-compact"
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        Facturar
      </button>

      {open ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Pedido #{orderId}</p>
                <h3>Generar factura</h3>
              </div>
              <button
                className="btn ghost btn-compact"
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="modal-body">
              {phase === "done" ? (
                <p className="app-state-copy">{message}</p>
              ) : (
                <>
                  <label className="connection-form-row">
                    <span>Tipo</span>
                    <div className="page-module-actions">
                      <button
                        type="button"
                        className={`btn btn-compact ${!electronic ? "primary" : "ghost"}`}
                        onClick={() => setElectronic(false)}
                      >
                        Factura normal
                      </button>
                      <button
                        type="button"
                        className={`btn btn-compact ${electronic ? "primary" : "ghost"}`}
                        onClick={() => setElectronic(true)}
                      >
                        Factura electrónica
                      </button>
                    </div>
                  </label>

                  {electronic ? (
                    <>
                      <label className="connection-form-row">
                        <span>Tipo doc.</span>
                        <select className="input" value={idType} onChange={(e) => setIdType(e.target.value)}>
                          <option value="CC">Cédula (CC)</option>
                          <option value="NIT">NIT</option>
                          <option value="CE">Cédula extranjería (CE)</option>
                          <option value="PP">Pasaporte (PP)</option>
                        </select>
                      </label>
                      <label className="connection-form-row">
                        <span>Número doc.</span>
                        <input
                          className="input"
                          value={idNumber}
                          onChange={(e) => setIdNumber(e.target.value)}
                          placeholder="Identificación fiscal"
                        />
                      </label>
                      <label className="connection-form-row">
                        <span>Nombre fiscal</span>
                        <input
                          className="input"
                          value={fiscalName}
                          onChange={(e) => setFiscalName(e.target.value)}
                          placeholder="Nombre o razón social"
                        />
                      </label>
                    </>
                  ) : null}

                  {message ? <p className="app-state-copy">{message}</p> : null}

                  <div className="page-module-actions">
                    <button
                      className="btn primary"
                      type="button"
                      disabled={phase === "sending"}
                      onClick={() => generate(electronic)}
                    >
                      {phase === "sending"
                        ? "Generando..."
                        : electronic
                          ? "Generar factura electrónica"
                          : "Generar factura"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
