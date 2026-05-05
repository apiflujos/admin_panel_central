"use client";

import { useEffect, useMemo, useState } from "react";

import type { ConnectionStatusDto, SettingsOverviewDto } from "../../../packages/shared/src/admin-web";
import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { copyStoreConfigFrom } from "../lib/api";
import { toneForStatus } from "../lib/status";
import { GlobalInvoiceSettingsPanel } from "./global-invoice-settings-panel";
import { LegacySyncCompatibilityPanel } from "./legacy-sync-compatibility-panel";
import { StoreConfigPriceListsPanel } from "./store-config-price-lists-panel";
import { StoreConfigsCriticalPanel } from "./store-configs-critical-panel";
import { StoreSyncActionsPanel } from "./store-sync-actions-panel";
import { StoreSyncAutomationPanel } from "./store-sync-automation-panel";
import { StoreMarketingConfigPanel } from "./store-marketing-config-panel";
import { StoreSyncModulesPanel } from "./store-sync-modules-panel";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { ProviderMark } from "./ui/provider-mark";
import { StageGuide } from "./ui/stage-guide";
import { StatusPill } from "./ui/status-pill";

type ConnectionRow = ConnectionStatusDto & { id: string };

type WebhookStatus = {
  ok: boolean;
  total: number;
  connected: number;
  missing: string[];
  callbackUrl?: string;
};

type ConfigFlowStage = "channels" | "operations" | "invoice" | "marketing" | "legacy";
type ConnectionWizardStep = "store" | "group" | "platform" | "form";
type ConnectionWizardGroup = "commerce" | "accounting" | "ads";
type ConnectionWizardPlatform =
  | "shopify"
  | "woocommerce"
  | "alegra"
  | "google-ads"
  | "meta-ads"
  | "tiktok-ads"
  | "shopify-marketing";

const stageMeta: Record<ConfigFlowStage, { title: string; description: string; checklist: string[]; next: string }> = {
  channels: {
    title: "Conexiones",
    description: "Conecta tiendas y proveedores antes de tocar reglas operativas, contables o de marketing.",
    checklist: ["Elegir tienda", "Conectar Shopify/WooCommerce/Alegra", "Validar Ads y webhooks"],
    next: "Luego pasa a Operación para reglas y logística.",
  },
  operations: {
    title: "Configuración operativa",
    description: "Define sync, traslados, inventario y publicación automática por tienda.",
    checklist: ["Ajustar flujo core", "Revisar traslados", "Validar inventario y publicación"],
    next: "Después revisa Facturación para defaults globales.",
  },
  invoice: {
    title: "Facturación",
    description: "Resuelve defaults de documento, pago y observaciones a nivel cliente.",
    checklist: ["Activar factura/e-factura", "Cargar catálogos Alegra", "Revisar observaciones"],
    next: "Luego valida Marketing si usas pixel y webhooks.",
  },
  marketing: {
    title: "Marketing",
    description: "Prepara pixel, script y webhooks por tienda Shopify antes de mirar analítica.",
    checklist: ["Elegir tienda", "Copiar script", "Validar webhooks"],
    next: "Si falta algo no vuelvas al dashboard; corrígelo aquí primero.",
  },
  legacy: {
    title: "Compatibilidad heredada",
    description: "Solo para casos que aún no están en la superficie nueva o ajustes avanzados todavía no migrados.",
    checklist: [
      "Usar la superficie heredada con criterio",
      "Evitar tocarlo si ya existe flujo nuevo",
      "Salir apenas cierres el ajuste",
    ],
    next: "Vuelve al flujo nuevo apenas cierres el caso pendiente.",
  },
};

function wizardPlatformHint(platform: ConnectionWizardPlatform | null) {
  if (platform === "shopify") {
    return "Usa el dominio técnico `myshopify.com`. El OAuth y los webhooks dependen de ese identificador exacto.";
  }
  if (platform === "woocommerce") {
    return "Primero fija el dominio y luego las llaves de API. Sin ambas piezas no se puede restablecer el sync.";
  }
  if (platform === "alegra") {
    return "Define primero si reutilizas una cuenta existente o si cargarás credenciales nuevas en la base activa.";
  }
  if (platform === "google-ads" || platform === "meta-ads" || platform === "tiktok-ads") {
    return "Captura primero el identificador de cuenta correcto. Después OAuth completa permisos y refresh token.";
  }
  if (platform === "shopify-marketing") {
    return "El pixel, script y webhooks ya viven en el submódulo propio de marketing.";
  }
  return "Completa solo los datos mínimos para abrir o restablecer la conexión.";
}

