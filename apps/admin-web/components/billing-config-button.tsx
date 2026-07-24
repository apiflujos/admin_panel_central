"use client";

import { useEffect, useState } from "react";

import type { AdminWebInvoiceSettings } from "../lib/api";
import { getAlegraCatalog, getGlobalSettings, getSettingsResolutions, saveGlobalInvoiceSettings } from "../lib/api";

type CatalogOption = {
  value: string;
  label: string;
};

const defaultInvoiceSettings: AdminWebInvoiceSettings = {
  generateInvoice: false,
  resolutionId: "",
  warehouseId: "",
  costCenterId: "",
  sellerId: "",
  paymentMethod: "",
  bankAccountId: "",
  applyPayment: false,
  observationsTemplate: "",
  einvoiceEnabled: false,
};

function normalizeOption(item: Record<string, unknown>): CatalogOption | null {
  const value = String(item.id || item._id || "").trim();
  if (!value) return null;
  const label =
    String(
      item.name || item.number || item.code || item.email || item.description || item.value || `ID ${value}`
    ).trim() || `ID ${value}`;
  return { value, label };
}

function mapCatalogOptions(payload: { items?: Array<Record<string, unknown>>; error?: string }) {
  if (payload.error) {
    throw new Error(payload.error);
  }
  return ((payload.items || []).map(normalizeOption).filter(Boolean) as CatalogOption[]).sort((left, right) =>
    String(left.label || "").localeCompare(String(right.label || ""), "es")
  );
}

