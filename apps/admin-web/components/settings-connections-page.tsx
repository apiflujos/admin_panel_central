"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ConnectionsWorkspace } from "../lib/connections-workspace";
import { apiFetch, copyStoreConfigFrom } from "../lib/api";
import { toneForStatus } from "../lib/status";
import { GlobalInvoiceSettingsPanel } from "./global-invoice-settings-panel";
import { CronScheduleReferencePanel } from "./cron-schedule-reference-panel";
import { LegacySyncCompatibilityPanel } from "./legacy-sync-compatibility-panel";
import { StoreConfigPriceListsPanel } from "./store-config-price-lists-panel";
import { StoreConfigsCriticalPanel } from "./store-configs-critical-panel";
import { StoreSyncActionsPanel } from "./store-sync-actions-panel";
import { StoreSyncAutomationPanel } from "./store-sync-automation-panel";
import { StoreMarketingConfigPanel } from "./store-marketing-config-panel";
import { StoreSyncModulesPanel } from "./store-sync-modules-panel";
import { ShopifyAppCredentialsForm } from "./shopify-app-credentials-form";
import { PageHeader } from "./ui/page-header";
import { PageToolbar } from "./ui/page-toolbar";
import { ProviderMark } from "./ui/provider-mark";
import { StatusPill } from "./ui/status-pill";

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

type ConnectionModalState =
  | { kind: "closed" }
  | { kind: "connection" }
  | { kind: "create-store" }
  | { kind: "edit-store" };

function wizardPlatformHint(platform: ConnectionWizardPlatform | null) {
  if (platform === "shopify") {
    return "Usa el dominio técnico myshopify.com.";
  }
  if (platform === "woocommerce") {
    return "Dominio + Consumer Key + Secret.";
  }
  if (platform === "alegra") {
    return "Reutiliza cuenta existente o carga credenciales nuevas.";
  }
  if (platform === "google-ads" || platform === "meta-ads" || platform === "tiktok-ads") {
    return "Captura el ID de cuenta y completa OAuth.";
  }
  if (platform === "shopify-marketing") {
    return "Pixel, script y webhooks viven en el submódulo de marketing.";
  }
  return "Completa los datos mínimos para abrir la conexión.";
}

function buildShopifyOAuthParams(
  store: { id: number; name: string },
  shopDomain: string,
  workspace: ConnectionsWorkspace
): URLSearchParams {
  const params = new URLSearchParams({
    shop: shopDomain,
    storeId: String(store.id),
    storeName: store.name,
  });
  const alegraMatch = workspace.alegraAccounts.find((account) => account.storeId === store.id);
  if (alegraMatch) {
    params.set("alegraAccountId", String(alegraMatch.id));
  }
  return params;
}

