"use client";

import { useEffect, useMemo, useState } from "react";

import type { AdminWebInvoiceSettings } from "../lib/api";
import { getAlegraCatalog, getGlobalSettings, getSettingsResolutions, saveGlobalInvoiceSettings } from "../lib/api";
import type { WorkspaceStore } from "../lib/connections-workspace";
import { BooleanChoice } from "./ui/boolean-choice";

type CatalogOption = {
  value: string;
  label: string;
};

const observationOptions = [
  { key: "order_name", label: "Pedido", line: "Pedido: {{order.name}}" },
  { key: "customer_name", label: "Cliente", line: "Cliente: {{customer.name}}" },
  { key: "customer_email", label: "Email", line: "Email: {{customer.email}}" },
  { key: "order_total", label: "Total", line: "Total: {{order.total}} {{order.currency}}" },
  { key: "payment_gateways", label: "Pago", line: "Pago: {{order.payment_gateways}}" },
  { key: "items_summary", label: "Productos", line: "Productos: {{order.items_summary}}" },
] as const;

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

function isEqualInvoiceSettings(left: AdminWebInvoiceSettings, right: AdminWebInvoiceSettings) {
  return (
    left.generateInvoice === right.generateInvoice &&
    left.resolutionId === right.resolutionId &&
    left.warehouseId === right.warehouseId &&
    left.costCenterId === right.costCenterId &&
    left.sellerId === right.sellerId &&
    left.paymentMethod === right.paymentMethod &&
    left.bankAccountId === right.bankAccountId &&
    left.applyPayment === right.applyPayment &&
    left.observationsTemplate === right.observationsTemplate &&
    left.einvoiceEnabled === right.einvoiceEnabled
  );
}

function mapCatalogOptions(payload: { items?: Array<Record<string, unknown>>; error?: string }) {
  if (payload.error) {
    throw new Error(payload.error);
  }
  return (payload.items || []).map(normalizeOption).filter(Boolean) as CatalogOption[];
}

function parseObservationTemplate(template: string) {
  const selectedKeys: string[] = [];
  const extraLines: string[] = [];
  const lines = String(template || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const matched = observationOptions.find((option) => option.line === line);
    if (matched) {
      selectedKeys.push(matched.key);
    } else {
      extraLines.push(line);
    }
  }

  return {
    selectedKeys,
    extra: extraLines.join("\n"),
  };
}

function buildObservationTemplate(selectedKeys: string[], extra: string) {
  const lines: string[] = observationOptions
    .filter((option) => selectedKeys.includes(option.key))
    .map((option) => option.line);
  const trimmedExtra = String(extra || "").trim();
  if (trimmedExtra) {
    lines.push(trimmedExtra);
  }
  return lines.join("\n").trim();
}