export function SettingsConnectionsPage({
  overview,
  connections,
  summary,
  workspace,
  callbackState,
  initialStoreId,
}: {
  overview: SettingsOverviewDto;
  connections: ConnectionRow[];
  summary: {
    total: number;
    connectedCount: number;
    attentionCount: number;
    disconnectedCount: number;
  };
  workspace: ConnectionsWorkspace;
  callbackState?: {
    onboard?: string;
    oauthError?: string;
    connections?: boolean;
  };
  initialStoreId?: number | null;
}) {
  const [selected, setSelected] = useState<ConnectionRow | null>(null);
  const [workspaceState, setWorkspaceState] = useState<ConnectionsWorkspace>(workspace);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(workspace.stores[0]?.id ?? null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState<string>("");
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [isConnectionFlowOpen, setIsConnectionFlowOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<ConfigFlowStage>("channels");
  const [connectionWizardStep, setConnectionWizardStep] = useState<ConnectionWizardStep>("store");
  const [connectionWizardGroup, setConnectionWizardGroup] = useState<ConnectionWizardGroup | null>(null);
  const [connectionWizardPlatform, setConnectionWizardPlatform] = useState<ConnectionWizardPlatform | null>(null);
  const [newStoreName, setNewStoreName] = useState("");
  const [copySourceStoreId, setCopySourceStoreId] = useState<number | null>(null);
  const [reconnectKind, setReconnectKind] = useState<"shopify" | "woocommerce" | "alegra" | null>(null);
  const [shopifyDomainInput, setShopifyDomainInput] = useState("");
  const [wooDomain, setWooDomain] = useState("");
  const [wooConsumerKey, setWooConsumerKey] = useState("");
  const [wooConsumerSecret, setWooConsumerSecret] = useState("");
  const [alegraMode, setAlegraMode] = useState<"existing" | "manual">("existing");
  const [alegraAccountId, setAlegraAccountId] = useState("");
  const [alegraEmail, setAlegraEmail] = useState("");
  const [alegraApiKey, setAlegraApiKey] = useState("");
  const [alegraEnvironment, setAlegraEnvironment] = useState("prod");
  const [googleAdsCustomerId, setGoogleAdsCustomerId] = useState("");
  const [metaAdsAccountId, setMetaAdsAccountId] = useState("");
  const [tiktokAdsAdvertiserId, setTiktokAdsAdvertiserId] = useState("");

  useEffect(() => {
    setWorkspaceState(workspace);
    setSelectedStoreId((current) => {
      if (initialStoreId && workspace.stores.some((store) => store.id === initialStoreId)) {
        return initialStoreId;
      }
      return current ?? workspace.stores[0]?.id ?? null;
    });
  }, [initialStoreId, workspace]);

  useEffect(() => {
    if (!callbackState) return;
    if (callbackState.oauthError) {
      setStatusMessage(`OAuth error: ${callbackState.oauthError}`);
      return;
    }
    if (callbackState.onboard) {
      const matchedStore = workspace.stores.find(
        (store) => store.providers.shopify?.shopDomain === callbackState.onboard
      );
      if (matchedStore) {
        setSelectedStoreId(matchedStore.id);
      }
      setStatusMessage(`Shopify conectado correctamente para ${callbackState.onboard}.`);
      return;
    }
    if (callbackState.connections) {
      setStatusMessage("Credenciales actualizadas. Revisa el estado de conexiones en esta vista.");
    }
  }, [callbackState, workspace.stores]);

  const selectedStore = useMemo(
    () => workspaceState.stores.find((store) => store.id === selectedStoreId) ?? workspaceState.stores[0] ?? null,
    [selectedStoreId, workspaceState.stores]
  );
  const activeConfig = useMemo(
    () => workspaceState.storeConfigs.find((config) => config.storeId === selectedStoreId) ?? null,
    [selectedStoreId, workspaceState.storeConfigs]
  );
  const copyableSourceStores = useMemo(
    () =>
      workspaceState.storeConfigs
        .filter((config) => config.storeId !== selectedStore?.id)
        .map((config) => ({
          storeId: config.storeId,
          storeName: config.storeName,
        })),
    [selectedStore?.id, workspaceState.storeConfigs]
  );
  const stageGuide = stageMeta[activeStage];

  useEffect(() => {
    setCopySourceStoreId((current) => {
      if (!copyableSourceStores.length) return null;
      if (current && copyableSourceStores.some((item) => item.storeId === current)) return current;
      return copyableSourceStores[0]?.storeId ?? null;
    });
  }, [copyableSourceStores]);

  const commerceRows = workspaceState.stores.flatMap(
    (store) =>
      [
        store.providers.shopify
          ? {
              key: `shopify:${store.id}`,
              provider: "Shopify",
              storeName: store.name,
              label: store.providers.shopify.label,
              status: store.providers.shopify.status,
              detail: store.providers.shopify.detail,
              secondary: store.providers.shopify.shopDomain || "",
            }
          : null,
        store.providers.woocommerce
          ? {
              key: `woocommerce:${store.id}`,
              provider: "WooCommerce",
              storeName: store.name,
              label: store.providers.woocommerce.label,
              status: store.providers.woocommerce.status,
              detail: store.providers.woocommerce.detail,
              secondary: store.providers.woocommerce.shopDomain || "",
            }
          : null,
      ].filter(Boolean) as Array<{
        key: string;
        provider: string;
        storeName: string;
        label: string;
        status: ConnectionStatusDto["status"];
        detail: string;
        secondary: string;
        storeId: number;
      }>
  );
  const accountingRows = workspaceState.stores
    .filter((store) => store.providers.alegra)
    .map((store) => ({
      key: `alegra:${store.id}`,
      provider: "Alegra",
      storeName: store.name,
      label: store.providers.alegra?.label || "",
      status: store.providers.alegra?.status || "disconnected",
      detail: store.providers.alegra?.detail || "Sin configurar",
      storeId: store.id,
    }));
  const selectedCommerceRows = selectedStore
    ? commerceRows.filter((row) => row.storeId === selectedStore.id)
    : commerceRows;
  const selectedAccountingRows = selectedStore
    ? accountingRows.filter((row) => row.storeId === selectedStore.id)
    : accountingRows;
  const selectedShopifyProvider = selectedStore?.providers.shopify ?? null;
  const selectedWooProvider = selectedStore?.providers.woocommerce ?? null;
  const selectedAlegraProvider = selectedStore?.providers.alegra ?? null;
  const connectedAdsCount = workspaceState.ads.filter((ad) => ad.status === "connected").length;
  const connectedCommerceCount = [selectedShopifyProvider, selectedWooProvider].filter(
    (provider) => provider?.status === "connected"
  ).length;
  const isOperationalStage = activeStage !== "channels";
  const activeOperationalConfig = activeConfig ?? null;
  const operationalRules = activeOperationalConfig?.rules ?? workspaceState.storeConfigDefaults.rules;
  const operationalSync = activeOperationalConfig?.sync ?? workspaceState.storeConfigDefaults.sync;
  const operationalInvoice = activeOperationalConfig?.invoice ?? workspaceState.storeConfigDefaults.invoice;
  const operationalTransfers = activeOperationalConfig?.transfers ?? workspaceState.storeConfigDefaults.transfers;

  function handleStoreConfigSaved(nextConfig: ConnectionsWorkspace["storeConfigs"][number]) {
    setWorkspaceState((current) => {
      const existingIndex = current.storeConfigs.findIndex((item) => item.storeId === nextConfig.storeId);
      if (existingIndex === -1) {
        return { ...current, storeConfigs: [nextConfig, ...current.storeConfigs] };
      }
      const nextConfigs = [...current.storeConfigs];
      nextConfigs[existingIndex] = nextConfig;
      return { ...current, storeConfigs: nextConfigs };
    });
  }

  async function refreshWorkspace() {
    const response = await fetch("/api/admin-web/connections/workspace", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`workspace_refresh_failed:${response.status}`);
    }
    const next = (await response.json()) as ConnectionsWorkspace;
    setWorkspaceState(next);
    setSelectedStoreId((current) => {
      if (!current) return next.stores[0]?.id ?? null;
      return next.stores.some((store) => store.id === current) ? current : (next.stores[0]?.id ?? null);
    });
    return next;
  }

  async function loadWebhookStatus(shopDomain: string) {
    setWebhookLoading(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/shopify/webhooks/status?shopDomain=${encodeURIComponent(shopDomain)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as WebhookStatus | { error?: string };
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error || `webhook_status_failed:${response.status}`);
      }
      setWebhookStatus(payload as WebhookStatus);
    } catch (error) {
      setWebhookStatus(null);
      setStatusMessage(error instanceof Error ? error.message : "No se pudo consultar webhooks.");
    } finally {
      setWebhookLoading(false);
    }
  }

  useEffect(() => {
    const shopDomain = selectedStore?.providers.shopify?.shopDomain;
    if (!shopDomain) {
      setWebhookStatus(null);
      return;
    }
    void loadWebhookStatus(shopDomain);
  }, [selectedStore?.id, selectedStore?.providers.shopify?.shopDomain]);

  useEffect(() => {
    setShopifyDomainInput(selectedStore?.providers.shopify?.shopDomain || "");
  }, [selectedStore?.id, selectedStore?.providers.shopify?.shopDomain]);

  async function runWebhookAction(action: "create" | "delete") {
    const shopDomain = selectedStore?.providers.shopify?.shopDomain;
    if (!shopDomain) {
      setStatusMessage("Selecciona una tienda con Shopify conectado.");
      return;
    }
    setActionLoadingKey(`webhooks:${action}`);
    setStatusMessage("");
    try {
      const response = await fetch(action === "create" ? "/api/shopify/webhooks" : "/api/shopify/webhooks/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain }),
      });
      const payload = (await response.json()) as { error?: string; deleted?: number; total?: number; ok?: boolean };
      if (!response.ok) {
        throw new Error(payload.error || `webhook_${action}_failed:${response.status}`);
      }
      setStatusMessage(
        action === "create"
          ? "Webhooks creados o actualizados."
          : `Webhooks eliminados ${payload.deleted ?? 0}/${payload.total ?? 0}.`
      );
      await Promise.all([refreshWorkspace(), loadWebhookStatus(shopDomain)]);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : `No se pudo ${action === "create" ? "crear" : "eliminar"} webhooks.`
      );
    } finally {
      setActionLoadingKey("");
    }
  }

  async function disconnectProvider(
    provider: "shopify" | "woocommerce" | "alegra",
    storeId: number,
    shopDomain?: string
  ) {
    const confirmed = window.confirm(`Confirma desconectar ${provider} de esta tienda.`);
    if (!confirmed) return;
    setActionLoadingKey(`disconnect:${provider}:${storeId}`);
    setStatusMessage("");
    try {
      let path = "";
      if (provider === "shopify") {
        if (!shopDomain) throw new Error("Dominio Shopify faltante.");
        path = `/api/connections/domain/${encodeURIComponent(shopDomain)}`;
      } else if (provider === "woocommerce") {
        if (!shopDomain) throw new Error("Dominio WooCommerce faltante.");
        path = `/api/woocommerce/connections/${encodeURIComponent(shopDomain)}`;
      } else {
        path = `/api/connections/alegra/${storeId}`;
      }
      const response = await fetch(path, {
        method: "DELETE",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `disconnect_failed:${response.status}`);
      }
      setStatusMessage(`${provider} desconectado correctamente.`);
      const nextWorkspace = await refreshWorkspace();
      if (
        provider === "shopify" &&
        selectedStoreId &&
        !nextWorkspace.stores.find((store) => store.id === selectedStoreId)?.providers.shopify
      ) {
        setWebhookStatus(null);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo desconectar.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function createStore() {
    if (!newStoreName.trim()) {
      setStatusMessage("Nombre de tienda requerido.");
      return;
    }
    setActionLoadingKey("store:create");
    setStatusMessage("");
    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStoreName.trim() }),
      });
      const payload = (await response.json()) as { error?: string; created?: { id: number } };
      if (!response.ok) {
        throw new Error(payload.error || `store_create_failed:${response.status}`);
      }
      const next = await refreshWorkspace();
      const createdId = payload.created?.id;
      if (createdId) {
        setSelectedStoreId(createdId);
      } else {
        setSelectedStoreId(next.stores[0]?.id ?? null);
      }
      setNewStoreName("");
      setIsCreateStoreOpen(false);
      setStatusMessage("Tienda creada correctamente.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo crear la tienda.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function copyStoreConfig() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda destino.");
      return;
    }
    if (!copySourceStoreId) {
      setStatusMessage("Selecciona una tienda origen con configuración existente.");
      return;
    }
    const sourceLabel =
      copyableSourceStores.find((item) => item.storeId === copySourceStoreId)?.storeName ||
      `Tienda #${copySourceStoreId}`;
    const confirmed = window.confirm(
      `Se sobrescribirán transfers, price lists, rules, invoice y sync de ${selectedStore.name} con la configuración de ${sourceLabel}. Las conexiones y credenciales no se copian. ¿Continuar?`
    );
    if (!confirmed) return;
    setActionLoadingKey(`copy-config:${selectedStore.id}`);
    setStatusMessage("");
    try {
      await copyStoreConfigFrom(String(selectedStore.id), {
        sourceStoreId: copySourceStoreId,
      });
      await refreshWorkspace();
      setStatusMessage(`Configuración copiada: ${sourceLabel} → ${selectedStore.name}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo copiar la configuración.");
    } finally {
      setActionLoadingKey("");
    }
  }

  function openReconnect(kind: "shopify" | "woocommerce" | "alegra") {
    if (kind === "woocommerce") {
      setWooDomain(selectedStore?.providers.woocommerce?.shopDomain || "");
      setWooConsumerKey("");
      setWooConsumerSecret("");
    }
    if (kind === "alegra") {
      const account =
        workspaceState.alegraAccounts.find((item) => item.storeId === selectedStore?.id) ||
        workspaceState.alegraAccounts[0];
      setAlegraMode(account ? "existing" : "manual");
      setAlegraAccountId(account ? String(account.id) : "");
      setAlegraEmail(account?.email || "");
      setAlegraApiKey("");
      setAlegraEnvironment(account?.environment || "prod");
    }
    setReconnectKind(kind);
  }

  function closeConnectionFlow() {
    setIsConnectionFlowOpen(false);
    setConnectionWizardStep("store");
    setConnectionWizardGroup(null);
    setConnectionWizardPlatform(null);
  }

  function openConnectionFlow(
    platform?: "shopify" | "woocommerce" | "alegra" | "google-ads" | "meta-ads" | "tiktok-ads" | "shopify-marketing"
  ) {
    setIsConnectionFlowOpen(true);
    if (!platform) {
      setConnectionWizardStep("store");
      setConnectionWizardGroup(null);
      setConnectionWizardPlatform(null);
      return;
    }
    setConnectionWizardPlatform(platform);
    setConnectionWizardStep("form");
    setConnectionWizardGroup(
      platform === "shopify" || platform === "woocommerce" ? "commerce" : platform === "alegra" ? "accounting" : "ads"
    );
  }

  async function reconnectShopify() {
    const shopDomain = selectedStore?.providers.shopify?.shopDomain;
    if (!selectedStore || !shopDomain) {
      setStatusMessage("Selecciona una tienda con dominio Shopify.");
      return;
    }
    const params = new URLSearchParams({
      shop: shopDomain,
      storeId: String(selectedStore.id),
      storeName: selectedStore.name,
    });
    const alegraMatch = workspaceState.alegraAccounts.find((account) => account.storeId === selectedStore.id);
    if (alegraMatch) {
      params.set("alegraAccountId", String(alegraMatch.id));
    }
    window.location.href = `/api/auth/shopify?${params.toString()}`;
  }

  function startShopifyConnection() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    const shopDomain = shopifyDomainInput.trim();
    if (!shopDomain) {
      setStatusMessage("Dominio Shopify requerido.");
      return;
    }
    const params = new URLSearchParams({
      shop: shopDomain,
      storeId: String(selectedStore.id),
      storeName: selectedStore.name,
    });
    const alegraMatch = workspaceState.alegraAccounts.find((account) => account.storeId === selectedStore.id);
    if (alegraMatch) {
      params.set("alegraAccountId", String(alegraMatch.id));
    }
    window.location.href = `/api/auth/shopify?${params.toString()}`;
  }

  async function reconnectWooCommerce() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    setActionLoadingKey("reconnect:woocommerce");
    setStatusMessage("");
    try {
      const response = await fetch("/api/woocommerce/connections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          shopDomain: wooDomain,
          consumerKey: wooConsumerKey,
          consumerSecret: wooConsumerSecret,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `woocommerce_reconnect_failed:${response.status}`);
      }
      await refreshWorkspace();
      setReconnectKind(null);
      setStatusMessage("WooCommerce actualizado correctamente.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo actualizar WooCommerce.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function reconnectAlegra() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    setActionLoadingKey("reconnect:alegra");
    setStatusMessage("");
    try {
      const alegraPayload =
        alegraMode === "existing" && alegraAccountId
          ? { accountId: Number(alegraAccountId) }
          : {
              email: alegraEmail,
              apiKey: alegraApiKey,
              environment: alegraEnvironment,
            };
      const response = await fetch("/api/connections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStore.id,
          alegra: alegraPayload,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `alegra_reconnect_failed:${response.status}`);
      }
      await refreshWorkspace();
      setReconnectKind(null);
      setStatusMessage("Alegra asociado o actualizado correctamente.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo actualizar Alegra.");
    } finally {
      setActionLoadingKey("");
    }
  }

  function startAdsOAuth(provider: "google-ads" | "meta-ads" | "tiktok-ads") {
    const shopDomain = selectedStore?.providers.shopify?.shopDomain?.trim() || "";
    if (!shopDomain) {
      setStatusMessage("Conecta Shopify primero para asociar Ads a una tienda.");
      return;
    }
    if (provider === "google-ads") {
      if (!googleAdsCustomerId.trim()) {
        setStatusMessage("Customer ID de Google Ads requerido.");
        return;
      }
      window.location.href = `/api/auth/google-ads/start?${new URLSearchParams({
        customerId: googleAdsCustomerId.trim(),
        shopDomain,
      }).toString()}`;
      return;
    }
    if (provider === "meta-ads") {
      if (!metaAdsAccountId.trim()) {
        setStatusMessage("Ad Account ID de Meta Ads requerido.");
        return;
      }
      window.location.href = `/api/auth/meta-ads/start?${new URLSearchParams({
        adAccountId: metaAdsAccountId.trim(),
        shopDomain,
      }).toString()}`;
      return;
    }
    if (!tiktokAdsAdvertiserId.trim()) {
      setStatusMessage("Advertiser ID de TikTok Ads requerido.");
      return;
    }
    window.location.href = `/api/auth/tiktok-ads/start?${new URLSearchParams({
      advertiserId: tiktokAdsAdvertiserId.trim(),
      shopDomain,
    }).toString()}`;
  }

  return (
    <section className="page-stack">
      <PageHeader
        title="Configuración"
        subtitle="Canales y credenciales del cliente."
        breadcrumbs={
          <>
            <a href="/">Inicio</a>
            <span>/</span>
            <span>Configuración</span>
          </>
        }
      />

      <PageToolbar
        filters={
          <>
            <span className="pill pill-info">Total · {summary.total}</span>
            <span className="pill pill-ok">Activas · {summary.connectedCount}</span>
            <span className="pill pill-warn">Atención · {summary.attentionCount}</span>
            <span className="pill pill-bad">Desconectadas · {summary.disconnectedCount}</span>
          </>
        }
        views={
          <>
            <button
              className={`btn ${activeStage === "channels" ? "primary" : "ghost"} btn-compact`}
              type="button"
              onClick={() => setActiveStage("channels")}
            >
              Conexiones
            </button>
            <button
              className={`btn ${isOperationalStage ? "primary" : "ghost"} btn-compact`}
              type="button"
              onClick={() => setActiveStage(isOperationalStage ? activeStage : "operations")}
            >
              Configuración operativa
            </button>
          </>
        }
      />

      <StageGuide
        title={stageGuide.title}
        description={stageGuide.description}
        items={stageGuide.checklist}
        next={<span className="pill pill-info">{stageGuide.next}</span>}
      />

      <section className="page-module-shell page-module-shell-compact config-active-store-shell">
        <div className="page-module-head">
          <div>
            <h3>Tienda activa</h3>
            <p>Selecciona la tienda, identifica plataformas activas y abre desde aquí los flujos reales.</p>
          </div>
          <div className="page-module-actions">
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                void refreshWorkspace();
              }}
            >
              Refrescar
            </button>
            <button className="btn primary" type="button" onClick={() => setIsCreateStoreOpen(true)}>
              Crear tienda
            </button>
            <button className="btn primary" type="button" onClick={() => openConnectionFlow()}>
              Nueva conexión
            </button>
          </div>
        </div>
        <div className="config-summary-strip">
          <div className="config-summary-main">
            <div className="config-brand-strip">
              <img className="config-brand-strip-logo" src="/assets/logo.png" alt="ApiFlujos" />
              <div className="config-brand-strip-meta">
                <strong>{workspaceState.companyName}</strong>
                <span>Centro operativo de integraciones por tienda</span>
              </div>
              <img className="config-brand-strip-avatar" src="/assets/avatar.png" alt="Asistente ApiFlujos" />
            </div>
            <div className="provider-mark-row">
              {selectedStore?.providers.shopify ? <ProviderMark provider="Shopify" /> : null}
              {selectedStore?.providers.woocommerce ? <ProviderMark provider="WooCommerce" /> : null}
              {selectedStore?.providers.alegra ? <ProviderMark provider="Alegra" /> : null}
              {selectedStore?.providers.googleAds ? <ProviderMark provider="Google Ads" /> : null}
              {selectedStore?.providers.metaAds ? <ProviderMark provider="Meta Ads" /> : null}
              {selectedStore?.providers.tiktokAds ? <ProviderMark provider="TikTok Ads" /> : null}
            </div>
            <div className="config-summary-copy">
              <strong>{selectedStore?.name || workspaceState.companyName}</strong>
              <span>
                {overview.activeConnections} integraciones activas · {summary.attentionCount} por revisar ·{" "}
                {summary.disconnectedCount} por conectar
              </span>
            </div>
          </div>
          <div className="page-module-actions compact-pills">
            <span className="pill pill-ok">Activas {summary.connectedCount}</span>
            <span className="pill pill-warn">Revisión {summary.attentionCount}</span>
            <span className="pill pill-bad">Por conectar {summary.disconnectedCount}</span>
            {workspaceState.securityMisconfigured ? (
              <span className="pill pill-bad">Credenciales por reconectar</span>
            ) : null}
          </div>
        </div>
        <div className="config-active-store-grid">
          <label className="field">
            <span>Tienda</span>
            <select
              className="input"
              value={selectedStore?.id ?? ""}
              onChange={(event) => setSelectedStoreId(Number(event.target.value || ""))}
            >
              {workspaceState.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <small>Todo el flujo inferior se recalcula sobre la tienda seleccionada.</small>
          </label>
          <div className="config-active-store-meta">
            {selectedStore ? <span className="pill pill-info">Tienda #{selectedStore.id}</span> : null}
            {selectedStore?.providers.shopify ? <ProviderMark provider="Shopify" /> : null}
            {selectedStore?.providers.woocommerce ? <ProviderMark provider="WooCommerce" /> : null}
            {selectedStore?.providers.alegra ? <ProviderMark provider="Alegra" /> : null}
            {!selectedStore?.providers.shopify &&
            !selectedStore?.providers.woocommerce &&
            !selectedStore?.providers.alegra ? (
              <span className="pill">Sin plataformas activas</span>
            ) : null}
          </div>
          <label className="field">
            <span>Copiar desde</span>
            <select
              className="input"
              value={copySourceStoreId ?? ""}
              disabled={!copyableSourceStores.length || !selectedStore}
              onChange={(event) => setCopySourceStoreId(Number(event.target.value || ""))}
            >
              {!copyableSourceStores.length ? <option value="">Sin origen disponible</option> : null}
              {copyableSourceStores.map((store) => (
                <option key={`copy-source:${store.storeId}`} value={store.storeId}>
                  {store.storeName}
                </option>
              ))}
            </select>
            <small>Hereda reglas operativas sin copiar conexiones ni credenciales.</small>
          </label>
          <div className="page-module-actions config-active-store-copy">
            <button
              className="btn ghost"
              type="button"
              disabled={
                !selectedStore || !copySourceStoreId || actionLoadingKey === `copy-config:${selectedStore?.id ?? ""}`
              }
              onClick={() => void copyStoreConfig()}
            >
              {actionLoadingKey === `copy-config:${selectedStore?.id ?? ""}` ? "Copiando..." : "Copiar configuración"}
            </button>
          </div>
        </div>
        <p className="connection-inline-note">
          Copia completa de la configuración operativa por tienda: traslados, listas de precios, reglas, factura y
          sincronización. No copia conexiones ni credenciales.
        </p>
        {statusMessage ? <p className="connection-inline-note">{statusMessage}</p> : null}
      </section>

      {activeStage === "channels" ? (
        <section className="page-module-shell connection-section-shell">
          <div className="page-module-head">
            <div>
              <strong>Centro de integraciones</strong>
              <span>Conecta, reconecta o administra cada plataforma desde una superficie corta y accionable.</span>
            </div>
          </div>
          <section className="integration-hub-grid">
            <article className="card integration-hub-card">
              <div className="integration-hub-head">
                <div className="provider-mark-row">
                  <ProviderMark provider="Shopify" />
                  <ProviderMark provider="WooCommerce" />
                  <div>
                    <strong>E-commerce</strong>
                    <span>{selectedStore?.name || "Selecciona una tienda"}</span>
                  </div>
                </div>
                <StatusPill
                  tone={
                    connectedCommerceCount
                      ? "success"
                      : selectedShopifyProvider?.status === "attention" || selectedWooProvider?.status === "attention"
                        ? "warning"
                        : "error"
                  }
                  small
                >
                  {connectedCommerceCount
                    ? `${connectedCommerceCount} activa(s)`
                    : selectedShopifyProvider || selectedWooProvider
                      ? "Atención"
                      : "Pendiente"}
                </StatusPill>
              </div>
              <p className="integration-hub-copy">
                Conecta Shopify y WooCommerce desde una sola superficie. Aquí se resuelven dominio, llaves, OAuth y
                recuperación de catálogo y pedidos.
              </p>
              <div className="integration-hub-meta">
                <span className="pill">{selectedShopifyProvider?.shopDomain || "Shopify sin dominio técnico"}</span>
                <span className="pill">{selectedWooProvider?.shopDomain || "WooCommerce sin dominio"}</span>
              </div>
              <div className="connection-card-actions">
                <button className="btn primary btn-compact" type="button" onClick={() => openConnectionFlow("shopify")}>
                  {selectedShopifyProvider ? "Gestionar Shopify" : "Conectar Shopify"}
                </button>
                <button
                  className="btn ghost btn-compact"
                  type="button"
                  onClick={() => openConnectionFlow("woocommerce")}
                >
                  {selectedWooProvider ? "Gestionar WooCommerce" : "Conectar WooCommerce"}
                </button>
              </div>
            </article>

            <article className="card integration-hub-card">
              <div className="integration-hub-head">
                <div className="provider-mark-row">
                  <ProviderMark provider="Alegra" />
                  <div>
                    <strong>Alegra</strong>
                    <span>{selectedStore?.name || "Selecciona una tienda"}</span>
                  </div>
                </div>
                <StatusPill tone={toneForStatus(selectedAlegraProvider?.status || "disconnected")} small>
                  {selectedAlegraProvider
                    ? selectedAlegraProvider.status === "connected"
                      ? "Activa"
                      : selectedAlegraProvider.status === "attention"
                        ? "Atención"
                        : "Desconectada"
                    : "Sin conectar"}
                </StatusPill>
              </div>
              <p className="integration-hub-copy">
                {selectedAlegraProvider?.detail ||
                  "Asocia la cuenta contable que usará facturación, pagos y sincronización."}
              </p>
              <div className="integration-hub-meta">
                <span className="pill">{selectedAlegraProvider?.label || "Sin cuenta asociada"}</span>
              </div>
              <div className="connection-card-actions">
                <button className="btn primary btn-compact" type="button" onClick={() => openConnectionFlow("alegra")}>
                  {selectedAlegraProvider ? "Actualizar cuenta" : "Conectar Alegra"}
                </button>
                {selectedAlegraProvider ? (
                  <button className="btn ghost btn-compact" type="button" onClick={() => openReconnect("alegra")}>
                    Reconectar
                  </button>
                ) : null}
              </div>
            </article>

            <article className="card integration-hub-card">
              <div className="integration-hub-head">
                <div className="provider-mark-row">
                  <ProviderMark provider="Google Ads" />
                  <ProviderMark provider="Meta Ads" />
                  <ProviderMark provider="TikTok Ads" />
                  <div>
                    <strong>Marketing</strong>
                    <span>{selectedStore?.name || "Selecciona una tienda"}</span>
                  </div>
                </div>
                <StatusPill tone={connectedAdsCount ? "success" : "warning"} small>
                  {connectedAdsCount ? `${connectedAdsCount} activa(s)` : "Pendiente"}
                </StatusPill>
              </div>
              <p className="integration-hub-copy">
                Gestiona cuentas publicitarias y luego continúa en marketing para pixel, script y webhooks.
              </p>
              <div className="integration-hub-meta">
                <span className="pill">Ads activas {connectedAdsCount}</span>
                <span className="pill">Marketing por tienda</span>
              </div>
              <div className="connection-card-actions">
                <button
                  className="btn primary btn-compact"
                  type="button"
                  onClick={() => openConnectionFlow("google-ads")}
                >
                  Conectar Ads
                </button>
                <a className="btn ghost btn-compact" href="/settings/marketing">
                  Abrir marketing
                </a>
              </div>
            </article>
          </section>
        </section>
      ) : null}

      {isOperationalStage ? (
        <section className="page-module-shell operational-workspace-shell">
          <div className="page-module-head">
            <div>
              <strong>Configuración operativa</strong>
              <span>Una sola superficie para operación, facturación, marketing y compatibilidad heredada.</span>
            </div>
            <div className="page-module-actions">
              <button
                className={`btn ${activeStage === "operations" ? "primary" : "ghost"} btn-compact`}
                type="button"
                onClick={() => setActiveStage("operations")}
              >
                Operación
              </button>
              <button
                className={`btn ${activeStage === "invoice" ? "primary" : "ghost"} btn-compact`}
                type="button"
                onClick={() => setActiveStage("invoice")}
              >
                Facturación
              </button>
              <button
                className={`btn ${activeStage === "marketing" ? "primary" : "ghost"} btn-compact`}
                type="button"
                onClick={() => setActiveStage("marketing")}
              >
                Marketing
              </button>
              <button
                className={`btn ${activeStage === "legacy" ? "primary" : "ghost"} btn-compact`}
                type="button"
                onClick={() => setActiveStage("legacy")}
              >
                Heredado
              </button>
            </div>
          </div>
          <p className="connection-inline-note">
            Usa este espacio para reglas de productos, contactos, facturas, listas de precios, marketing y ajustes
            avanzados sin salir del flujo de la tienda activa.
          </p>

          <section className="operational-hub-grid">
            <article className="card operational-hub-card">
              <div className="settings-subsection-head">
                <div>
                  <strong>Productos</strong>
                  <span>Catálogo, publicación y automatización por tienda.</span>
                </div>
                <span className={`pill ${operationalRules.syncEnabled ? "pill-ok" : "pill-warn"}`}>
                  {operationalRules.syncEnabled ? "Automático activo" : "Pausado"}
                </span>
              </div>
              <div className="page-module-actions compact-pills">
                <span className={`pill ${operationalRules.createInShopify ? "pill-ok" : ""}`}>
                  Crear {operationalRules.createInShopify ? "encendido" : "apagado"}
                </span>
                <span className={`pill ${operationalRules.updateInShopify ? "pill-ok" : ""}`}>
                  Actualizar {operationalRules.updateInShopify ? "encendido" : "apagado"}
                </span>
                <span className={`pill ${operationalRules.autoPublishOnWebhook ? "pill-ok" : ""}`}>
                  Webhook {operationalRules.autoPublishOnWebhook ? "activo" : "apagado"}
                </span>
              </div>
              <p className="connection-inline-note">
                Aquí viven las reglas de sincronización automática, publicación, carga histórica e imágenes de producto
                sin salir de la tienda activa.
              </p>
              <div className="page-module-actions">
                <button
                  className={`btn ${activeStage === "operations" ? "primary" : "ghost"} btn-compact`}
                  type="button"
                  onClick={() => setActiveStage("operations")}
                >
                  Abrir reglas
                </button>
                <a className="btn ghost btn-compact" href="/products">
                  Ir a productos
                </a>
              </div>
            </article>

            <article className="card operational-hub-card">
              <div className="settings-subsection-head">
                <div>
                  <strong>Inventario y bodegas</strong>
                  <span>Automatización de stock, ajustes y resolución logística.</span>
                </div>
                <span className={`pill ${operationalRules.inventoryAdjustmentsEnabled ? "pill-ok" : "pill-warn"}`}>
                  {operationalRules.inventoryAdjustmentsEnabled ? "Ajustes activos" : "Ajustes pausados"}
                </span>
              </div>
              <div className="page-module-actions compact-pills">
                <span className={`pill ${operationalRules.trackInventory ? "pill-ok" : ""}`}>
                  Inventario {operationalRules.trackInventory ? "activo" : "apagado"}
                </span>
                <span className={`pill ${operationalTransfers.enabled ? "pill-ok" : ""}`}>
                  Traslados {operationalTransfers.enabled ? "activos" : "apagados"}
                </span>
                <span className="pill">
                  {operationalRules.warehouseIds.length
                    ? `${operationalRules.warehouseIds.length} bodegas elegidas`
                    : "Todas las bodegas"}
                </span>
              </div>
              <p className="connection-inline-note">
                Este bloque controla la lógica automática. La frecuencia, el checkpoint y los masivos ya vuelven a vivir
                en esta misma superficie.
              </p>
              <div className="page-module-actions">
                <button
                  className={`btn ${activeStage === "operations" ? "primary" : "ghost"} btn-compact`}
                  type="button"
                  onClick={() => setActiveStage("operations")}
                >
                  Abrir reglas
                </button>
                <a className="btn ghost btn-compact" href="/operations">
                  Ver operaciones
                </a>
              </div>
            </article>

            <article className="card operational-hub-card">
              <div className="settings-subsection-head">
                <div>
                  <strong>Pedidos y facturación</strong>
                  <span>Dirección del sync entre Shopify y Alegra, factura y pago.</span>
                </div>
                <span className={`pill ${operationalInvoice.generateInvoice ? "pill-ok" : "pill-warn"}`}>
                  {operationalInvoice.generateInvoice ? "Factura activa" : "Factura apagada"}
                </span>
              </div>
              <div className="page-module-actions compact-pills">
                <span className="pill">Pedido → {operationalSync.orders.shopifyToAlegra}</span>
                <span className="pill">Contable → {operationalSync.orders.alegraToShopify}</span>
                <span className={`pill ${operationalInvoice.einvoiceEnabled ? "pill-ok" : ""}`}>
                  E-factura {operationalInvoice.einvoiceEnabled ? "activa" : "apagada"}
                </span>
              </div>
              <p className="connection-inline-note">
                Aquí defines la intención operativa y ya puedes lanzar corridas manuales y masivas por fecha sin
                depender del flujo heredado.
              </p>
              <div className="page-module-actions">
                <button
                  className={`btn ${activeStage === "invoice" ? "primary" : "ghost"} btn-compact`}
                  type="button"
                  onClick={() => setActiveStage("invoice")}
                >
                  Abrir facturación
                </button>
                <a className="btn ghost btn-compact" href="/orders">
                  Ir a pedidos
                </a>
                <a className="btn ghost btn-compact" href="/invoices">
                  Ir a facturas
                </a>
              </div>
            </article>

            <article className="card operational-hub-card">
              <div className="settings-subsection-head">
                <div>
                  <strong>Contactos</strong>
                  <span>Bidireccionalidad, creación automática y prioridad de identificación.</span>
                </div>
                <span className={`pill ${operationalSync.contacts.enabled ? "pill-ok" : "pill-warn"}`}>
                  {operationalSync.contacts.enabled ? "Automático activo" : "Pausado"}
                </span>
              </div>
              <div className="page-module-actions compact-pills">
                <span className={`pill ${operationalSync.contacts.fromShopify ? "pill-ok" : ""}`}>
                  E-commerce → Contable
                </span>
                <span className={`pill ${operationalSync.contacts.fromAlegra ? "pill-ok" : ""}`}>
                  Contable → E-commerce
                </span>
                <span className="pill">Prioridad {operationalSync.contacts.matchPriority.join(" / ")}</span>
              </div>
              <p className="connection-inline-note">
                El módulo nuevo ya vuelve a exponer dirección, creación automática, prioridad de match y ejecución
                masiva por fechas.
              </p>
              <div className="page-module-actions">
                <a className="btn ghost btn-compact" href="/contacts">
                  Ir a contactos
                </a>
                <button
                  className={`btn ${activeStage === "operations" ? "primary" : "ghost"} btn-compact`}
                  type="button"
                  onClick={() => setActiveStage("operations")}
                >
                  Ajustar reglas
                </button>
              </div>
            </article>
          </section>

          {activeStage === "operations" ? (
            <>
              <StoreSyncAutomationPanel
                stores={workspaceState.stores}
                storeConfigs={workspaceState.storeConfigs}
                defaults={workspaceState.storeConfigDefaults}
                activeStoreId={selectedStoreId}
              />

              <StoreSyncModulesPanel
                stores={workspaceState.stores}
                storeConfigs={workspaceState.storeConfigs}
                defaults={workspaceState.storeConfigDefaults}
                activeStoreId={selectedStoreId}
                onStoreConfigSaved={handleStoreConfigSaved}
              />

              <StoreSyncActionsPanel
                stores={workspaceState.stores}
                storeConfigs={workspaceState.storeConfigs}
                defaults={workspaceState.storeConfigDefaults}
                activeStoreId={selectedStoreId}
              />

              <StoreConfigsCriticalPanel
                stores={workspaceState.stores}
                storeConfigs={workspaceState.storeConfigs}
                defaults={workspaceState.storeConfigDefaults}
                activeStoreId={selectedStoreId}
                onStoreConfigSaved={handleStoreConfigSaved}
              />

              <StoreConfigPriceListsPanel
                stores={workspaceState.stores}
                storeConfigs={workspaceState.storeConfigs}
                defaults={workspaceState.storeConfigDefaults}
                activeStoreId={selectedStoreId}
                onStoreConfigSaved={handleStoreConfigSaved}
              />
            </>
          ) : null}

          {activeStage === "invoice" ? (
            <GlobalInvoiceSettingsPanel stores={workspaceState.stores} activeStoreId={selectedStoreId} />
          ) : null}

          {activeStage === "marketing" ? (
            <StoreMarketingConfigPanel stores={workspaceState.stores} activeStoreId={selectedStoreId} />
          ) : null}

          {activeStage === "legacy" ? (
            <>
              <LegacySyncCompatibilityPanel />
              <section className="page-module-shell connection-section-shell">
                <div className="page-module-head">
                  <div>
                    <strong>Superficies heredadas restantes</strong>
                    <span>Úsalas solo cuando el ajuste todavía no viva completo en la superficie nueva.</span>
                  </div>
                  <div className="page-module-actions">
                    <span className="pill pill-warn">Respaldo activo</span>
                  </div>
                </div>
                <div className="page-module-actions">
                  <a className="btn ghost" href="/legacy/settings/stores">
                    Abrir stores heredados
                  </a>
                  <a className="btn ghost" href="/settings/marketing">
                    Abrir Marketing
                  </a>
                </div>
              </section>
            </>
          ) : null}
        </section>
      ) : null}

      {activeStage === "channels" ? (
        <details className="settings-collapsible channels-diagnostics-shell">
          <summary className="settings-collapsible-summary">
            <div>
              <strong>Diagnóstico detallado</strong>
              <span>Expande solo cuando necesites revisar el detalle técnico de canales, webhooks o consolidado.</span>
            </div>
            <span className="pill">Expandir</span>
          </summary>
          <section className="connection-section">
            <div className="page-module-shell connection-section-shell">
              <div className="page-module-head">
                <div>
                  <strong>Tiendas conectadas</strong>
                  <span>Lectura consolidada por tienda para decidir dónde seguir configurando.</span>
                </div>
              </div>
              <section className="connections-grid">
                {workspaceState.stores.length ? (
                  workspaceState.stores.map((store) => {
                    const connectedProviders = [
                      store.providers.shopify ? "Shopify" : null,
                      store.providers.alegra ? "Alegra" : null,
                      store.providers.woocommerce ? "WooCommerce" : null,
                    ].filter(Boolean);
                    return (
                      <article className="card connection-card" key={`store:${store.id}`}>
                        <div className="settings-subsection-head">
                          <div>
                            <strong>{store.name}</strong>
                            <span>
                              {connectedProviders.length
                                ? connectedProviders.join(" · ")
                                : "Sin proveedores configurados"}
                            </span>
                          </div>
                          <span className="pill">{connectedProviders.length || 0} conexiones</span>
                        </div>
                        <div className="page-module-actions">
                          {store.providers.shopify ? <span className="pill pill-info">Shopify</span> : null}
                          {store.providers.alegra ? <span className="pill pill-ok">Alegra</span> : null}
                          {store.providers.woocommerce ? <span className="pill pill-warn">WooCommerce</span> : null}
                        </div>
                        <div className="provider-mark-row">
                          {store.providers.shopify ? <ProviderMark provider="Shopify" /> : null}
                          {store.providers.alegra ? <ProviderMark provider="Alegra" /> : null}
                          {store.providers.woocommerce ? <ProviderMark provider="WooCommerce" /> : null}
                        </div>
                        <div className="connection-tech-list">
                          <div className="connection-tech-item">
                            <span>Estado visible</span>
                            <strong>
                              {connectedProviders.length
                                ? `${connectedProviders.length} conexión(es) configurada(s)`
                                : "Configuración pendiente"}
                            </strong>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <article className="card connection-card">
                    <div className="settings-subsection-head">
                      <div>
                        <strong>Sin tiendas</strong>
                        <span>La creación y asociación de tiendas todavía vive en el flujo heredado.</span>
                      </div>
                    </div>
                  </article>
                )}
              </section>
            </div>
          </section>

          <section className="connection-section">
            <div className="page-module-shell connection-section-shell">
              <div className="page-module-head">
                <div>
                  <strong>E-commerce</strong>
                  <span>Canales comerciales activos de la tienda seleccionada.</span>
                </div>
              </div>
              <section className="connections-grid">
                {selectedCommerceRows.length ? (
                  selectedCommerceRows.map((row) => (
                    <article className="card connection-card" key={row.key}>
                      <div className="settings-subsection-head">
                        <div>
                          <strong>{row.provider}</strong>
                          <span>Tienda {row.storeName}</span>
                        </div>
                        <StatusPill tone={toneForStatus(row.status)} small>
                          {row.status === "connected"
                            ? "Activa"
                            : row.status === "attention"
                              ? "Atención"
                              : "Desconectada"}
                        </StatusPill>
                      </div>
                      <div className="provider-mark-row">
                        <ProviderMark provider={row.provider} />
                      </div>
                      <div className="page-module-actions">
                        <span className="pill">{row.label}</span>
                        {row.secondary ? <span className="pill">{row.secondary}</span> : null}
                      </div>
                      <div className="connection-tech-list">
                        <div className="connection-tech-item">
                          <span>Detalle operativo</span>
                          <strong>{row.detail}</strong>
                        </div>
                      </div>
                      <div className="page-module-actions">
                        {row.provider === "Shopify" ? (
                          <button
                            className="btn ghost btn-compact"
                            type="button"
                            disabled={actionLoadingKey === `disconnect:shopify:${row.storeId}`}
                            onClick={() => {
                              void disconnectProvider("shopify", row.storeId, row.secondary);
                            }}
                          >
                            Desconectar
                          </button>
                        ) : null}
                        {row.provider === "Shopify" && row.status !== "connected" ? (
                          <button
                            className="btn primary btn-compact"
                            type="button"
                            onClick={() => void reconnectShopify()}
                          >
                            Reconectar
                          </button>
                        ) : null}
                        {row.provider === "WooCommerce" ? (
                          <button
                            className="btn ghost btn-compact"
                            type="button"
                            disabled={actionLoadingKey === `disconnect:woocommerce:${row.storeId}`}
                            onClick={() => {
                              void disconnectProvider("woocommerce", row.storeId, row.secondary);
                            }}
                          >
                            Desconectar
                          </button>
                        ) : null}
                        {row.provider === "WooCommerce" && row.status !== "connected" ? (
                          <button
                            className="btn primary btn-compact"
                            type="button"
                            onClick={() => openReconnect("woocommerce")}
                          >
                            Reconectar
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="card connection-card">
                    <div className="settings-subsection-head">
                      <div>
                        <strong>Sin conexiones de e-commerce</strong>
                        <span>El alta y la reconexión siguen viviendo en el flujo heredado.</span>
                      </div>
                    </div>
                  </article>
                )}
              </section>
            </div>
          </section>

          <section className="connection-section">
            <div className="page-module-shell connection-section-shell">
              <div className="page-module-head">
                <div>
                  <strong>Contabilidad</strong>
                  <span>Cuentas Alegra de la tienda seleccionada.</span>
                </div>
              </div>
              <section className="connections-grid">
                {selectedAccountingRows.length ? (
                  selectedAccountingRows.map((row) => (
                    <article className="card connection-card" key={row.key}>
                      <div className="settings-subsection-head">
                        <div>
                          <strong>{row.provider}</strong>
                          <span>{row.storeName}</span>
                        </div>
                        <StatusPill tone={toneForStatus(row.status)} small>
                          {row.status === "connected"
                            ? "Activa"
                            : row.status === "attention"
                              ? "Atención"
                              : "Desconectada"}
                        </StatusPill>
                      </div>
                      <div className="provider-mark-row">
                        <ProviderMark provider={row.provider} />
                      </div>
                      <div className="page-module-actions">
                        <span className="pill">{row.label}</span>
                      </div>
                      <div className="connection-tech-list">
                        <div className="connection-tech-item">
                          <span>Detalle operativo</span>
                          <strong>{row.detail}</strong>
                        </div>
                      </div>
                      <div className="page-module-actions">
                        <button
                          className="btn ghost btn-compact"
                          type="button"
                          disabled={actionLoadingKey === `disconnect:alegra:${row.storeId}`}
                          onClick={() => {
                            void disconnectProvider("alegra", row.storeId);
                          }}
                        >
                          Desconectar
                        </button>
                        {row.status !== "connected" ? (
                          <button
                            className="btn primary btn-compact"
                            type="button"
                            onClick={() => openReconnect("alegra")}
                          >
                            Reconectar
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="card connection-card">
                    <div className="settings-subsection-head">
                      <div>
                        <strong>Sin cuenta contable conectada</strong>
                        <span>La asociación o reconexión sigue operando desde el flujo heredado.</span>
                      </div>
                    </div>
                  </article>
                )}
              </section>
            </div>
          </section>

          <section className="connection-section">
            <div className="page-module-shell connection-section-shell">
              <div className="page-module-head">
                <div>
                  <strong>Ads</strong>
                  <span>Estado global de credenciales y sincronización de inversión.</span>
                </div>
              </div>
              <section className="connections-grid">
                {workspaceState.ads.map((ad) => (
                  <article className="card connection-card" key={ad.key}>
                    <div className="settings-subsection-head">
                      <div>
                        <strong>{ad.label}</strong>
                        <span>Integración compartida del tenant</span>
                      </div>
                      <StatusPill tone={toneForStatus(ad.status)} small>
                        {ad.status === "connected" ? "Activa" : ad.status === "attention" ? "Atención" : "Desconectada"}
                      </StatusPill>
                    </div>
                    <div className="provider-mark-row">
                      <ProviderMark provider={ad.label} />
                    </div>
                    <div className="connection-tech-list">
                      <div className="connection-tech-item">
                        <span>Detalle operativo</span>
                        <strong>{ad.detail}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          </section>

          <section className="connection-section">
            <div className="page-module-shell connection-section-shell">
              <div className="page-module-head">
                <div>
                  <strong>Webhooks Shopify</strong>
                  <span>Estado y control inicial para la tienda seleccionada.</span>
                </div>
              </div>
              <article className="settings-subsection">
                {selectedStore?.providers.shopify?.shopDomain ? (
                  <>
                    <div className="settings-subsection-head">
                      <div>
                        <strong>{selectedStore.providers.shopify.label}</strong>
                        <span>{selectedStore.providers.shopify.shopDomain}</span>
                      </div>
                    </div>
                    <div className="page-module-actions">
                      {webhookStatus ? (
                        <StatusPill
                          tone={webhookStatus.ok ? "success" : webhookStatus.connected ? "warning" : "error"}
                          small
                        >
                          {webhookStatus.ok ? "Completos" : `${webhookStatus.connected}/${webhookStatus.total}`}
                        </StatusPill>
                      ) : (
                        <span className="pill">{webhookLoading ? "Consultando..." : "Sin datos"}</span>
                      )}
                      {webhookStatus ? (
                        <>
                          <span className="pill">
                            Eventos {webhookStatus.connected}/{webhookStatus.total}
                          </span>
                          {webhookStatus.missing.length ? (
                            <span className="pill pill-warn">Faltan {webhookStatus.missing.join(", ")}</span>
                          ) : (
                            <span className="pill pill-ok">Todos presentes</span>
                          )}
                        </>
                      ) : null}
                    </div>
                    <div className="settings-subsection">
                      <div className="settings-subsection-head">
                        <div>
                          <strong>Acciones</strong>
                          <span>Consulta el estado o recrea webhooks desde la tienda activa.</span>
                        </div>
                      </div>
                      <div className="page-module-actions">
                        <button
                          className="btn ghost btn-compact"
                          type="button"
                          disabled={webhookLoading}
                          onClick={() => {
                            void loadWebhookStatus(selectedStore.providers.shopify?.shopDomain || "");
                          }}
                        >
                          Estado
                        </button>
                        <button
                          className="btn primary btn-compact"
                          type="button"
                          disabled={actionLoadingKey === "webhooks:create"}
                          onClick={() => {
                            void runWebhookAction("create");
                          }}
                        >
                          Crear
                        </button>
                        <button
                          className="btn ghost btn-compact"
                          type="button"
                          disabled={actionLoadingKey === "webhooks:delete"}
                          onClick={() => {
                            void runWebhookAction("delete");
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="settings-subsection">
                      <div className="settings-subsection-head">
                        <div>
                          <strong>Detalles técnicos</strong>
                          <span>
                            Visibilidad rápida de la URL esperada y la cobertura de eventos exigida por Shopify.
                          </span>
                        </div>
                      </div>
                      <div className="connection-tech-list">
                        <div className="connection-tech-item">
                          <span>URL esperada</span>
                          <strong>{webhookStatus?.callbackUrl || "Disponible cuando se consulta estado"}</strong>
                        </div>
                        <div className="connection-tech-item">
                          <span>Eventos faltantes</span>
                          <strong>
                            {webhookStatus?.missing.length ? webhookStatus.missing.join(", ") : "Ninguno"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="settings-subsection-head">
                    <div>
                      <strong>Sin Shopify activo</strong>
                      <span>
                        Selecciona una tienda que tenga Shopify configurado para consultar o administrar webhooks.
                      </span>
                    </div>
                  </div>
                )}
              </article>
            </div>
          </section>

          <section className="page-module-shell connection-section-shell">
            <div className="page-module-head">
              <div>
                <strong>Conexiones consolidadas</strong>
                <span>Resumen consolidado de canales, estado y último movimiento observado.</span>
              </div>
            </div>
            <section className="connections-grid">
              {connections.map((connection) => (
                <article className="card connection-card" key={connection.id}>
                  <div className="settings-subsection-head">
                    <div>
                      <strong>{connection.label}</strong>
                      <span>Canal {connection.provider}</span>
                    </div>
                    <StatusPill tone={toneForStatus(connection.status)} small>
                      {connection.status === "connected"
                        ? "Activa"
                        : connection.status === "attention"
                          ? "Atención"
                          : "Desconectada"}
                    </StatusPill>
                  </div>
                  <div className="provider-mark-row">
                    <ProviderMark provider={connection.provider} />
                  </div>
                  <div className="page-module-actions compact-pills">
                    <span className="pill">
                      Último movimiento · {connection.lastSyncAt?.slice(0, 16).replace("T", " ") ?? "Sin registro"}
                    </span>
                  </div>
                  <div className="connection-tech-list">
                    <div className="connection-tech-item">
                      <span>Detalle operativo</span>
                      <strong>{connection.detail}</strong>
                    </div>
                  </div>
                  <div className="page-module-actions">
                    <button className="btn ghost" type="button" onClick={() => setSelected(connection)}>
                      Ver detalle
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </section>
        </details>
      ) : null}

      {selected ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="connection-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Conexión</p>
                <h3 id="connection-modal-title">{selected.label}</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={() => setSelected(null)}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">
                Resumen consolidado de la conexión elegida. Úsalo para entender estado, canal y último movimiento antes
                de ir al flujo operativo correspondiente.
              </p>
              <div className="provider-mark-row">
                <ProviderMark provider={selected.provider} />
                <StatusPill tone={toneForStatus(selected.status)} small>
                  {selected.status === "connected"
                    ? "Activa"
                    : selected.status === "attention"
                      ? "Atención"
                      : "Desconectada"}
                </StatusPill>
              </div>
              <div className="modal-row">
                <span>Proveedor</span>
                <strong>{selected.provider}</strong>
              </div>
              <div className="modal-row">
                <span>Estado</span>
                <strong>{selected.status}</strong>
              </div>
              <div className="modal-row">
                <span>Detalle</span>
                <strong>{selected.detail}</strong>
              </div>
              <div className="modal-row">
                <span>Último movimiento</span>
                <strong>{selected.lastSyncAt?.slice(0, 19).replace("T", " ") ?? "Sin registro"}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isConnectionFlowOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeConnectionFlow}>
          <div
            className="modal-card modal-card-wide"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Conexiones</p>
                <h3>Nueva conexión</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={closeConnectionFlow}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <div className="page-module-actions wizard-progress">
                <span className={`pill ${connectionWizardStep === "store" ? "pill-info" : ""}`}>1. Tienda</span>
                <span className={`pill ${connectionWizardStep === "group" ? "pill-info" : ""}`}>2. Grupo</span>
                <span className={`pill ${connectionWizardStep === "platform" ? "pill-info" : ""}`}>3. Plataforma</span>
                <span className={`pill ${connectionWizardStep === "form" ? "pill-info" : ""}`}>4. Configurar</span>
              </div>

              {connectionWizardStep === "store" ? (
                <div className="settings-subsection">
                  <div className="settings-subsection-head">
                    <div>
                      <strong>Tienda objetivo</strong>
                      <span>Primero fija la tienda; después eliges el módulo y la plataforma exacta.</span>
                    </div>
                  </div>
                  <select
                    className="input"
                    value={selectedStore?.id ?? ""}
                    onChange={(event) => setSelectedStoreId(Number(event.target.value || ""))}
                  >
                    {workspaceState.stores.map((store) => (
                      <option key={`wizard-store:${store.id}`} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                  <p className="connection-inline-note">
                    Esta selección fija el contexto para Shopify, WooCommerce, Alegra y Ads.
                  </p>
                  <div className="page-module-actions">
                    <button className="btn ghost" type="button" onClick={() => setIsCreateStoreOpen(true)}>
                      Crear tienda
                    </button>
                    <button className="btn primary" type="button" onClick={() => setConnectionWizardStep("group")}>
                      Continuar
                    </button>
                  </div>
                </div>
              ) : null}

              {connectionWizardStep === "group" ? (
                <div className="settings-subsection">
                  <div className="settings-subsection-head">
                    <div>
                      <strong>Grupo funcional</strong>
                      <span>Elige el frente operativo para mostrar solo plataformas útiles en el siguiente paso.</span>
                    </div>
                  </div>
                  <div className="provider-shortcuts provider-shortcuts-modal">
                    <button
                      className="provider-shortcut"
                      type="button"
                      onClick={() => {
                        setConnectionWizardGroup("commerce");
                        setConnectionWizardStep("platform");
                      }}
                    >
                      <div>
                        <strong>E-commerce</strong>
                        <span>Shopify y WooCommerce</span>
                      </div>
                    </button>
                    <button
                      className="provider-shortcut"
                      type="button"
                      onClick={() => {
                        setConnectionWizardGroup("accounting");
                        setConnectionWizardStep("platform");
                      }}
                    >
                      <div>
                        <strong>Contabilidad</strong>
                        <span>Alegra y facturación</span>
                      </div>
                    </button>
                    <button
                      className="provider-shortcut"
                      type="button"
                      onClick={() => {
                        setConnectionWizardGroup("ads");
                        setConnectionWizardStep("platform");
                      }}
                    >
                      <div>
                        <strong>Ads</strong>
                        <span>Google, Meta, TikTok y Marketing</span>
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}

              {connectionWizardStep === "platform" ? (
                <>
                  <div className="settings-subsection-head">
                    <div>
                      <strong>Plataforma exacta</strong>
                      <span>Abre solo el flujo específico que vas a configurar dentro del grupo elegido.</span>
                    </div>
                  </div>
                  <div className="provider-shortcuts provider-shortcuts-modal">
                    {connectionWizardGroup === "commerce" ? (
                      <>
                        <button
                          className="provider-shortcut"
                          type="button"
                          onClick={() => {
                            setConnectionWizardPlatform("shopify");
                            setConnectionWizardStep("form");
                          }}
                        >
                          <ProviderMark provider="Shopify" />
                          <div>
                            <strong>Shopify</strong>
                            <span>OAuth, dominio y webhooks</span>
                          </div>
                        </button>
                        <button
                          className="provider-shortcut"
                          type="button"
                          onClick={() => {
                            setConnectionWizardPlatform("woocommerce");
                            setConnectionWizardStep("form");
                          }}
                        >
                          <ProviderMark provider="WooCommerce" />
                          <div>
                            <strong>WooCommerce</strong>
                            <span>Consumer key y secret</span>
                          </div>
                        </button>
                      </>
                    ) : null}
                    {connectionWizardGroup === "accounting" ? (
                      <button
                        className="provider-shortcut"
                        type="button"
                        onClick={() => {
                          setConnectionWizardPlatform("alegra");
                          setConnectionWizardStep("form");
                        }}
                      >
                        <ProviderMark provider="Alegra" />
                        <div>
                          <strong>Alegra</strong>
                          <span>Cuenta existente o credenciales nuevas</span>
                        </div>
                      </button>
                    ) : null}
                    {connectionWizardGroup === "ads" ? (
                      <>
                        <button
                          className="provider-shortcut"
                          type="button"
                          onClick={() => {
                            setConnectionWizardPlatform("google-ads");
                            setConnectionWizardStep("form");
                          }}
                        >
                          <ProviderMark provider="Google Ads" />
                          <div>
                            <strong>Google Ads</strong>
                            <span>Customer ID + OAuth</span>
                          </div>
                        </button>
                        <button
                          className="provider-shortcut"
                          type="button"
                          onClick={() => {
                            setConnectionWizardPlatform("meta-ads");
                            setConnectionWizardStep("form");
                          }}
                        >
                          <ProviderMark provider="Meta Ads" />
                          <div>
                            <strong>Meta Ads</strong>
                            <span>Ad account + OAuth</span>
                          </div>
                        </button>
                        <button
                          className="provider-shortcut"
                          type="button"
                          onClick={() => {
                            setConnectionWizardPlatform("tiktok-ads");
                            setConnectionWizardStep("form");
                          }}
                        >
                          <ProviderMark provider="TikTok Ads" />
                          <div>
                            <strong>TikTok Ads</strong>
                            <span>Advertiser ID + OAuth</span>
                          </div>
                        </button>
                        <button
                          className="provider-shortcut"
                          type="button"
                          onClick={() => {
                            setConnectionWizardPlatform("shopify-marketing");
                            setConnectionWizardStep("form");
                          }}
                        >
                          <ProviderMark provider="Shopify" />
                          <div>
                            <strong>Shopify Marketing</strong>
                            <span>Pixel y webhooks</span>
                          </div>
                        </button>
                      </>
                    ) : null}
                  </div>
                  <div className="page-module-actions">
                    <button className="btn ghost" type="button" onClick={() => setConnectionWizardStep("group")}>
                      Volver
                    </button>
                  </div>
                </>
              ) : null}

              {connectionWizardStep === "form" ? (
                <div className="settings-subsection">
                  <div className="settings-subsection-head">
                    <div>
                      <strong>
                        {connectionWizardPlatform === "shopify"
                          ? "Conectar Shopify"
                          : connectionWizardPlatform === "woocommerce"
                            ? "Conectar WooCommerce"
                            : connectionWizardPlatform === "alegra"
                              ? "Conectar Alegra"
                              : connectionWizardPlatform === "google-ads"
                                ? "Conectar Google Ads"
                                : connectionWizardPlatform === "meta-ads"
                                  ? "Conectar Meta Ads"
                                  : connectionWizardPlatform === "tiktok-ads"
                                    ? "Conectar TikTok Ads"
                                    : "Shopify Marketing"}
                      </strong>
                      <span>
                        {selectedStore
                          ? `Tienda actual: ${selectedStore.name}`
                          : "Selecciona una tienda antes de continuar."}
                      </span>
                    </div>
                  </div>
                  <p className="connection-form-hint">{wizardPlatformHint(connectionWizardPlatform)}</p>

                  {connectionWizardPlatform === "shopify" ? (
                    <>
                      <label className="connection-form-row">
                        <span>Shop domain</span>
                        <input
                          className="input"
                          value={shopifyDomainInput}
                          onChange={(event) => setShopifyDomainInput(event.target.value)}
                          placeholder="mitienda.myshopify.com"
                        />
                      </label>
                      <p className="connection-form-hint">
                        No uses el dominio custom público; aquí debes registrar el dominio técnico de Shopify.
                      </p>
                      <div className="page-module-actions">
                        <button className="btn primary" type="button" onClick={startShopifyConnection}>
                          Conectar Shopify
                        </button>
                      </div>
                    </>
                  ) : null}

                  {connectionWizardPlatform === "woocommerce" ? (
                    <>
                      <label className="connection-form-row">
                        <span>Dominio WooCommerce</span>
                        <input
                          className="input"
                          value={wooDomain}
                          onChange={(event) => setWooDomain(event.target.value)}
                        />
                      </label>
                      <p className="connection-form-hint">
                        El dominio debe exponer la API REST de WooCommerce y quedar accesible desde el middleware.
                      </p>
                      <label className="connection-form-row">
                        <span>Consumer key</span>
                        <input
                          className="input"
                          value={wooConsumerKey}
                          onChange={(event) => setWooConsumerKey(event.target.value)}
                        />
                      </label>
                      <label className="connection-form-row">
                        <span>Consumer secret</span>
                        <input
                          className="input"
                          value={wooConsumerSecret}
                          onChange={(event) => setWooConsumerSecret(event.target.value)}
                        />
                      </label>
                      <div className="page-module-actions">
                        <button className="btn primary" type="button" onClick={() => void reconnectWooCommerce()}>
                          Guardar WooCommerce
                        </button>
                      </div>
                    </>
                  ) : null}

                  {connectionWizardPlatform === "alegra" ? (
                    <>
                      <label className="connection-form-row">
                        <span>Modo</span>
                        <select
                          className="input"
                          value={alegraMode}
                          onChange={(event) => setAlegraMode(event.target.value === "manual" ? "manual" : "existing")}
                        >
                          <option value="existing">Usar cuenta existente</option>
                          <option value="manual">Ingresar credenciales</option>
                        </select>
                      </label>
                      {alegraMode === "existing" ? (
                        <label className="connection-form-row">
                          <span>Cuenta Alegra</span>
                          <select
                            className="input"
                            value={alegraAccountId}
                            onChange={(event) => setAlegraAccountId(event.target.value)}
                          >
                            <option value="">Selecciona una cuenta</option>
                            {workspaceState.alegraAccounts.map((account) => (
                              <option key={`alegra-account:${account.id}`} value={String(account.id)}>
                                {account.email} · {account.environment}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <>
                          <label className="connection-form-row">
                            <span>Email</span>
                            <input
                              className="input"
                              value={alegraEmail}
                              onChange={(event) => setAlegraEmail(event.target.value)}
                            />
                          </label>
                          <label className="connection-form-row">
                            <span>API key</span>
                            <input
                              className="input"
                              value={alegraApiKey}
                              onChange={(event) => setAlegraApiKey(event.target.value)}
                            />
                          </label>
                        </>
                      )}
                      <div className="page-module-actions">
                        <button className="btn primary" type="button" onClick={() => void reconnectAlegra()}>
                          Guardar Alegra
                        </button>
                      </div>
                    </>
                  ) : null}

                  {connectionWizardPlatform === "google-ads" ? (
                    <>
                      <label className="connection-form-row">
                        <span>Customer ID</span>
                        <input
                          className="input"
                          value={googleAdsCustomerId}
                          onChange={(event) => setGoogleAdsCustomerId(event.target.value)}
                        />
                      </label>
                      <p className="connection-form-hint">
                        El `Customer ID` define qué cuenta quedará asociada al permiso de Google Ads.
                      </p>
                      <div className="page-module-actions">
                        <button className="btn primary" type="button" onClick={() => startAdsOAuth("google-ads")}>
                          Conectar Google Ads
                        </button>
                      </div>
                    </>
                  ) : null}

                  {connectionWizardPlatform === "meta-ads" ? (
                    <>
                      <label className="connection-form-row">
                        <span>Ad Account ID</span>
                        <input
                          className="input"
                          value={metaAdsAccountId}
                          onChange={(event) => setMetaAdsAccountId(event.target.value)}
                        />
                      </label>
                      <p className="connection-form-hint">
                        Usa el `Ad Account ID` exacto; después el permiso completa acceso y token operativo.
                      </p>
                      <div className="page-module-actions">
                        <button className="btn primary" type="button" onClick={() => startAdsOAuth("meta-ads")}>
                          Conectar Meta Ads
                        </button>
                      </div>
                    </>
                  ) : null}

                  {connectionWizardPlatform === "tiktok-ads" ? (
                    <>
                      <label className="connection-form-row">
                        <span>Advertiser ID</span>
                        <input
                          className="input"
                          value={tiktokAdsAdvertiserId}
                          onChange={(event) => setTiktokAdsAdvertiserId(event.target.value)}
                        />
                      </label>
                      <p className="connection-form-hint">
                        El `Advertiser ID` ancla el permiso y el posterior consumo de métricas de TikTok Ads.
                      </p>
                      <div className="page-module-actions">
                        <button className="btn primary" type="button" onClick={() => startAdsOAuth("tiktok-ads")}>
                          Conectar TikTok Ads
                        </button>
                      </div>
                    </>
                  ) : null}

                  {connectionWizardPlatform === "shopify-marketing" ? (
                    <>
                      <p className="connection-inline-note">
                        Shopify Marketing ya quedó portado en el submódulo propio. Desde ahí gestionas pixel, script y
                        webhooks.
                      </p>
                      <div className="page-module-actions">
                        <a className="btn primary" href="/settings/marketing">
                          Abrir marketing
                        </a>
                      </div>
                    </>
                  ) : null}

                  <div className="page-module-actions">
                    <button className="btn ghost" type="button" onClick={() => setConnectionWizardStep("platform")}>
                      Volver
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isCreateStoreOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsCreateStoreOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Tienda</p>
                <h3>Crear tienda</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={() => setIsCreateStoreOpen(false)}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">
                Crea primero la tienda en la base activa. Después vuelves al flujo de conexiones para completar Shopify,
                WooCommerce, Alegra o Ads.
              </p>
              <div className="settings-subsection">
                <div className="settings-subsection-head">
                  <div>
                    <strong>Datos base</strong>
                    <span>Alta mínima para registrar una nueva tienda en la base activa.</span>
                  </div>
                </div>
                <label className="connection-form-row">
                  <span>Nombre</span>
                  <input
                    className="input"
                    value={newStoreName}
                    onChange={(event) => setNewStoreName(event.target.value)}
                  />
                </label>
                <p className="connection-form-hint">
                  Usa un nombre operativo claro. Será el contexto visible para configuración, facturación y marketing.
                </p>
              </div>
              <div className="page-module-actions">
                <button
                  className="btn primary"
                  type="button"
                  disabled={actionLoadingKey === "store:create"}
                  onClick={() => {
                    void createStore();
                  }}
                >
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reconnectKind === "woocommerce" ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setReconnectKind(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Reconexión</p>
                <h3>WooCommerce</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={() => setReconnectKind(null)}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">
                Reingresa el dominio y las llaves activas de WooCommerce. Esta reconexión se usa para restablecer sync y
                lecturas de pedidos o catálogo.
              </p>
              <div className="settings-subsection">
                <div className="settings-subsection-head">
                  <div>
                    <strong>Credenciales</strong>
                    <span>Actualiza dominio y llaves de acceso para restablecer la conexión.</span>
                  </div>
                </div>
                <label className="connection-form-row">
                  <span>Dominio</span>
                  <input className="input" value={wooDomain} onChange={(event) => setWooDomain(event.target.value)} />
                </label>
                <p className="connection-form-hint">
                  Debe apuntar al sitio base donde expone la API REST de WooCommerce.
                </p>
                <label className="connection-form-row">
                  <span>Consumer Key</span>
                  <input
                    className="input"
                    value={wooConsumerKey}
                    onChange={(event) => setWooConsumerKey(event.target.value)}
                  />
                </label>
                <label className="connection-form-row">
                  <span>Consumer Secret</span>
                  <input
                    className="input"
                    type="password"
                    value={wooConsumerSecret}
                    onChange={(event) => setWooConsumerSecret(event.target.value)}
                  />
                </label>
              </div>
              <div className="page-module-actions">
                <button
                  className="btn primary"
                  type="button"
                  disabled={actionLoadingKey === "reconnect:woocommerce"}
                  onClick={() => {
                    void reconnectWooCommerce();
                  }}
                >
                  Guardar conexión
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {reconnectKind === "alegra" ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setReconnectKind(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Reconexión</p>
                <h3>Alegra</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={() => setReconnectKind(null)}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-intro">
                Primero eliges el modo de reconexión. Luego reutilizas una cuenta ya registrada o cargas credenciales
                nuevas para dejar disponible el catálogo de facturación.
              </p>
              <div className="settings-subsection">
                <div className="settings-subsection-head">
                  <div>
                    <strong>Modo de reconexión</strong>
                    <span>Selecciona si reutilizas una cuenta registrada o si cargas credenciales nuevas.</span>
                  </div>
                </div>
                <div className="page-module-actions">
                  <button
                    className={`btn ${alegraMode === "existing" ? "primary" : "ghost"}`}
                    type="button"
                    onClick={() => setAlegraMode("existing")}
                  >
                    Cuenta existente
                  </button>
                  <button
                    className={`btn ${alegraMode === "manual" ? "primary" : "ghost"}`}
                    type="button"
                    onClick={() => setAlegraMode("manual")}
                  >
                    Credenciales nuevas
                  </button>
                </div>
              </div>
              {alegraMode === "existing" ? (
                <div className="settings-subsection">
                  <div className="settings-subsection-head">
                    <div>
                      <strong>Cuenta registrada</strong>
                      <span>Reutiliza una cuenta Alegra ya presente en el tenant.</span>
                    </div>
                  </div>
                  <label className="connection-form-row">
                    <span>Cuenta</span>
                    <select
                      className="input"
                      value={alegraAccountId}
                      onChange={(event) => setAlegraAccountId(event.target.value)}
                    >
                      <option value="">Selecciona una cuenta</option>
                      {workspaceState.alegraAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.email} · {account.environment}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="connection-form-hint">
                    Reutiliza esta opción cuando la cuenta ya existe en el tenant y solo quieres volver a enlazarla.
                  </p>
                </div>
              ) : (
                <div className="settings-subsection">
                  <div className="settings-subsection-head">
                    <div>
                      <strong>Credenciales nuevas</strong>
                      <span>Usa este flujo cuando la cuenta todavía no existe en la base activa.</span>
                    </div>
                  </div>
                  <label className="connection-form-row">
                    <span>Email</span>
                    <input
                      className="input"
                      value={alegraEmail}
                      onChange={(event) => setAlegraEmail(event.target.value)}
                    />
                  </label>
                  <p className="connection-form-hint">
                    Usa este modo solo cuando la cuenta todavía no existe en la base activa o cambió completamente.
                  </p>
                  <label className="connection-form-row">
                    <span>API Key</span>
                    <input
                      className="input"
                      type="password"
                      value={alegraApiKey}
                      onChange={(event) => setAlegraApiKey(event.target.value)}
                    />
                  </label>
                  <label className="connection-form-row">
                    <span>Entorno</span>
                    <select
                      className="input"
                      value={alegraEnvironment}
                      onChange={(event) => setAlegraEnvironment(event.target.value)}
                    >
                      <option value="prod">Producción</option>
                      <option value="sandbox">Pruebas</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="page-module-actions">
                <button
                  className="btn primary"
                  type="button"
                  disabled={actionLoadingKey === "reconnect:alegra"}
                  onClick={() => {
                    void reconnectAlegra();
                  }}
                >
                  Guardar conexión
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