export function BillingConfigButton() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AdminWebInvoiceSettings>(defaultInvoiceSettings);
  const [resolutions, setResolutions] = useState<CatalogOption[]>([]);
  const [warehouses, setWarehouses] = useState<CatalogOption[]>([]);
  const [costCenters, setCostCenters] = useState<CatalogOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<CatalogOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CatalogOption[]>([]);
  const [catalogWarnings, setCatalogWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setSaveState("idle");
    setMessage("");
    setCatalogWarnings([]);
    // Carga resiliente: cada catálogo se carga por separado. Si UNO falla
    // (p.ej. Alegra 403 en /paymentMethods), los demás igual se muestran.
    const loadCatalog = async (
      label: string,
      loader: () => Promise<Parameters<typeof mapCatalogOptions>[0]>,
      setter: (opts: CatalogOption[]) => void
    ) => {
      try {
        const payload = await loader();
        if (cancelled) return;
        setter(mapCatalogOptions(payload));
      } catch (error) {
        if (cancelled) return;
        setter([]);
        const msg = error instanceof Error ? error.message : "no disponible";
        setCatalogWarnings((prev) => (prev.includes(`${label}: ${msg}`) ? prev : [...prev, `${label}: ${msg}`]));
      }
    };

    getGlobalSettings()
      .then((globalSettings) => {
        if (!cancelled) setSettings({ ...defaultInvoiceSettings, ...(globalSettings.invoice || {}) });
      })
      .catch(() => undefined);

    Promise.allSettled([
      loadCatalog("Resolución", getSettingsResolutions, setResolutions),
      loadCatalog("Bodega", () => getAlegraCatalog("warehouses"), setWarehouses),
      loadCatalog("Centro de costo", () => getAlegraCatalog("cost-centers"), setCostCenters),
      loadCatalog("Método de pago", () => getAlegraCatalog("payment-methods"), setPaymentMethods),
      loadCatalog("Banco", () => getAlegraCatalog("bank-accounts"), setBankAccounts),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function close() {
    setOpen(false);
    setSaveState("idle");
    setMessage("");
  }

  async function save() {
    setSaveState("saving");
    setMessage("");
    try {
      // Preserva los campos no expuestos en este modal (bodega, centro de costo,
      // vendedor, observaciones) tomándolos del estado ya cargado.
      await saveGlobalInvoiceSettings(settings);
      setSaveState("saved");
      setMessage("Configuración de facturación guardada.");
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    }
  }

  return (
    <>
      <button className="btn ghost btn-compact" type="button" onClick={() => setOpen(true)}>
        Configurar facturación
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation" onClick={close}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Facturación</p>
                <h3>Configuración de facturación</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={close}>
                Cerrar
              </button>
            </div>

            <div className="modal-body">
              {loading ? (
                <p className="app-state-copy">Cargando configuración...</p>
              ) : (
                <>
                  {catalogWarnings.length ? (
                    <p className="app-state-copy" style={{ color: "var(--warn, #b45309)" }}>
                      Algunos catálogos de Alegra no cargaron: {catalogWarnings.join(" · ")}. El resto sí se puede
                      configurar.
                    </p>
                  ) : null}

                  <label className="connection-form-row">
                    <span>Generar factura</span>
                    <div className="page-module-actions">
                      <button
                        type="button"
                        className={`btn btn-compact ${settings.generateInvoice ? "primary" : "ghost"}`}
                        onClick={() => setSettings((current) => ({ ...current, generateInvoice: true }))}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        className={`btn btn-compact ${!settings.generateInvoice ? "primary" : "ghost"}`}
                        onClick={() => setSettings((current) => ({ ...current, generateInvoice: false }))}
                      >
                        No
                      </button>
                    </div>
                  </label>

                  <label className="connection-form-row">
                    <span>Factura electrónica</span>
                    <div className="page-module-actions">
                      <button
                        type="button"
                        className={`btn btn-compact ${settings.einvoiceEnabled ? "primary" : "ghost"}`}
                        onClick={() => setSettings((current) => ({ ...current, einvoiceEnabled: true }))}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        className={`btn btn-compact ${!settings.einvoiceEnabled ? "primary" : "ghost"}`}
                        onClick={() => setSettings((current) => ({ ...current, einvoiceEnabled: false }))}
                      >
                        No
                      </button>
                    </div>
                  </label>

                  {settings.generateInvoice ? (
                    <>
                      <label className="connection-form-row">
                        <span>Resolución DIAN</span>
                        <select
                          className="input"
                          value={settings.resolutionId}
                          onChange={(e) => setSettings((current) => ({ ...current, resolutionId: e.target.value }))}
                        >
                          <option value="">No usar</option>
                          {!resolutions.length ? <option value="" disabled>Sin datos</option> : null}
                          {resolutions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="connection-form-row">
                        <span>Bodega</span>
                        <select
                          className="input"
                          value={settings.warehouseId}
                          onChange={(e) => setSettings((current) => ({ ...current, warehouseId: e.target.value }))}
                        >
                          <option value="">No usar</option>
                          {!warehouses.length ? <option value="" disabled>Sin datos</option> : null}
                          {warehouses.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="connection-form-row">
                        <span>Centro de costo</span>
                        <select
                          className="input"
                          value={settings.costCenterId}
                          onChange={(e) => setSettings((current) => ({ ...current, costCenterId: e.target.value }))}
                        >
                          <option value="">No usar</option>
                          {!costCenters.length ? <option value="" disabled>Sin datos</option> : null}
                          {costCenters.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}

                  <label className="connection-form-row">
                    <span>Aplicar pago</span>
                    <div className="page-module-actions">
                      <button
                        type="button"
                        className={`btn btn-compact ${settings.applyPayment ? "primary" : "ghost"}`}
                        onClick={() => setSettings((current) => ({ ...current, applyPayment: true }))}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        className={`btn btn-compact ${!settings.applyPayment ? "primary" : "ghost"}`}
                        onClick={() => setSettings((current) => ({ ...current, applyPayment: false }))}
                      >
                        No
                      </button>
                    </div>
                  </label>

                  {settings.applyPayment ? (
                    <>
                      <label className="connection-form-row">
                        <span>Método de pago</span>
                        <select
                          className="input"
                          value={settings.paymentMethod}
                          onChange={(e) => setSettings((current) => ({ ...current, paymentMethod: e.target.value }))}
                        >
                          <option value="">No usar</option>
                          {!paymentMethods.length ? <option value="" disabled>Sin datos</option> : null}
                          {paymentMethods.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="connection-form-row">
                        <span>Cuenta de banco</span>
                        <select
                          className="input"
                          value={settings.bankAccountId}
                          onChange={(e) => setSettings((current) => ({ ...current, bankAccountId: e.target.value }))}
                        >
                          <option value="">No usar</option>
                          {!bankAccounts.length ? <option value="" disabled>Sin datos</option> : null}
                          {bankAccounts.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}

                  {message ? (
                    <p
                      className={
                        saveState === "error"
                          ? "connection-inline-note connection-inline-note-error"
                          : "connection-inline-note"
                      }
                    >
                      {message}
                    </p>
                  ) : null}

                  <div className="page-module-actions">
                    <button
                      className="btn primary"
                      type="button"
                      disabled={saveState === "saving"}
                      onClick={() => void save()}
                    >
                      {saveState === "saving" ? "Guardando..." : "Guardar"}
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