export function GlobalInvoiceSettingsPanel({
  stores,
  activeStoreId,
}: {
  stores: WorkspaceStore[];
  activeStoreId: number | null;
}) {
  const [settings, setSettings] = useState<AdminWebInvoiceSettings>(defaultInvoiceSettings);
  const [baseline, setBaseline] = useState<AdminWebInvoiceSettings>(defaultInvoiceSettings);
  const [alegraConnected, setAlegraConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resolutions, setResolutions] = useState<CatalogOption[]>([]);
  const [costCenters, setCostCenters] = useState<CatalogOption[]>([]);
  const [warehouses, setWarehouses] = useState<CatalogOption[]>([]);
  const [sellers, setSellers] = useState<CatalogOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<CatalogOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CatalogOption[]>([]);
  const [observationKeys, setObservationKeys] = useState<string[]>([]);
  const [observationsExtra, setObservationsExtra] = useState("");

  const activeStore = useMemo(
    () => stores.find((store) => store.id === activeStoreId) ?? stores[0] ?? null,
    [activeStoreId, stores]
  );
  const activeShopDomain = activeStore?.providers.shopify?.shopDomain || "";
  const dirty = useMemo(() => !isEqualInvoiceSettings(settings, baseline), [baseline, settings]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getGlobalSettings()
      .then((data) => {
        if (cancelled) return;
        const nextSettings = { ...defaultInvoiceSettings, ...(data.invoice || {}) };
        const observationState = parseObservationTemplate(nextSettings.observationsTemplate || "");
        setSettings(nextSettings);
        setBaseline(nextSettings);
        setObservationKeys(observationState.selectedKeys);
        setObservationsExtra(observationState.extra);
        setAlegraConnected(Boolean(data.alegra?.hasApiKey) && !data.alegra?.needsReconnect);
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "No se pudo cargar la configuración global.");
        setSaveState("error");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCatalogsLoading(true);
    Promise.all([
      getSettingsResolutions(activeShopDomain),
      getAlegraCatalog("cost-centers", activeShopDomain),
      getAlegraCatalog("warehouses", activeShopDomain),
      getAlegraCatalog("sellers", activeShopDomain),
      getAlegraCatalog("payment-methods", activeShopDomain),
      getAlegraCatalog("bank-accounts", activeShopDomain),
    ])
      .then(
        ([
          resolutionsPayload,
          costCentersPayload,
          warehousesPayload,
          sellersPayload,
          paymentMethodsPayload,
          bankAccountsPayload,
        ]) => {
          if (cancelled) return;
          setResolutions(mapCatalogOptions(resolutionsPayload));
          setCostCenters(mapCatalogOptions(costCentersPayload));
          setWarehouses(mapCatalogOptions(warehousesPayload));
          setSellers(mapCatalogOptions(sellersPayload));
          setPaymentMethods(mapCatalogOptions(paymentMethodsPayload));
          setBankAccounts(mapCatalogOptions(bankAccountsPayload));
        }
      )
      .catch((error) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "No se pudieron cargar los catálogos de factura.");
        setSaveState("error");
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeShopDomain]);

  useEffect(() => {
    const nextTemplate = buildObservationTemplate(observationKeys, observationsExtra);
    setSettings((current) =>
      current.observationsTemplate === nextTemplate ? current : { ...current, observationsTemplate: nextTemplate }
    );
  }, [observationKeys, observationsExtra]);

  async function saveCurrentSettings() {
    setSaveState("saving");
    setMessage("");
    try {
      await saveGlobalInvoiceSettings(settings);
      setBaseline(settings);
      setSaveState("saved");
      setMessage("Configuración global de factura guardada.");
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración global.");
    }
  }

  function toggleObservationKey(key: string, checked: boolean) {
    setObservationKeys((current) => {
      const next = checked ? [...current, key] : current.filter((item) => item !== key);
      return observationOptions.map((option) => option.key).filter((optionKey) => next.includes(optionKey));
    });
  }

  function renderSelect(
    label: string,
    value: string,
    options: CatalogOption[],
    onChange: (value: string) => void,
    optionsConfig: {
      allowEmpty?: boolean;
      emptyLabel?: string;
      help?: string;
      span2?: boolean;
    } = {}
  ) {
    return (
      <label className={`store-config-field${optionsConfig.span2 ? " store-config-field-span-2" : ""}`}>
        <span>{label}</span>
        <select
          className="input"
          value={value}
          disabled={catalogsLoading || loading}
          onChange={(event) => onChange(event.target.value)}
        >
          {optionsConfig.allowEmpty ? <option value="">{optionsConfig.emptyLabel || "No usar"}</option> : null}
          {!options.length ? <option value="">{catalogsLoading ? "Cargando..." : "Sin datos"}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {optionsConfig.help ? <small>{optionsConfig.help}</small> : null}
      </label>
    );
  }

  return (
    <section className="card connection-card">
      <div className="connection-card-head">
        <div>
          <h3>Factura global</h3>
          <p>Valores globales de facturación, pago y e-factura para el cliente.</p>
        </div>
        <div className="connection-card-actions">
          <span className={`pill ${alegraConnected ? "pill-ok" : "pill-warn"}`}>
            {alegraConnected ? "Alegra conectada" : "Alegra pendiente"}
          </span>
          {activeStore ? <span className="pill">Contexto · {activeStore.name}</span> : null}
        </div>
      </div>

      <div className="settings-subsection">
        <div className="settings-subsection-head">
          <strong>Defaults de comportamiento</strong>
          <span>Toggles base para facturación y e-factura</span>
        </div>
        <div className="store-configs-grid">
          <BooleanChoice
            label="Generar factura"
            value={settings.generateInvoice}
            onChange={(next) => setSettings((current) => ({ ...current, generateInvoice: next }))}
            positive="Activo"
            negative="Apagado"
            help="Default global para pedidos Shopify → Alegra."
            disabled={loading}
          />

          <BooleanChoice
            label="Habilitar e-factura"
            value={settings.einvoiceEnabled}
            onChange={(next) => setSettings((current) => ({ ...current, einvoiceEnabled: next }))}
            positive="Exigir"
            negative="No exigir"
            help="Activa validaciones fiscales adicionales cuando aplique."
            disabled={loading}
          />

          <BooleanChoice
            label="Aplicar pago"
            value={settings.applyPayment}
            onChange={(next) => setSettings((current) => ({ ...current, applyPayment: next }))}
            positive="Sí"
            negative="No"
            help="Si está activo, también debes definir medio de pago y cuenta bancaria."
            disabled={loading}
          />

          <div className="store-config-field">
            <span>Configuración avanzada</span>
            <a className="btn ghost btn-compact" href="/legacy/settings/connections">
              Abrir
            </a>
            <small>Builder avanzado de observaciones y opciones que no están aquí.</small>
          </div>
        </div>
      </div>

      <details className="settings-collapsible" open>
        <summary className="settings-collapsible-summary">
          <strong>Catálogos Alegra</strong>
          <span>Documento y recaudo resueltos con la cuenta de la tienda activa</span>
        </summary>
        <div className="settings-subsection">
          <div className="settings-subsection-head">
            <strong>Documento</strong>
            <span>Defaults fiscales y de emisión</span>
          </div>
          <p className="connection-inline-note">
            Estos catálogos salen de la cuenta Alegra asociada a la tienda activa; si cambias de tienda, cambia el
            contexto disponible.
          </p>
          <div className="store-configs-grid">
            {renderSelect(
              "Resolución DIAN",
              settings.resolutionId,
              resolutions,
              (value) => setSettings((current) => ({ ...current, resolutionId: value })),
              { allowEmpty: true, emptyLabel: "No usar", help: "Se resuelve por la cuenta Alegra de la tienda activa." }
            )}
            {renderSelect(
              "Centro de costo",
              settings.costCenterId,
              costCenters,
              (value) => setSettings((current) => ({ ...current, costCenterId: value })),
              { allowEmpty: true, emptyLabel: "No usar" }
            )}
            {renderSelect(
              "Bodega",
              settings.warehouseId,
              warehouses,
              (value) => setSettings((current) => ({ ...current, warehouseId: value })),
              { allowEmpty: true, emptyLabel: "No usar" }
            )}
            {renderSelect(
              "Vendedor",
              settings.sellerId,
              sellers,
              (value) => setSettings((current) => ({ ...current, sellerId: value })),
              { allowEmpty: true, emptyLabel: "No usar" }
            )}
          </div>
        </div>
        <div className="settings-subsection">
          <div className="settings-subsection-head">
            <strong>Pago</strong>
            <span>Solo aplica cuando `Aplicar pago` está activo</span>
          </div>
          <p className="connection-inline-note">
            Completa este bloque solo cuando el toggle `Aplicar pago` quede activo en la parte superior.
          </p>
          <div className="store-configs-grid">
            {renderSelect(
              "Medio de pago",
              settings.paymentMethod,
              paymentMethods,
              (value) => setSettings((current) => ({ ...current, paymentMethod: value })),
              { allowEmpty: true, emptyLabel: "No usar" }
            )}
            {renderSelect(
              "Cuenta bancaria",
              settings.bankAccountId,
              bankAccounts,
              (value) => setSettings((current) => ({ ...current, bankAccountId: value })),
              { allowEmpty: true, emptyLabel: "No usar" }
            )}
          </div>
        </div>
      </details>

      <details className="settings-collapsible">
        <summary className="settings-collapsible-summary">
          <strong>Observaciones</strong>
          <span>Builder avanzado del template persistido</span>
        </summary>
        <div className="settings-subsection">
          <div className="store-configs-grid">
            <div className="store-config-field store-config-field-span-2">
              <span>Builder de observaciones</span>
              <div className="store-warehouse-grid">
                {observationOptions.map((option) => (
                  <label className="store-warehouse-option" key={option.key}>
                    <input
                      type="checkbox"
                      checked={observationKeys.includes(option.key)}
                      disabled={loading}
                      onChange={(event) => toggleObservationKey(option.key, event.target.checked)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <small>Compone el texto final usando bloques reutilizables.</small>
            </div>

            <label className="store-config-field store-config-field-span-2">
              <span>Observaciones extra</span>
              <textarea
                className="input textarea-control"
                value={observationsExtra}
                disabled={loading}
                onChange={(event) => setObservationsExtra(event.target.value)}
                placeholder="Líneas extra fuera de los placeholders predefinidos."
              />
              <small>Se agregan al final del texto generado.</small>
            </label>

            <label className="store-config-field store-config-field-span-2">
              <span>Preview del template</span>
              <textarea
                className="input textarea-control"
                value={settings.observationsTemplate}
                readOnly
                placeholder="Se genera automáticamente."
              />
              <small>Vista previa del texto que se guarda en configuración.</small>
            </label>
          </div>
        </div>
      </details>

      {message ? (
        <p
          className={
            saveState === "error" ? "connection-inline-note connection-inline-note-error" : "connection-inline-note"
          }
        >
          {message}
        </p>
      ) : null}

      <div className="connection-card-actions">
        <button
          className="btn primary"
          type="button"
          disabled={!dirty || loading || saveState === "saving"}
          onClick={() => void saveCurrentSettings()}
        >
          {saveState === "saving" ? "Guardando..." : "Guardar factura global"}
        </button>
        <button
          className="btn ghost"
          type="button"
          disabled={!dirty || loading || saveState === "saving"}
          onClick={() => {
            setSettings(baseline);
            const observationState = parseObservationTemplate(baseline.observationsTemplate || "");
            setObservationKeys(observationState.selectedKeys);
            setObservationsExtra(observationState.extra);
            setSaveState("idle");
            setMessage("");
          }}
        >
          Revertir cambios
        </button>
      </div>
    </section>
  );
}