export function SettingsConnectionsPage({
  workspace,
  callbackState,
  initialStoreId,
}: {
  workspace: ConnectionsWorkspace;
  callbackState?: {
    onboard?: string;
    oauthError?: string;
    connections?: boolean;
  };
  initialStoreId?: number | null;
}) {
  const [workspaceState, setWorkspaceState] = useState<ConnectionsWorkspace>(workspace);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(workspace.stores[0]?.id ?? null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [actionLoadingKey, setActionLoadingKey] = useState<string>("");
  const [modal, setModal] = useState<ConnectionModalState>({ kind: "closed" });
  const [activeStage, setActiveStage] = useState<ConfigFlowStage>("channels");
  const [connectionWizardStep, setConnectionWizardStep] = useState<ConnectionWizardStep>("store");
  const [connectionWizardGroup, setConnectionWizardGroup] = useState<ConnectionWizardGroup | null>(null);
  const [connectionWizardPlatform, setConnectionWizardPlatform] = useState<ConnectionWizardPlatform | null>(null);
  const [newStoreName, setNewStoreName] = useState("");
  const [copySourceStoreId, setCopySourceStoreId] = useState<number | null>(null);
  const [shopifyDomainInput, setShopifyDomainInput] = useState("");
  const [shopifyConnectMode, setShopifyConnectMode] = useState<"oauth" | "token">("oauth");
  const [shopifyTokenInput, setShopifyTokenInput] = useState("");
  const [wizardOpenedFromCard, setWizardOpenedFromCard] = useState(false);
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
  const inFlightRef = useRef<Set<string>>(new Set());
  const workspaceRefreshTokenRef = useRef(0);

  useEffect(() => {
    setWorkspaceState(workspace);
    setSelectedStoreId((current) => {
      if (initialStoreId && workspace.stores.some((store) => store.id === initialStoreId)) {
        return initialStoreId;
      }
      return current ?? workspace.stores[0]?.id ?? null;
    });
  }, [initialStoreId, workspace]);

  // Cambio de tienda con wizard abierto: limpia credenciales para no filtrar entre tiendas.
  const previousStoreIdRef = useRef<number | null>(selectedStoreId);
  useEffect(() => {
    if (previousStoreIdRef.current === selectedStoreId) return;
    previousStoreIdRef.current = selectedStoreId;
    if (modal.kind === "connection") {
      setShopifyTokenInput("");
      setWooConsumerKey("");
      setWooConsumerSecret("");
      setAlegraEmail("");
      setAlegraApiKey("");
      // Repuebla alegraAccountId con la cuenta de la nueva tienda (si la tiene) —
      // así el operador no ve un dropdown vacío cuando la tienda destino sí está ligada.
      const nextAccount = workspaceState.alegraAccounts.find((item) => item.storeId === selectedStoreId);
      setAlegraAccountId(nextAccount ? String(nextAccount.id) : "");
      setAlegraMode(nextAccount ? "existing" : "manual");
      setAlegraEnvironment(nextAccount?.environment || "prod");
      setShopifyDomainInput(
        workspaceState.stores.find((store) => store.id === selectedStoreId)?.providers.shopify?.shopDomain || ""
      );
    }
  }, [selectedStoreId, modal.kind, workspaceState.stores, workspaceState.alegraAccounts]);
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
      setStatusMessage(`Shopify conectado para ${callbackState.onboard}.`);
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

  useEffect(() => {
    setCopySourceStoreId((current) => {
      if (!copyableSourceStores.length) return null;
      if (current && copyableSourceStores.some((item) => item.storeId === current)) return current;
      return copyableSourceStores[0]?.storeId ?? null;
    });
  }, [copyableSourceStores]);

  const selectedShopifyProvider = selectedStore?.providers.shopify ?? null;
  const selectedWooProvider = selectedStore?.providers.woocommerce ?? null;
  const selectedAlegraProvider = selectedStore?.providers.alegra ?? null;
  const connectedAdsCount = workspaceState.ads.filter((ad) => ad.status === "connected").length;
  const connectedCommerceCount = [selectedShopifyProvider, selectedWooProvider].filter(
    (provider) => provider?.status === "connected"
  ).length;
  const isOperationalStage = activeStage !== "channels";

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
    const token = ++workspaceRefreshTokenRef.current;
    const response = await fetch("/api/admin-web/connections/workspace", {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`workspace_refresh_failed:${response.status}`);
    }
    const next = (await response.json()) as ConnectionsWorkspace;
    // Descarta respuestas que llegaron después de una nueva llamada — evita clobber por refrescos rápidos.
    if (token !== workspaceRefreshTokenRef.current) return next;
    setWorkspaceState(next);
    setSelectedStoreId((current) => {
      if (!current) return next.stores[0]?.id ?? null;
      return next.stores.some((store) => store.id === current) ? current : (next.stores[0]?.id ?? null);
    });
    return next;
  }

  async function createStore() {
    if (!newStoreName.trim()) {
      setStatusMessage("Nombre de tienda requerido.");
      return;
    }
    setActionLoadingKey("store:create");
    setStatusMessage("");
    try {
      const response = await apiFetch("/api/stores", {
        method: "POST",
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
      setModal({ kind: "closed" });
      setStatusMessage("Tienda creada.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo crear la tienda.");
    } finally {
      setActionLoadingKey("");
    }
  }

  function openCreateStore() {
    setModal({ kind: "create-store" });
  }

  function closeCreateStore() {
    setModal({ kind: "closed" });
    setNewStoreName("");
  }

  function openEditStore() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    setNewStoreName(selectedStore.name);
    setModal({ kind: "edit-store" });
  }

  async function renameStore() {
    if (!selectedStore) return;
    if (!newStoreName.trim()) {
      setStatusMessage("Nombre de tienda requerido.");
      return;
    }
    setActionLoadingKey("store:update");
    setStatusMessage("");
    try {
      const response = await apiFetch(`/api/stores/${selectedStore.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStoreName.trim() }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `store_update_failed:${response.status}`);
      }
      await refreshWorkspace();
      setNewStoreName("");
      setModal({ kind: "closed" });
      setStatusMessage("Tienda actualizada.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo actualizar la tienda.");
    } finally {
      setActionLoadingKey("");
    }
  }

  async function deleteStore() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(`¿Eliminar la tienda "${selectedStore.name}"? Esta acción no se puede deshacer.`)
    ) {
      return;
    }
    setActionLoadingKey("store:delete");
    setStatusMessage("");
    try {
      const response = await apiFetch(`/api/stores/${selectedStore.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `store_delete_failed:${response.status}`);
      }
      const next = await refreshWorkspace();
      setSelectedStoreId(next.stores[0]?.id ?? null);
      setStatusMessage("Tienda eliminada.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo eliminar la tienda.");
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

  function openReconnect(kind: "woocommerce" | "alegra") {
    // WooCommerce y Alegra reutilizan el wizard unificado en su paso de formulario.
    setModal({ kind: "connection" });
    setConnectionWizardStep("form");
    setWizardOpenedFromCard(true);
    if (kind === "woocommerce") {
      setWooDomain(selectedStore?.providers.woocommerce?.shopDomain || "");
      setWooConsumerKey("");
      setWooConsumerSecret("");
      setConnectionWizardPlatform("woocommerce");
      setConnectionWizardGroup("commerce");
      return;
    }
    // alegra — solo la cuenta ligada a la tienda seleccionada; sin fallback a la primera cuenta ajena.
    const account = workspaceState.alegraAccounts.find((item) => item.storeId === selectedStore?.id);
    setAlegraMode(account ? "existing" : "manual");
    setAlegraAccountId(account ? String(account.id) : "");
    setAlegraEmail(account?.email || "");
    setAlegraApiKey("");
    setAlegraEnvironment(account?.environment || "prod");
    setConnectionWizardPlatform("alegra");
    setConnectionWizardGroup("accounting");
  }

  function closeConnectionFlow() {
    setModal({ kind: "closed" });
    setConnectionWizardStep("store");
    setConnectionWizardGroup(null);
    setConnectionWizardPlatform(null);
    setWizardOpenedFromCard(false);
    // Limpia credenciales en memoria: el wizard las vuelve a pedir si las necesita.
    setShopifyTokenInput("");
    setWooConsumerKey("");
    setWooConsumerSecret("");
    setAlegraEmail("");
    setAlegraApiKey("");
    setAlegraAccountId("");
    setAlegraMode("existing");
    setAlegraEnvironment("prod");
    setGoogleAdsCustomerId("");
    setMetaAdsAccountId("");
    setTiktokAdsAdvertiserId("");
  }

  function openConnectionFlow(
    platform?: "shopify" | "woocommerce" | "alegra" | "google-ads" | "meta-ads" | "tiktok-ads" | "shopify-marketing"
  ) {
    setStatusMessage("");
    setModal({ kind: "connection" });
    if (!platform) {
      setConnectionWizardStep("store");
      setConnectionWizardGroup(null);
      setConnectionWizardPlatform(null);
      setWizardOpenedFromCard(false);
      return;
    }
    if (platform === "woocommerce" || platform === "alegra") {
      // Salto directo al formulario para evitar pasos redundantes cuando el botón
      // de la tarjeta ya eligió plataforma explícitamente.
      setWizardOpenedFromCard(true);
      openReconnect(platform);
      return;
    }
    setWizardOpenedFromCard(false);
    setConnectionWizardPlatform(platform);
    setConnectionWizardStep("form");
    setConnectionWizardGroup(platform === "shopify" ? "commerce" : "ads");
  }

  function startShopifyConnection() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    const shopDomain = shopifyDomainInput.trim().toLowerCase();
    if (!shopDomain) {
      setStatusMessage("Dominio Shopify requerido.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopDomain)) {
      setStatusMessage("Dominio Shopify debe verse como 'mitienda.myshopify.com'.");
      return;
    }
    window.location.href = `/api/auth/shopify?${buildShopifyOAuthParams(selectedStore, shopDomain, workspaceState).toString()}`;
  }

  async function connectShopifyWithToken() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    const shopDomain = shopifyDomainInput.trim().toLowerCase();
    if (!shopDomain) {
      setStatusMessage("Dominio Shopify requerido.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shopDomain)) {
      setStatusMessage("Dominio Shopify debe verse como 'mitienda.myshopify.com'.");
      return;
    }
    const accessToken = shopifyTokenInput.trim();
    if (!accessToken) {
      setStatusMessage("Access token de Shopify requerido.");
      return;
    }
    if (!/^shpat_[a-zA-Z0-9]+$/.test(accessToken)) {
      setStatusMessage("Access token de Shopify debe empezar con 'shpat_'.");
      return;
    }
    const inFlightKey = "connect:shopify-token";
    if (inFlightRef.current.has(inFlightKey)) return;
    inFlightRef.current.add(inFlightKey);
    setActionLoadingKey(inFlightKey);
    setStatusMessage("");
    try {
      const response = await apiFetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          shopify: { shopDomain, accessToken },
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `shopify_token_connect_failed:${response.status}`);
      }
      const next = await refreshWorkspace();
      const connectedStore = next.stores.find((store) => store.id === selectedStore.id);
      if (connectedStore?.providers.shopify?.status !== "connected") {
        throw new Error("Shopify se guardó, pero el estado no quedó conectado. Revisa las credenciales.");
      }
      setShopifyTokenInput("");
      closeConnectionFlow();
      setStatusMessage(`Shopify conectado a ${shopDomain}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo conectar Shopify con token.");
    } finally {
      inFlightRef.current.delete("connect:shopify-token");
      setActionLoadingKey("");
    }
  }

  async function reconnectWooCommerce() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    const domain = wooDomain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
    const consumerKey = wooConsumerKey.trim();
    const consumerSecret = wooConsumerSecret.trim();
    if (!domain) {
      setStatusMessage("Dominio WooCommerce requerido.");
      return;
    }
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain)) {
      setStatusMessage("Dominio WooCommerce inválido (ej: mitienda.com).");
      return;
    }
    if (!consumerKey) {
      setStatusMessage("Consumer key de WooCommerce requerida.");
      return;
    }
    if (!/^ck_[a-f0-9]{20,64}$/i.test(consumerKey)) {
      setStatusMessage("Consumer key inválida (debe empezar con 'ck_' + hex).");
      return;
    }
    if (!consumerSecret) {
      setStatusMessage("Consumer secret de WooCommerce requerido.");
      return;
    }
    if (!/^cs_[a-f0-9]{20,64}$/i.test(consumerSecret)) {
      setStatusMessage("Consumer secret inválido (debe empezar con 'cs_' + hex).");
      return;
    }
    const inFlightKey = "reconnect:woocommerce";
    if (inFlightRef.current.has(inFlightKey)) return;
    inFlightRef.current.add(inFlightKey);
    setActionLoadingKey(inFlightKey);
    setStatusMessage("");
    try {
      const response = await apiFetch("/api/woocommerce/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          shopDomain: domain,
          consumerKey,
          consumerSecret,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || `woocommerce_reconnect_failed:${response.status}`);
      }
      const next = await refreshWorkspace();
      const connectedStore = next.stores.find((store) => store.id === selectedStore.id);
      if (connectedStore?.providers.woocommerce?.status !== "connected") {
        throw new Error("WooCommerce se guardó, pero el estado no quedó conectado. Revisa las credenciales.");
      }
      setWooConsumerKey("");
      setWooConsumerSecret("");
      closeConnectionFlow();
      setStatusMessage("WooCommerce actualizado.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo actualizar WooCommerce.");
    } finally {
      inFlightRef.current.delete("reconnect:woocommerce");
      setActionLoadingKey("");
    }
  }

  async function reconnectAlegra() {
    if (!selectedStore) {
      setStatusMessage("Selecciona una tienda.");
      return;
    }
    if (alegraMode === "existing") {
      if (!alegraAccountId) {
        setStatusMessage("Selecciona una cuenta Alegra.");
        return;
      }
      const known = workspaceState.alegraAccounts.some((account) => String(account.id) === alegraAccountId);
      if (!known) {
        setStatusMessage("La cuenta Alegra seleccionada ya no está disponible.");
        setAlegraAccountId("");
        return;
      }
    } else {
      const email = alegraEmail.trim();
      const apiKey = alegraApiKey.trim();
      if (!email || !apiKey) {
        setStatusMessage("Email y API key de Alegra son obligatorios.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatusMessage("Email de Alegra con formato inválido.");
        return;
      }
    }
    const inFlightKey = "reconnect:alegra";
    if (inFlightRef.current.has(inFlightKey)) return;
    inFlightRef.current.add(inFlightKey);
    setActionLoadingKey(inFlightKey);
    setStatusMessage("");
    try {
      const alegraPayload =
        alegraMode === "existing"
          ? { accountId: Number(alegraAccountId) }
          : {
              email: alegraEmail.trim(),
              apiKey: alegraApiKey.trim(),
              environment: alegraEnvironment,
            };
      const response = await apiFetch("/api/connections", {
        method: "POST",
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
      const next = await refreshWorkspace();
      const connectedStore = next.stores.find((store) => store.id === selectedStore.id);
      if (connectedStore?.providers.alegra?.status !== "connected") {
        throw new Error("Alegra se guardó, pero el estado no quedó conectado. Revisa las credenciales.");
      }
      setAlegraApiKey("");
      setAlegraEmail("");
      closeConnectionFlow();
      setStatusMessage("Alegra asociado o actualizado.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo actualizar Alegra.");
    } finally {
      inFlightRef.current.delete("reconnect:alegra");
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

      <ShopifyAppCredentialsForm />

      <section className="page-module-shell page-module-shell-compact config-active-store-shell">
        <div className="page-module-head">
          <div>
            <h3>Tienda activa</h3>
          </div>
          <div className="page-module-actions">
            <button
              className="btn ghost btn-compact"
              type="button"
              onClick={() => {
                void refreshWorkspace();
              }}
            >
              Refrescar
            </button>
            <button className="btn primary btn-compact" type="button" onClick={openCreateStore}>
              Crear tienda
            </button>
            <button
              className="btn ghost btn-compact"
              type="button"
              disabled={!selectedStore}
              onClick={openEditStore}
            >
              Editar
            </button>
            <button
              className="btn ghost btn-compact"
              type="button"
              disabled={!selectedStore || actionLoadingKey === "store:delete"}
              onClick={() => {
                void deleteStore();
              }}
            >
              Eliminar
            </button>
            <button className="btn primary btn-compact" type="button" onClick={() => openConnectionFlow()}>
              Nueva conexión
            </button>
          </div>
        </div>
        <div className="config-active-store-grid">
          <label className="field">
            <span>Tienda</span>
            <select
              className="input"
              value={selectedStore?.id ?? ""}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setSelectedStoreId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
              }}
            >
              {workspaceState.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <div className="config-active-store-meta">
            {selectedStore ? <span className="pill pill-info">#{selectedStore.id}</span> : null}
            {selectedStore?.providers.shopify ? <ProviderMark provider="Shopify" /> : null}
            {selectedStore?.providers.woocommerce ? <ProviderMark provider="WooCommerce" /> : null}
            {selectedStore?.providers.alegra ? <ProviderMark provider="Alegra" /> : null}
            {!selectedStore?.providers.shopify &&
            !selectedStore?.providers.woocommerce &&
            !selectedStore?.providers.alegra ? (
              <span className="pill">Sin plataformas activas</span>
            ) : null}
            {workspaceState.securityMisconfigured ? (
              <span className="pill pill-bad">Credenciales por reconectar</span>
            ) : null}
          </div>
          <label className="field">
            <span>Copiar configuración desde</span>
            <select
              className="input"
              value={copySourceStoreId ?? ""}
              disabled={!copyableSourceStores.length || !selectedStore}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setCopySourceStoreId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
              }}
            >
              {!copyableSourceStores.length ? <option value="">Sin origen disponible</option> : null}
              {copyableSourceStores.map((store) => (
                <option key={`copy-source:${store.storeId}`} value={store.storeId}>
                  {store.storeName}
                </option>
              ))}
            </select>
          </label>
          <div className="page-module-actions config-active-store-copy">
            <button
              className="btn ghost btn-compact"
              type="button"
              disabled={
                !selectedStore || !copySourceStoreId || actionLoadingKey === `copy-config:${selectedStore?.id ?? ""}`
              }
              onClick={() => void copyStoreConfig()}
            >
              {actionLoadingKey === `copy-config:${selectedStore?.id ?? ""}` ? "Copiando..." : "Aplicar copia"}
            </button>
          </div>
        </div>
        {statusMessage ? <p className="connection-inline-note">{statusMessage}</p> : null}
      </section>

      {activeStage === "channels" ? (
        <section className="page-module-shell connection-section-shell">
          <section className="integration-hub-grid">
            <article className="card integration-hub-card">
              <div className="integration-hub-head">
                <div className="provider-mark-row">
                  <ProviderMark provider="Shopify" />
                  <ProviderMark provider="WooCommerce" />
                  <div>
                    <strong>E-commerce</strong>
                    <span>{selectedStore?.name || "—"}</span>
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
                    <span>{selectedStore?.name || "—"}</span>
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
                    <span>{selectedStore?.name || "—"}</span>
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

          {activeStage === "operations" ? (
            <div className="operations-panels">
              <details className="settings-panel-collapse" open>
                <summary>Módulos por tienda</summary>
                <StoreSyncModulesPanel
                  stores={workspaceState.stores}
                  storeConfigs={workspaceState.storeConfigs}
                  defaults={workspaceState.storeConfigDefaults}
                  activeStoreId={selectedStoreId}
                  onStoreConfigSaved={handleStoreConfigSaved}
                />
              </details>

              <details className="settings-panel-collapse">
                <summary>Reglas críticas y bodegas</summary>
                <StoreConfigsCriticalPanel
                  stores={workspaceState.stores}
                  storeConfigs={workspaceState.storeConfigs}
                  defaults={workspaceState.storeConfigDefaults}
                  activeStoreId={selectedStoreId}
                  onStoreConfigSaved={handleStoreConfigSaved}
                />
              </details>

              <details className="settings-panel-collapse">
                <summary>Listas de precio</summary>
                <StoreConfigPriceListsPanel
                  stores={workspaceState.stores}
                  storeConfigs={workspaceState.storeConfigs}
                  defaults={workspaceState.storeConfigDefaults}
                  activeStoreId={selectedStoreId}
                  onStoreConfigSaved={handleStoreConfigSaved}
                />
              </details>

              <details className="settings-panel-collapse">
                <summary>Automatización (cron)</summary>
                <StoreSyncAutomationPanel
                  stores={workspaceState.stores}
                  storeConfigs={workspaceState.storeConfigs}
                  defaults={workspaceState.storeConfigDefaults}
                  activeStoreId={selectedStoreId}
                />
                <CronScheduleReferencePanel />
              </details>

              <details className="settings-panel-collapse">
                <summary>Ejecuciones manuales y masivas</summary>
                <StoreSyncActionsPanel
                  stores={workspaceState.stores}
                  storeConfigs={workspaceState.storeConfigs}
                  defaults={workspaceState.storeConfigDefaults}
                  activeStoreId={selectedStoreId}
                />
              </details>
            </div>
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
                    <strong>Atajos a configuración avanzada</strong>
                    <span>Stores y marketing en su vista detallada.</span>
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


      {modal.kind === "connection" ? (
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
              {!wizardOpenedFromCard ? (
                <div className="page-module-actions wizard-progress">
                  <span className={`pill ${connectionWizardStep === "store" ? "pill-info" : ""}`}>1. Tienda</span>
                  <span className={`pill ${connectionWizardStep === "group" ? "pill-info" : ""}`}>2. Grupo</span>
                  <span className={`pill ${connectionWizardStep === "platform" ? "pill-info" : ""}`}>3. Plataforma</span>
                  <span className={`pill ${connectionWizardStep === "form" ? "pill-info" : ""}`}>4. Configurar</span>
                </div>
              ) : null}

              {statusMessage ? (
                <p className="connection-inline-note" role="status" aria-live="polite">
                  {statusMessage}
                </p>
              ) : null}

              {connectionWizardStep === "store" ? (
                <div className="settings-subsection">
                  <div className="settings-subsection-head">
                    <div>
                      <strong>Tienda objetivo</strong>
                      <span>Elige la tienda para esta conexión.</span>
                    </div>
                  </div>
                  {workspaceState.stores.length === 0 ? (
                    <>
                      <p className="connection-inline-note">
                        Aún no hay tiendas creadas. Crea una para poder asociar conexiones.
                      </p>
                      <div className="page-module-actions">
                        <button className="btn primary" type="button" onClick={openCreateStore}>
                          Crear tienda
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <select
                        className="input"
                        value={selectedStore?.id ?? ""}
                        onChange={(event) => {
                const parsed = Number(event.target.value);
                setSelectedStoreId(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
              }}
                      >
                        {workspaceState.stores.map((store) => (
                          <option key={`wizard-store:${store.id}`} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>

                      <div className="page-module-actions">
                        <button className="btn ghost" type="button" onClick={openCreateStore}>
                          Crear tienda
                        </button>
                        <button
                          className="btn primary"
                          type="button"
                          disabled={!selectedStore}
                          onClick={() => setConnectionWizardStep("group")}
                        >
                          Continuar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {connectionWizardStep === "group" ? (
                <div className="settings-subsection">
                  <div className="settings-subsection-head">
                    <div>
                      <strong>Grupo funcional</strong>
                      <span>Define qué plataformas verás en el siguiente paso.</span>
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
                      <span>Elige la plataforma específica.</span>
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
                      <div className="connection-mode-toggle" role="tablist" aria-label="Método de conexión Shopify">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={shopifyConnectMode === "oauth"}
                          className={`btn ${shopifyConnectMode === "oauth" ? "primary" : "ghost"}`}
                          onClick={() => setShopifyConnectMode("oauth")}
                        >
                          OAuth (recomendado)
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={shopifyConnectMode === "token"}
                          className={`btn ${shopifyConnectMode === "token" ? "primary" : "ghost"}`}
                          onClick={() => setShopifyConnectMode("token")}
                        >
                          Token de app privada
                        </button>
                      </div>

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

                      {shopifyConnectMode === "oauth" ? (
                        <div className="page-module-actions">
                          <button className="btn primary" type="button" onClick={startShopifyConnection}>
                            Conectar Shopify
                          </button>
                        </div>
                      ) : (
                        <>
                          <label className="connection-form-row">
                            <span>Admin API access token</span>
                            <input
                              className="input"
                              type="password"
                              value={shopifyTokenInput}
                              onChange={(event) => setShopifyTokenInput(event.target.value)}
                              placeholder="shpat_…"
                              autoComplete="off"
                            />
                          </label>
                          <p className="connection-form-hint">
                            Token de una app custom/privada de Shopify (Admin API). Se valida contra Shopify y se
                            guarda cifrado. Requiere los scopes de lectura/escritura de productos, pedidos e
                            inventario.
                          </p>
                          <div className="page-module-actions">
                            <button
                              className="btn primary"
                              type="button"
                              onClick={connectShopifyWithToken}
                              disabled={actionLoadingKey === "connect:shopify-token"}
                            >
                              {actionLoadingKey === "connect:shopify-token" ? "Validando…" : "Conectar con token"}
                            </button>
                          </div>
                        </>
                      )}
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
                          placeholder="https://mitienda.com"
                          autoComplete="off"
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
                          autoComplete="off"
                        />
                      </label>
                      <label className="connection-form-row">
                        <span>Consumer secret</span>
                        <input
                          className="input"
                          type="password"
                          value={wooConsumerSecret}
                          onChange={(event) => setWooConsumerSecret(event.target.value)}
                          autoComplete="off"
                        />
                      </label>
                      <div className="page-module-actions">
                        <button
                          className="btn primary"
                          type="button"
                          disabled={actionLoadingKey === "reconnect:woocommerce"}
                          onClick={() => void reconnectWooCommerce()}
                        >
                          {actionLoadingKey === "reconnect:woocommerce" ? "Guardando…" : "Guardar WooCommerce"}
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
                          onChange={(event) => {
                            const next = event.target.value === "manual" ? "manual" : "existing";
                            setAlegraMode(next);
                            // Limpia credenciales al alternar modos para no mezclar.
                            if (next === "existing") {
                              setAlegraEmail("");
                              setAlegraApiKey("");
                            } else {
                              setAlegraAccountId("");
                            }
                          }}
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
                              type="email"
                              value={alegraEmail}
                              onChange={(event) => setAlegraEmail(event.target.value)}
                              placeholder="contacto@empresa.com"
                              autoComplete="off"
                            />
                          </label>
                          <label className="connection-form-row">
                            <span>API key</span>
                            <input
                              className="input"
                              type="password"
                              value={alegraApiKey}
                              onChange={(event) => setAlegraApiKey(event.target.value)}
                              autoComplete="off"
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
                              <option value="sandbox">Sandbox</option>
                            </select>
                          </label>
                        </>
                      )}
                      <div className="page-module-actions">
                        <button
                          className="btn primary"
                          type="button"
                          disabled={actionLoadingKey === "reconnect:alegra"}
                          onClick={() => void reconnectAlegra()}
                        >
                          {actionLoadingKey === "reconnect:alegra" ? "Guardando…" : "Guardar Alegra"}
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
                        El <code>Customer ID</code> define qué cuenta quedará asociada al permiso de Google Ads.
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
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => {
                        if (wizardOpenedFromCard) {
                          closeConnectionFlow();
                        } else {
                          setConnectionWizardStep("platform");
                        }
                      }}
                    >
                      {wizardOpenedFromCard ? "Cancelar" : "Volver"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {modal.kind === "create-store" ? (
        <div className="modal-backdrop" role="presentation" onClick={closeCreateStore}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Tienda</p>
                <h3>Crear tienda</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={closeCreateStore}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <label className="connection-form-row">
                <span>Nombre</span>
                <input
                  className="input"
                  value={newStoreName}
                  onChange={(event) => setNewStoreName(event.target.value)}
                  placeholder="Nombre operativo de la tienda"
                />
              </label>
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

      {modal.kind === "edit-store" ? (
        <div className="modal-backdrop" role="presentation" onClick={closeCreateStore}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Tienda</p>
                <h3>Editar tienda</h3>
              </div>
              <button className="btn ghost btn-compact" type="button" onClick={closeCreateStore}>
                Cerrar
              </button>
            </div>
            <div className="modal-body">
              <label className="connection-form-row">
                <span>Nombre</span>
                <input
                  className="input"
                  value={newStoreName}
                  onChange={(event) => setNewStoreName(event.target.value)}
                  placeholder="Nombre operativo de la tienda"
                />
              </label>
              <div className="page-module-actions">
                <button
                  className="btn primary"
                  type="button"
                  disabled={actionLoadingKey === "store:update"}
                  onClick={() => {
                    void renameStore();
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}
