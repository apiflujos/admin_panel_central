const navItems = document.querySelectorAll(".nav-item");
const sections = document.querySelectorAll(".section");
const refreshButton = document.getElementById("refresh-all");
const sidebarToggle = document.getElementById("sidebar-toggle");
const appShell = document.querySelector(".app-shell");
const statusLedShopify = document.getElementById("status-led-shopify");
const statusTextShopify = document.getElementById("status-shopify");
const statusLedAlegra = document.getElementById("status-led-alegra");
const statusTextAlegra = document.getElementById("status-alegra");
const inventoryCronLed = document.getElementById("inventory-cron-led");
const inventoryCronStatus = document.getElementById("inventory-cron-status");
const inventoryCronCheckpoint = document.getElementById("inventory-cron-checkpoint");
const inventoryCronInterval = document.getElementById("inventory-cron-interval");
const inventoryCronEnabled = document.getElementById("inventory-cron-enabled");
const inventoryCronIntervalSelect = document.getElementById("inventory-cron-interval-select");
const wizardStorePill = document.getElementById("wizard-store-pill");
const queueStatus = document.getElementById("queue-status");
const syncProgress = document.getElementById("sync-progress");
const syncProgressBar = document.getElementById("sync-progress-bar");
const syncProgressLabel = document.getElementById("sync-progress-label");
const productsProgress = document.getElementById("products-progress");
const productsProgressBar = document.getElementById("products-progress-bar");
const productsProgressLabel = document.getElementById("products-progress-label");
const productsSyncProgress = document.getElementById("products-sync-progress");
const productsSyncProgressBar = document.getElementById("products-sync-progress-bar");
const productsSyncProgressLabel = document.getElementById("products-sync-progress-label");
const ordersProgress = document.getElementById("orders-progress");
const ordersProgressBar = document.getElementById("orders-progress-bar");
const ordersProgressLabel = document.getElementById("orders-progress-label");
const ordersSyncProgress = document.getElementById("orders-sync-progress");
const ordersSyncProgressBar = document.getElementById("orders-sync-progress-bar");
const ordersSyncProgressLabel = document.getElementById("orders-sync-progress-label");
const contactsSearch = document.getElementById("contacts-search");
const contactsDateStart = document.getElementById("contacts-date-start");
const contactsDateEnd = document.getElementById("contacts-date-end");
const contactsStatusFilter = document.getElementById("contacts-status");
const contactsSourceFilter = document.getElementById("contacts-source");
const contactsLimitInput = document.getElementById("contacts-limit");
const contactsSearchBtn = document.getElementById("contacts-search-btn");
const contactsRefreshBtn = document.getElementById("contacts-refresh");
const contactsClearBtn = document.getElementById("contacts-clear");
const contactsTableBody = document.querySelector("#contacts-table tbody");
const contactsPageLabel = document.getElementById("contacts-page");
const contactsPrevBtn = document.getElementById("contacts-prev");
const contactsNextBtn = document.getElementById("contacts-next");
const contactsPageInput = document.getElementById("contacts-page-input");
const contactsPageGo = document.getElementById("contacts-page-go");
const contactsCountLabel = document.getElementById("contacts-count");

const modal = document.getElementById("payload-modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");
const einvoiceModal = document.getElementById("einvoice-modal");
const einvoiceClose = document.getElementById("einvoice-close");
const einvoiceSave = document.getElementById("einvoice-save");
const einvoiceOrderLabel = document.getElementById("einvoice-order");
const einvoiceStatus = document.getElementById("einvoice-status");
const einvoiceFlag = document.getElementById("einvoice-flag");
const einvoiceName = document.getElementById("einvoice-name");
const einvoiceIdType = document.getElementById("einvoice-id-type");
const einvoiceIdNumber = document.getElementById("einvoice-id-number");
const einvoiceEmail = document.getElementById("einvoice-email");
const einvoicePhone = document.getElementById("einvoice-phone");
const einvoiceAddress = document.getElementById("einvoice-address");
const einvoiceCity = document.getElementById("einvoice-city");
const einvoiceState = document.getElementById("einvoice-state");
const einvoiceCountry = document.getElementById("einvoice-country");
const einvoiceZip = document.getElementById("einvoice-zip");

const logTableBody = document.querySelector("#log-table tbody");
const logStatus = document.getElementById("log-status");
const logOrderId = document.getElementById("log-order-id");
const logFilter = document.getElementById("log-filter");
const logRetry = document.getElementById("log-retry");
const connectionsGrid = document.getElementById("connections-grid");
const qaTokenGenerate = document.getElementById("qa-token-generate");
const qaTokenCopy = document.getElementById("qa-token-copy");
const qaTokenValue = document.getElementById("qa-token-value");
const qaTokenHint = document.getElementById("qa-token-hint");

const kpiSalesToday = document.getElementById("kpi-sales-today");
const kpiSalesTodaySub = document.getElementById("kpi-sales-today-sub");
const kpiBillingAlegra = document.getElementById("kpi-billing-alegra");
const kpiBillingAlegraSub = document.getElementById("kpi-billing-alegra-sub");
const kpiShopifyLabel = document.getElementById("kpi-shopify-label");
const kpiAlegraLabel = document.getElementById("kpi-alegra-label");
const chartWeekly = document.getElementById("chart-weekly");
const winsTopProducts = document.getElementById("wins-top-products");
const winsTopCities = document.getElementById("wins-top-cities");
const winsPaymentMethods = document.getElementById("wins-payment-methods");
const winsTopRevenueBody = document.querySelector("#wins-top-revenue tbody");
const winsTopCustomersBody = document.querySelector("#wins-top-customers tbody");
const alertLowStockBody = document.querySelector("#alert-low-stock tbody");
const alertInactiveBody = document.querySelector("#alert-inactive-products tbody");
const panelTopProducts = document.getElementById("panel-top-products");
const panelTopRevenue = document.getElementById("panel-top-revenue");
const panelTopCities = document.getElementById("panel-top-cities");
const panelTopCustomers = document.getElementById("panel-top-customers");
const panelPaymentMethods = document.getElementById("panel-payment-methods");
const panelInventoryAlerts = document.getElementById("panel-inventory-alerts");
const cardLowStock = document.getElementById("card-low-stock");
const cardInactiveProducts = document.getElementById("card-inactive-products");
const assistantLaunch = document.getElementById("assistant-launch");
const assistantDrawer = document.getElementById("assistant-drawer");
const assistantClose = document.getElementById("assistant-close");
const metricsRange = document.getElementById("metrics-range");
const metricsShopifyStatus = document.getElementById("metrics-shopify-status");
const metricsAlegraStatus = document.getElementById("metrics-alegra-status");
const weeklyGrowthLabel = document.getElementById("chart-weekly-label");
const chartAlegra = document.getElementById("chart-alegra");
const alegraGrowthLabel = document.getElementById("chart-alegra-label");
const assistantMessages = document.getElementById("assistant-messages");
const assistantInput = document.getElementById("assistant-input");
const assistantSend = document.getElementById("assistant-send");
const assistantAttach = document.getElementById("assistant-attach");
const assistantFileInput = document.getElementById("assistant-file");
const assistantAttachments = document.getElementById("assistant-attachments");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userRole = document.getElementById("user-role");
const userMenu = document.getElementById("topbar-user-menu");
const userMenuToggle = document.getElementById("topbar-user-toggle");
const companyLogo = document.getElementById("company-logo");

const storeNameInput = document.getElementById("store-name");
const storeActiveField = document.getElementById("store-active-field");
const storeActiveSelect = document.getElementById("store-active-select");
const storeDelete = document.getElementById("store-delete");
const ordersStoreSelect = document.getElementById("orders-store-select");
const productsStoreSelect = document.getElementById("products-store-select");
const contactsStoreSelect = document.getElementById("contacts-store-select");
const shopifyDomain = document.getElementById("shopify-domain");
const shopifyToken = document.getElementById("shopify-token");
const shopifyTokenField = document.getElementById("shopify-token-field");
const shopifyConnectPicker = document.getElementById("shopify-connect-picker");
const shopifyConnectHint = document.getElementById("shopify-connect-hint");
const wizardStart = document.getElementById("wizard-start");
const wizardStop = document.getElementById("wizard-stop");
const wizardSkip = document.getElementById("wizard-skip");
const manualOpen = document.getElementById("manual-open");
const wizardHint = document.getElementById("wizard-hint");
const setupModePicker = document.getElementById("setup-mode-picker");
const settingsSubmenu = document.getElementById("settings-submenu");
const copyConfigField = document.getElementById("copy-config-field");
const copyConfigSelect = document.getElementById("copy-config-select");
const DEFAULT_WIZARD_HINT = wizardHint ? wizardHint.textContent : "";

const alegraAccountSelect = document.getElementById("alegra-account-select");
const alegraEnvSelect = document.getElementById("alegra-env-select");
const alegraEnvField = document.getElementById("alegra-env-field");
const alegraEmail = document.getElementById("alegra-email");
const alegraKey = document.getElementById("alegra-key");
const connectShopify = document.getElementById("connect-shopify");
const connectAlegra = document.getElementById("connect-alegra");
const shopifyConnectionPill = document.getElementById("shopify-connection-pill");
const alegraConnectionPill = document.getElementById("alegra-connection-pill");
const aiKey = document.getElementById("ai-key");
const aiSave = document.getElementById("ai-save");
const passwordCurrent = document.getElementById("password-current");
const passwordNew = document.getElementById("password-new");
const passwordConfirm = document.getElementById("password-confirm");
const passwordSave = document.getElementById("password-save");
const passwordMessage = document.getElementById("password-message");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profilePhone = document.getElementById("profile-phone");
const profilePhoto = document.getElementById("profile-photo");
const profileSave = document.getElementById("profile-save");
const profileMessage = document.getElementById("profile-message");
const companyName = document.getElementById("company-name");
const companyPhone = document.getElementById("company-phone");
const companyAddress = document.getElementById("company-address");
const companyLogoInput = document.getElementById("company-logo-input");
const companySave = document.getElementById("company-save");
const companyMessage = document.getElementById("company-message");
const usersTableBody = document.querySelector("#users-table tbody");
const userNameInput = document.getElementById("user-create-name");
const userEmailInput = document.getElementById("user-create-email");
const userPhoneInput = document.getElementById("user-create-phone");
const userRoleInput = document.getElementById("user-create-role");
const userPasswordInput = document.getElementById("user-create-password");
const userCreate = document.getElementById("user-create");
const usersMessage = document.getElementById("users-message");

const cfgResolution = document.getElementById("cfg-resolution");
const cfgCostCenter = document.getElementById("cfg-cost-center");
const cfgWarehouse = document.getElementById("cfg-warehouse");
const cfgSeller = document.getElementById("cfg-seller");
const cfgPaymentMethod = document.getElementById("cfg-payment-method");
const cfgBankAccount = document.getElementById("cfg-bank-account");
const cfgApplyPayment = document.getElementById("cfg-apply-payment");
const cfgObservations = document.getElementById("cfg-observations");
const cfgGenerateInvoice = document.getElementById("cfg-generate-invoice");
const cfgEinvoiceEnabled = document.getElementById("cfg-einvoice-enabled");
const cfgTransferDest = document.getElementById("cfg-transfer-dest");
const cfgTransferEnabled = document.getElementById("cfg-transfer-enabled");
const cfgTransferStrategy = document.getElementById("cfg-transfer-strategy");
const cfgTransferFallback = document.getElementById("cfg-transfer-fallback");
const cfgTransferTieBreak = document.getElementById("cfg-transfer-tiebreak");
const cfgTransferPriority = document.getElementById("cfg-transfer-priority");
const cfgTransferOrigin = document.getElementById("cfg-transfer-origin");
const cfgTransferOriginSummary = document.getElementById("cfg-transfer-origin-summary");
const cfgTransferMinStock = document.getElementById("cfg-transfer-min-stock");
const cfgTransferSplit = document.getElementById("cfg-transfer-split");
const cfgPriceGeneral = document.getElementById("cfg-price-general");
const cfgPriceDiscount = document.getElementById("cfg-price-discount");
const cfgPriceWholesale = document.getElementById("cfg-price-wholesale");
const cfgPriceCurrency = document.getElementById("cfg-price-currency");
const cfgPriceEnabled = document.getElementById("cfg-price-enabled");
const cfgStoreMessage = document.getElementById("cfg-store-message");
const cfgInventoryPublishStock = document.getElementById("cfg-inventory-publish-stock");
const cfgInventoryAutoPublish = document.getElementById("cfg-inventory-auto-publish");
const cfgInventoryWarehouses = document.getElementById("cfg-inventory-warehouses");
const cfgInventoryWarehousesSummary = document.getElementById("cfg-inventory-warehouses-summary");
const syncContactsShopify = document.getElementById("sync-contacts-shopify");
const syncContactsAlegra = document.getElementById("sync-contacts-alegra");
const syncContactsPriority = document.getElementById("sync-contacts-priority");
const syncContactIdentifier = document.getElementById("sync-contact-identifier");
const syncContactSource = document.getElementById("sync-contact-source");
const syncContactRun = document.getElementById("sync-contact-run");
const syncContactLimit = document.getElementById("sync-contact-limit");
const syncContactsShopifyRun = document.getElementById("sync-contacts-shopify-run");
const syncContactsAlegraRun = document.getElementById("sync-contacts-alegra-run");
const syncContactsStatus = document.getElementById("sync-contacts-status");
const syncOrdersShopify = document.getElementById("sync-orders-shopify");
const syncOrdersAlegra = document.getElementById("sync-orders-alegra");
const syncOrdersShopifyEnabled = document.getElementById("sync-orders-shopify-enabled");
const syncOrdersAlegraEnabled = document.getElementById("sync-orders-alegra-enabled");

const opsTableBody = document.querySelector("#ops-table tbody");
const opsSearch = document.getElementById("ops-search");
const opsSearchBtn = document.getElementById("ops-search-btn");
const ordersRefreshBtn = document.getElementById("orders-refresh");
const ordersClearBtn = document.getElementById("orders-clear");
const productsSearchInput = document.getElementById("products-search");
const productsSearchBtn = document.getElementById("products-search-btn");
const productsRefreshBtn = document.getElementById("products-refresh");
const productsClearBtn = document.getElementById("products-clear");
const productsDateFilter = document.getElementById("products-date-filter");
const productsSort = document.getElementById("products-sort");
const productsLimitInput = document.getElementById("products-limit");
const productsWarehouseFilter = document.getElementById("products-warehouse-filter");
const productsWarehouseSummary = document.getElementById("products-warehouse-summary");
const productsWarehouseSelectAll = document.getElementById("products-warehouse-select-all");
const productsInStockOnly = document.getElementById("products-instock-only");
const productsStatusFilter = document.getElementById("products-status-filter");
const productsTableBody = document.querySelector("#products-table tbody");
const productsPageLabel = document.getElementById("products-page");
const productsPrevBtn = document.getElementById("products-prev");
const productsNextBtn = document.getElementById("products-next");
const productsPageInput = document.getElementById("products-page-input");
const productsPageGo = document.getElementById("products-page-go");
const productsCountLabel = document.getElementById("products-count");
const productsStatus = document.getElementById("products-status");
const productsPublishStatus = document.getElementById("products-publish-status");
const productsPublishStatusMass = document.getElementById("products-publish-status-mass");
const productsIncludeImages = document.getElementById("products-include-images");
const productsManualOnlyActive = document.getElementById("products-manual-only-active");
const productsManualPublish = document.getElementById("products-manual-publish");
const rulesOnlyActive = document.getElementById("rules-only-active");
const rulesSyncEnabled = document.getElementById("rules-sync-enabled");
const productsDateStart = document.getElementById("products-date-start");
const productsDateEnd = document.getElementById("products-date-end");
const productsSyncLimitInput = document.getElementById("products-sync-limit");
const productsSyncQuery = document.getElementById("products-sync-query");
const productsSyncOnlyActive = document.getElementById("products-sync-only-active");
const productsSyncPublish = document.getElementById("products-sync-publish");
const productsSyncOnlyPublished = document.getElementById("products-sync-only-published");
const productsSyncIncludeInventory = document.getElementById("products-sync-include-inventory");
const productsSyncFilteredBtn = document.getElementById("products-sync-filtered");
const productsSyncStopBtn = document.getElementById("products-sync-stop");
const ordersDateStart = document.getElementById("orders-date-start");
const ordersDateEnd = document.getElementById("orders-date-end");
const ordersSyncNumber = document.getElementById("orders-sync-number");
const ordersSyncClear = document.getElementById("orders-sync-clear");
const productsSyncClear = document.getElementById("products-sync-clear");
const productsSyncStatus = document.getElementById("products-sync-status");
const ordersSyncStatus = document.getElementById("orders-sync-status");
const ordersLimit = document.getElementById("orders-limit");
const ordersPageLabel = document.getElementById("orders-page");
const ordersPrevBtn = document.getElementById("orders-prev");
const ordersNextBtn = document.getElementById("orders-next");
const ordersCountLabel = document.getElementById("orders-count");
const ordersPageInput = document.getElementById("orders-page-input");
const ordersPageGo = document.getElementById("orders-page-go");
const ordersSyncBtn = document.getElementById("orders-sync");
const ordersDateFilter = document.getElementById("orders-date-filter");
const ordersDaysSelect = document.getElementById("orders-days");
const ordersSort = document.getElementById("orders-sort");
const rulesAutoPublish = document.getElementById("rules-auto-publish");
const rulesAutoStatus = document.getElementById("rules-auto-status");
const rulesAutoImages = document.getElementById("rules-auto-images");
const cfgWarehouseSync = document.getElementById("cfg-warehouse-sync");
const cfgWarehouseSyncSummary = document.getElementById("cfg-warehouse-sync-summary");
const cfgWarehouseSelectAll = document.getElementById("cfg-warehouse-select-all");
const cfgTransferOriginField = document.getElementById("cfg-transfer-origin-field");
const cfgWarehouseSyncField = document.getElementById("cfg-warehouse-sync-field");
const shopifyWebhooksCreate = document.getElementById("shopify-webhooks-create");
const shopifyWebhooksDelete = document.getElementById("shopify-webhooks-delete");
const shopifyWebhooksStatusBtn = document.getElementById("shopify-webhooks-status-btn");
const shopifyWebhooksStatus = document.getElementById("shopify-webhooks-status");

let shopifyAdminBase = "";
let currentUserRole = "agent";
let currentUserId = null;
let activeStoreDomain = "";
let activeStoreName = "";
let storesCache = [];
let activeStoreConfig = null;
let shopifyHasToken = false;
let alegraHasToken = false;
let transferOriginIds = [];
let shopifyOAuthAvailable = true;
let shopifyOAuthMissing = [];

function getTransferOriginDetails() {
  return cfgTransferOrigin ? cfgTransferOrigin.closest("details") : null;
}
let inventoryRules = {
  publishOnStock: true,
  autoPublishOnWebhook: true,
  autoPublishStatus: "draft",
  inventoryAdjustmentsEnabled: true,
  inventoryAdjustmentsIntervalMinutes: 5,
  inventoryAdjustmentsAutoPublish: true,
  onlyActiveItems: false,
  includeImages: true,
  syncEnabled: true,
  warehouseIds: [],
};
let globalInvoiceSettings = null;
let storeRuleOverrides = null;
let storeInvoiceOverrides = null;
let cryptoWarningShown = false;

const PRODUCT_SETTINGS_KEY = "apiflujos-products-settings";
const STORE_WIZARD_KEY = "apiflujos-store-wizard";
const SETUP_MODE_KEY = "apiflujos-setup-mode";
const SETTINGS_PANE_KEY = "apiflujos-settings-pane";
const COPY_CONFIG_FROM_KEY = "apiflujos-copy-config-from";
const COPY_CONFIG_TO_KEY = "apiflujos-copy-config-to";
const COPY_CONFIG_AT_KEY = "apiflujos-copy-config-at";
const COACH_DISMISSED_KEY = "apiflujos-wizard-coach-dismissed";
const SHOPIFY_CONNECT_METHOD_KEY = "apiflujos-shopify-connect-method";
const WIZARD_MODULE_ORDER = [
  "connect-shopify",
  "connect-alegra",
  "shopify-rules",
  "alegra-inventory",
  "sync-orders",
  "alegra-invoice",
  "alegra-logistics",
];
const DEFAULT_PRODUCT_SETTINGS = {
  publish: {
    status: "draft",
    includeImages: true,
    vendor: "",
  },
    sync: {
      dateStart: "",
      dateEnd: "",
      limit: "",
      query: "",
      warehouseIds: [],
      publishOnSync: true,
      onlyPublishedInShopify: true,
      includeInventory: true,
      onlyActive: true,
    },
  orders: {
    dateStart: "",
    dateEnd: "",
    limit: "",
    search: "",
    orderNumber: "",
  },
  filters: {
    publishStatus: "all",
    productsDate: "",
    productsSort: "date_desc",
    listLimit: "30",
    warehouseIds: [],
    inStockOnly: false,
    statusFilter: "all",
    ordersDate: "",
    ordersDateTouched: false,
    ordersDays: "30",
    ordersSort: "date_desc",
  },
};

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

let productSettings = loadProductSettings();
let productsLoaded = false;
let productsLoading = false;
let productsStart = 0;
let productsTotal = null;
let productsQuery = "";
let productsList = [];
let productsRows = [];
let shopifyLookup = {};
let warehousesCatalog = [];
let settingsWarehousesCatalog = [];
const expandedParents = new Set();
let operationsList = [];
let ordersStart = 0;
let ordersTotal = null;
let contactsStart = 0;
let contactsTotal = null;
let contactsList = [];
let activeProductsSyncId = "";
let assistantHasSpoken = false;
let assistantFiles = [];
let activeEinvoiceOrderId = "";

function setProductsBulkSyncRunning(running) {
  const isRunning = Boolean(running);
  if (productsSyncStopBtn) {
    productsSyncStopBtn.hidden = !isRunning;
    productsSyncStopBtn.disabled = !isRunning;
  }
  if (productsSyncClear) {
    productsSyncClear.hidden = isRunning;
    productsSyncClear.disabled = isRunning;
  }
}

function showSection(target) {
  sections.forEach((section) => {
    section.classList.toggle("is-active", section.id === target);
  });
  if (target === "products") {
    ensureProductsLoaded();
  }
  if (target === "logs") {
    loadLogs().catch(() => null);
  }
  if (target === "contacts") {
    loadContacts().catch(() => null);
  }
  if (target === "settings") {
    syncSettingsPane();
  }
}

function activateNav(target) {
  navItems.forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("data-target") === target);
  });
  showSection(target);
}

function resolveSettingsPaneKey(value) {
  const normalized = value === "stores" ? "stores" : (value === "integrations" ? "integrations" : "connections");
  if (normalized === "stores" && (!storesCache || storesCache.length === 0)) {
    return "connections";
  }
  return normalized;
}

function getStoredSettingsPane() {
  try {
    const stored = localStorage.getItem(SETTINGS_PANE_KEY) || "";
    return stored === "stores" || stored === "connections" || stored === "integrations" ? stored : "";
  } catch {
    return "";
  }
}

function saveSettingsPane(value) {
  try {
    localStorage.setItem(SETTINGS_PANE_KEY, value);
  } catch {
    // ignore storage errors
  }
}

function setSettingsPane(paneKey, options = {}) {
  const { persist = true } = options || {};
  const next = resolveSettingsPaneKey(paneKey);
  document.querySelectorAll("[data-settings-pane]").forEach((pane) => {
    pane.classList.toggle("is-active", pane.getAttribute("data-settings-pane") === next);
  });
  if (settingsSubmenu) {
    settingsSubmenu.querySelectorAll("[data-settings-pane-link]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.getAttribute("data-settings-pane-link") === next
      );
    });
  }
  if (persist) saveSettingsPane(next);
}

function syncSettingsPane() {
  const stored = getStoredSettingsPane();
  setSettingsPane(stored || "connections", { persist: false });
}

function updateSettingsSubmenuAvailability() {
  if (!settingsSubmenu) return;
  const hasStores = Boolean(storesCache && storesCache.length);
  settingsSubmenu.querySelectorAll("[data-settings-pane-link]").forEach((button) => {
    const key = button.getAttribute("data-settings-pane-link") || "";
    if (key !== "stores") return;
    button.toggleAttribute("disabled", !hasStores);
    button.classList.toggle("is-disabled", !hasStores);
    if (!hasStores && button.classList.contains("is-active")) {
      setSettingsPane("connections");
    }
  });
}

function getSettingsPaneForElement(element) {
  if (!(element instanceof HTMLElement)) return "";
  const pane = element.closest("[data-settings-pane]");
  if (!(pane instanceof HTMLElement)) return "";
  const key = pane.getAttribute("data-settings-pane") || "";
  return key === "stores" || key === "connections" || key === "integrations" ? key : "";
}

function ensureSettingsPaneForElement(element, options = {}) {
  const { persist = false } = options || {};
  const key = getSettingsPaneForElement(element);
  if (!key) return;
  setSettingsPane(key, { persist });
}

function initSettingsSubmenu() {
  if (!settingsSubmenu) {
    syncSettingsPane();
    return;
  }
  settingsSubmenu.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const button = target.closest("[data-settings-pane-link]");
    if (!(button instanceof HTMLElement)) return;
    const key = button.getAttribute("data-settings-pane-link") || "";
    if (key !== "stores" && key !== "connections" && key !== "integrations") return;
    if (button.hasAttribute("disabled")) return;
    activateNav("settings");
    setSettingsPane(key);
  });
  updateSettingsSubmenuAvailability();
  syncSettingsPane();
}

function cleanupLegacyConnectionsUi() {
  // Compat: si el navegador cargó HTML viejo por cache/deploy anterior, eliminamos botones redundantes.
  const legacyIds = ["wizard-start", "wizard-stop", "wizard-skip", "manual-open", "wizard-hint", "wizard-store-pill"];
  legacyIds.forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.remove();
  });
  document.querySelectorAll(".setup-guided, .setup-manual, [data-setup-panel=\"guided\"], [data-setup-panel=\"manual\"]")
    .forEach((node) => node.remove());
}

function setSidebarCollapsed(collapsed) {
  if (!appShell) return;
  appShell.classList.toggle("is-collapsed", Boolean(collapsed));
  if (sidebarToggle) {
    sidebarToggle.setAttribute("aria-label", collapsed ? "Expandir menu" : "Colapsar menu");
    sidebarToggle.setAttribute("title", collapsed ? "Expandir menu" : "Colapsar menu");
  }
  try {
    localStorage.setItem("apiflujos-sidebar-collapsed", collapsed ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

function loadSidebarState() {
  try {
    const stored = localStorage.getItem("apiflujos-sidebar-collapsed");
    if (stored === "1") {
      setSidebarCollapsed(true);
    }
  } catch {
    // ignore storage errors
  }
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    activateNav(item.getAttribute("data-target"));
    const moduleKey = item.getAttribute("data-module");
    const groups = (item.getAttribute("data-groups") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (moduleKey && item.getAttribute("data-target") === "settings") {
      setTimeout(() => {
        groups.forEach((groupKey) => {
          const panel = getGroupPanel(groupKey);
          if (panel) setGroupCollapsed(panel, false);
        });
        const panel = getModulePanel(moduleKey);
        if (panel) {
          setModuleCollapsed(panel, false);
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);
    }
  });
});

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    const collapsed = appShell?.classList.contains("is-collapsed");
    setSidebarCollapsed(!collapsed);
  });
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) return;
  const button = target.closest("[data-nav-to]");
  if (!(button instanceof HTMLElement)) return;
  const navTarget = button.getAttribute("data-nav-to") || "";
  if (!navTarget) return;
  event.preventDefault();
  activateNav(navTarget);
});


function openModal(payload) {
  modalBody.textContent = payload || "Sin datos";
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

if (modalClose) {
  modalClose.addEventListener("click", closeModal);
}
if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });
}

let toastStack = null;
function ensureToastStack() {
  if (toastStack) return toastStack;
  const stack = document.createElement("div");
  stack.className = "toast-stack";
  stack.setAttribute("aria-live", "polite");
  stack.setAttribute("aria-relevant", "additions");
  document.body.appendChild(stack);
  toastStack = stack;
  return stack;
}

function showToast(message, state, options = {}) {
  const text = message ? String(message).trim() : "";
  if (!text) return;

  const stack = ensureToastStack();
  const toast = document.createElement("div");
  toast.className = state ? `toast ${state}` : "toast";
  toast.setAttribute("role", state === "is-error" ? "alert" : "status");

  const content = document.createElement("div");
  content.className = "toast-message";
  content.textContent = text;
  toast.appendChild(content);

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "Cerrar");
  close.textContent = "×";
  close.addEventListener("click", () => toast.remove());
  toast.appendChild(close);

  stack.appendChild(toast);

  const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : (state === "is-error" ? 6500 : 3500);
  if (timeoutMs > 0) {
    window.setTimeout(() => toast.remove(), timeoutMs);
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (response.status === 401) {
    window.location.href = "/login.html";
    throw new Error("unauthorized");
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Error de red");
  }
  return response.json();
}

function closeHelpPanels(except) {
  document.querySelectorAll(".help-panel.is-open").forEach((panel) => {
    if (panel !== except) {
      panel.classList.remove("is-open");
    }
  });
}

let coachEl = null;
let coachTitleEl = null;
let coachTextEl = null;
let coachActionsEl = null;
let coachHighlightEl = null;
let coachAnchorEl = null;
let coachScrollBound = false;
let coachRepositionHandler = null;

function ensureCoach() {
  if (coachEl) return coachEl;
  const overlay = document.createElement("div");
  overlay.className = "coach-overlay";
  overlay.setAttribute("aria-hidden", "true");

  const panel = document.createElement("div");
  panel.className = "coach";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Guia de configuracion");

  const title = document.createElement("p");
  title.className = "coach-title";
  title.textContent = "Configuracion guiada";

  const text = document.createElement("p");
  text.className = "coach-text";
  text.textContent = "";

  const actions = document.createElement("div");
  actions.className = "coach-actions";

  panel.appendChild(title);
  panel.appendChild(text);
  panel.appendChild(actions);

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  coachEl = panel;
  coachTitleEl = title;
  coachTextEl = text;
  coachActionsEl = actions;

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCoach({ persistDismiss: false });
    }
  });

  return coachEl;
}

function resolveCoachAnchor(target) {
  if (!(target instanceof HTMLElement)) return null;
  return target.closest(".field") || target;
}

function positionCoach(panel, anchor) {
  if (!(panel instanceof HTMLElement)) return;

  // Reset to defaults first (CSS fallback uses right/bottom).
  panel.style.left = "";
  panel.style.top = "";
  panel.style.right = "";
  panel.style.bottom = "";

  if (!(anchor instanceof HTMLElement)) return;

  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
  const gap = 12;
  const margin = 12;

  const isNarrow = window.matchMedia?.("(max-width: 720px)")?.matches ?? false;

  const expandedAnchor = {
    left: anchorRect.left - 6,
    top: anchorRect.top - 6,
    right: anchorRect.right + 6,
    bottom: anchorRect.bottom + 6,
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const intersects = (a, b) => {
    return !(
      b.right <= a.left ||
      b.left >= a.right ||
      b.bottom <= a.top ||
      b.top >= a.bottom
    );
  };

  const makeRect = (x, y) => ({
    left: x,
    top: y,
    right: x + panelRect.width,
    bottom: y + panelRect.height,
  });

  const withinViewport = (rect) => {
    return (
      rect.left >= margin &&
      rect.top >= margin &&
      rect.right <= viewportW - margin &&
      rect.bottom <= viewportH - margin
    );
  };

  const candidates = [];

  const pushCandidate = (name, x, y, allowShiftY = true) => {
    let left = x;
    let top = y;

    left = clamp(left, margin, Math.max(margin, viewportW - panelRect.width - margin));
    top = clamp(top, margin, Math.max(margin, viewportH - panelRect.height - margin));

    let rect = makeRect(left, top);

    // If we had to clamp and it now overlaps the anchor, try shifting vertically away from the anchor.
    if (allowShiftY && intersects(expandedAnchor, rect)) {
      const belowTop = expandedAnchor.bottom + gap;
      const aboveTop = expandedAnchor.top - gap - panelRect.height;
      const tryBelow = makeRect(left, belowTop);
      const tryAbove = makeRect(left, aboveTop);
      if (withinViewport(tryBelow) && !intersects(expandedAnchor, tryBelow)) {
        top = belowTop;
        rect = tryBelow;
      } else if (withinViewport(tryAbove) && !intersects(expandedAnchor, tryAbove)) {
        top = aboveTop;
        rect = tryAbove;
      }
    }

    candidates.push({ name, left, top, rect });
  };

  // Narrow screens: prefer above/below (never bottom-sheet, to avoid covering the field).
  if (isNarrow) {
    pushCandidate("below", anchorRect.left, expandedAnchor.bottom + gap, false);
    pushCandidate("above", anchorRect.left, expandedAnchor.top - gap - panelRect.height, false);
  } else {
    // Prefer right/left; fall back to below/above.
    pushCandidate("right", expandedAnchor.right + gap, anchorRect.top);
    pushCandidate("left", expandedAnchor.left - gap - panelRect.width, anchorRect.top);
    pushCandidate("below", anchorRect.left, expandedAnchor.bottom + gap, false);
    pushCandidate("above", anchorRect.left, expandedAnchor.top - gap - panelRect.height, false);
  }

  const fitting = candidates.filter((candidate) => withinViewport(candidate.rect));
  const nonOverlapping = fitting.filter((candidate) => !intersects(expandedAnchor, candidate.rect));
  const best = (nonOverlapping[0] || fitting[0] || candidates[0]) || null;
  if (!best) return;

  // If nothing fits without overlap, force above/below as last resort (still keep within viewport).
  let finalLeft = best.left;
  let finalTop = best.top;
  if (intersects(expandedAnchor, best.rect)) {
    const belowTop = clamp(expandedAnchor.bottom + gap, margin, Math.max(margin, viewportH - panelRect.height - margin));
    const aboveTop = clamp(expandedAnchor.top - gap - panelRect.height, margin, Math.max(margin, viewportH - panelRect.height - margin));
    const belowRect = makeRect(finalLeft, belowTop);
    const aboveRect = makeRect(finalLeft, aboveTop);
    if (withinViewport(belowRect) && !intersects(expandedAnchor, belowRect)) {
      finalTop = belowTop;
    } else if (withinViewport(aboveRect) && !intersects(expandedAnchor, aboveRect)) {
      finalTop = aboveTop;
    }
  }

  panel.style.left = `${Math.round(finalLeft)}px`;
  panel.style.top = `${Math.round(finalTop)}px`;
  panel.style.right = "auto";
  panel.style.bottom = "auto";
}

function bindCoachReposition() {
  if (coachScrollBound) return;
  coachScrollBound = true;
  const handler = () => {
    if (!coachEl || !coachEl.classList.contains("is-open")) return;
    if (!coachAnchorEl) return;
    positionCoach(coachEl, coachAnchorEl);
  };
  coachRepositionHandler = handler;
  window.addEventListener("scroll", handler, { passive: true });
  window.addEventListener("resize", handler);
}

function unbindCoachReposition() {
  if (!coachScrollBound) return;
  const handler = coachRepositionHandler;
  if (typeof handler !== "function") return;
  window.removeEventListener("scroll", handler);
  window.removeEventListener("resize", handler);
  coachScrollBound = false;
  coachRepositionHandler = null;
}

function setCoachHighlight(target) {
  if (coachHighlightEl && coachHighlightEl !== target) {
    coachHighlightEl.classList.remove("coach-highlight");
  }
  coachHighlightEl = target instanceof HTMLElement ? target : null;
  if (coachHighlightEl) {
    coachHighlightEl.classList.add("coach-highlight");
  }
}

function closeCoach(options = {}) {
  const { persistDismiss = false } = options || {};
  if (!coachEl) return;
  coachEl.classList.remove("is-open");
  setCoachHighlight(null);
  coachAnchorEl = null;
  unbindCoachReposition();
  if (persistDismiss) {
    try {
      localStorage.setItem(COACH_DISMISSED_KEY, "1");
    } catch {
      // ignore storage errors
    }
  }
}

function isCoachDismissed() {
  try {
    return localStorage.getItem(COACH_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function openCoach(payload) {
  const panel = ensureCoach();
  if (!coachTitleEl || !coachTextEl || !coachActionsEl) return;
  const title = payload?.title ? String(payload.title) : "Configuracion guiada";
  const text = payload?.text ? String(payload.text) : "";
  const target = payload?.target instanceof HTMLElement ? payload.target : null;
  const actions = Array.isArray(payload?.actions) ? payload.actions : [];
  const anchor = resolveCoachAnchor(target);

  coachTitleEl.textContent = title;
  coachTextEl.textContent = text;
  coachActionsEl.innerHTML = "";

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.kind === "primary" ? "primary" : "ghost";
    if (action.variant) button.classList.add(action.variant);
    button.textContent = action.label || "Accion";
    button.addEventListener("click", () => {
      try {
        action.onClick?.();
      } catch {
        // ignore
      }
    });
    coachActionsEl.appendChild(button);
  });

  panel.classList.add("is-open");
  coachAnchorEl = anchor;
  setCoachHighlight(anchor);
  bindCoachReposition();
  requestAnimationFrame(() => {
    positionCoach(panel, anchor);
  });
}

function initHelpPanels() {
  document.querySelectorAll(".module[data-module]").forEach((panel) => {
    const helpText = panel.getAttribute("data-help") || "";
    if (!helpText) return;
    const header = panel.querySelector(".panel-header");
    if (!header || header.querySelector(".help-launch")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost help-launch";
    button.setAttribute("title", "Ver ayuda");
    button.setAttribute("aria-label", "Ver ayuda");
    const icon = document.createElement("span");
    icon.className = "help-icon";
    icon.textContent = "?";
    button.appendChild(icon);
    const panelEl = document.createElement("div");
    panelEl.className = "help-panel";
    panelEl.textContent = helpText;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasOpen = panelEl.classList.contains("is-open");
      closeHelpPanels();
      panelEl.classList.toggle("is-open", !wasOpen);
    });
    header.appendChild(button);
    header.appendChild(panelEl);
  });

  document.querySelectorAll(".settings-group-header[data-help]").forEach((header) => {
    const helpText = header.getAttribute("data-help") || "";
    if (!helpText) return;
    if (header.querySelector(".help-launch")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost help-launch";
    button.setAttribute("title", "Ver ayuda");
    button.setAttribute("aria-label", "Ver ayuda");
    const icon = document.createElement("span");
    icon.className = "help-icon";
    icon.textContent = "?";
    button.appendChild(icon);
    const panelEl = document.createElement("div");
    panelEl.className = "help-panel";
    panelEl.textContent = helpText;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const wasOpen = panelEl.classList.contains("is-open");
      closeHelpPanels();
      panelEl.classList.toggle("is-open", !wasOpen);
    });
    header.appendChild(button);
    header.appendChild(panelEl);
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.closest(".help-panel") || target.closest(".help-launch")) return;
    closeHelpPanels();
  });
}

function initToggleFields() {
  document.querySelectorAll(".field").forEach((field) => {
    const toggle = field.querySelector('input.toggle[type="checkbox"]');
    if (!toggle) return;

    field.classList.add("is-toggle");

    const label = field.querySelector("label");
    if (label && !label.htmlFor && toggle.id) {
      label.htmlFor = toggle.id;
    }

    if (label) {
      label.querySelectorAll(".tip").forEach((tip) => {
        tip.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
      });
    }
  });
}

function parseDependsOn(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isToggleOnById(id) {
  const toggle = document.getElementById(id);
  if (!(toggle instanceof HTMLInputElement)) return true;
  if (toggle.type !== "checkbox") return true;
  return Boolean(toggle.checked);
}

function setDependentEnabled(element, enabled) {
  const shouldDisable = !enabled;
  const nodes = [];

  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement || element instanceof HTMLButtonElement) {
    nodes.push(element);
  } else if (element instanceof HTMLElement) {
    element
      .querySelectorAll("input, select, textarea, button")
      .forEach((node) => nodes.push(node));
  }

  nodes.forEach((node) => {
    // Don't disable the toggle itself if it happens to be inside the dependent container.
    if (node instanceof HTMLInputElement && node.classList.contains("toggle")) return;
    node.disabled = shouldDisable;
  });

  if (element instanceof HTMLElement) {
    element.classList.toggle("is-dep-disabled", shouldDisable);
    element.querySelectorAll("details").forEach((details) => {
      if (shouldDisable) details.open = false;
      const summary = details.querySelector("summary");
      if (summary instanceof HTMLElement) {
        summary.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
        summary.tabIndex = shouldDisable ? -1 : 0;
        summary.style.pointerEvents = shouldDisable ? "none" : "";
      }
    });
  }
}

function applyToggleDependencies() {
  document.querySelectorAll("[data-depends-on]").forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    const ids = parseDependsOn(element.getAttribute("data-depends-on") || "");
    if (!ids.length) return;
    const enabled = ids.every((id) => isToggleOnById(id));
    setDependentEnabled(element, enabled);
  });
}

function initToggleDependencies() {
  const toggleIds = new Set();
  document.querySelectorAll("[data-depends-on]").forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    parseDependsOn(element.getAttribute("data-depends-on") || "").forEach((id) => toggleIds.add(id));
  });

  toggleIds.forEach((id) => {
    const toggle = document.getElementById(id);
    if (!(toggle instanceof HTMLInputElement)) return;
    if (toggle.type !== "checkbox") return;
    toggle.addEventListener("change", applyToggleDependencies);
  });

  applyToggleDependencies();
}

function initTips() {
  let tipPopoverEl = null;
  let tipPopoverTextEl = null;
  let tipPopoverCloseEl = null;
  let activeTipEl = null;
  let tipRepositionHandler = null;

  function ensureTipPopover() {
    if (tipPopoverEl) return tipPopoverEl;
    const popover = document.createElement("div");
    popover.className = "tip-popover";
    popover.setAttribute("role", "dialog");
    popover.setAttribute("aria-label", "Ayuda");

    const header = document.createElement("div");
    header.className = "tip-popover-header";

    const title = document.createElement("p");
    title.className = "tip-popover-title";
    title.textContent = "Ayuda";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "tip-popover-close";
    close.setAttribute("aria-label", "Cerrar ayuda");
    close.textContent = "×";

    header.appendChild(title);
    header.appendChild(close);

    const text = document.createElement("p");
    text.className = "tip-popover-text";
    text.textContent = "";

    popover.appendChild(header);
    popover.appendChild(text);
    document.body.appendChild(popover);

    tipPopoverEl = popover;
    tipPopoverTextEl = text;
    tipPopoverCloseEl = close;

    close.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeTipPopover();
    });

    return tipPopoverEl;
  }

  function positionTipPopover(popover, tip) {
    if (!(popover instanceof HTMLElement)) return;
    const isMobile = window.matchMedia?.("(max-width: 720px)")?.matches ?? false;
    if (isMobile || !(tip instanceof HTMLElement)) return;

    const tipRect = tip.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
    const gap = 10;
    const margin = 12;

    let left = tipRect.right + gap;
    let top = tipRect.top - 6;

    if (left + popRect.width > viewportW - margin) {
      left = tipRect.left - gap - popRect.width;
    }

    left = Math.min(Math.max(left, margin), Math.max(margin, viewportW - popRect.width - margin));
    top = Math.min(Math.max(top, margin), Math.max(margin, viewportH - popRect.height - margin));

    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
    popover.style.right = "auto";
    popover.style.bottom = "auto";
  }

  function bindTipReposition() {
    if (tipRepositionHandler) return;
    tipRepositionHandler = () => {
      if (!tipPopoverEl || !tipPopoverEl.classList.contains("is-open")) return;
      if (!activeTipEl) return;
      positionTipPopover(tipPopoverEl, activeTipEl);
    };
    window.addEventListener("scroll", tipRepositionHandler, { passive: true });
    window.addEventListener("resize", tipRepositionHandler);
  }

  function unbindTipReposition() {
    if (!tipRepositionHandler) return;
    window.removeEventListener("scroll", tipRepositionHandler);
    window.removeEventListener("resize", tipRepositionHandler);
    tipRepositionHandler = null;
  }

  function closeTipPopover() {
    if (!tipPopoverEl) return;
    tipPopoverEl.classList.remove("is-open");
    if (activeTipEl) {
      activeTipEl.setAttribute("aria-expanded", "false");
    }
    activeTipEl = null;
    unbindTipReposition();
  }

  function openTipPopover(tip) {
    const popover = ensureTipPopover();
    if (!tipPopoverTextEl) return;

    const message = tip?.getAttribute?.("data-tip") || "";
    tipPopoverTextEl.textContent = String(message || "").trim() || "Sin ayuda.";

    popover.classList.add("is-open");
    popover.style.left = "";
    popover.style.top = "";
    popover.style.right = "";
    popover.style.bottom = "";

    if (activeTipEl && activeTipEl !== tip) {
      activeTipEl.setAttribute("aria-expanded", "false");
    }
    activeTipEl = tip;
    activeTipEl.setAttribute("aria-expanded", "true");
    bindTipReposition();

    requestAnimationFrame(() => {
      positionTipPopover(popover, tip);
    });
  }

  function toggleTipPopover(tip) {
    const popover = ensureTipPopover();
    if (!popover) return;
    const isOpen = popover.classList.contains("is-open");
    if (isOpen && activeTipEl === tip) {
      closeTipPopover();
      return;
    }
    openTipPopover(tip);
  }

  document.querySelectorAll(".tip").forEach((tip) => {
    if (!(tip instanceof HTMLElement)) return;
    if (!tip.hasAttribute("tabindex")) {
      tip.setAttribute("tabindex", "0");
    }
    if (!tip.hasAttribute("role")) {
      tip.setAttribute("role", "button");
    }
    if (!tip.hasAttribute("aria-label")) {
      tip.setAttribute("aria-label", "Ver ayuda");
    }
    if (!tip.hasAttribute("aria-expanded")) {
      tip.setAttribute("aria-expanded", "false");
    }
    tip.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      tip.focus();
      toggleTipPopover(tip);
    });
    tip.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeTipPopover();
        tip.blur();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleTipPopover(tip);
      }
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.closest(".tip")) return;
    if (target.closest(".tip-popover")) return;
    closeTipPopover();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeTipPopover();
    }
  });
}

function initSetupModeControls() {
  if (!setupModePicker) return;
  setupModePicker.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const button = target.closest("[data-setup-mode]");
    if (!(button instanceof HTMLButtonElement)) return;
    const mode = button.getAttribute("data-setup-mode") || "manual";
    setSetupMode(mode, { persist: true, stopWizard: true });
    const isManual = mode === "manual";
    setConnectionsSetupOpen(true);
    setSettingsPane("connections", { persist: false });
    closeCoach({ persistDismiss: false });
    if (isManual) {
      const focusTarget =
        (storeNameInput && !storeNameInput.value.trim() ? storeNameInput : null) ||
        shopifyDomain ||
        storeNameInput;
      if (focusTarget) focusFieldWithContext(focusTarget);
      return;
    }
    try {
      localStorage.removeItem(COACH_DISMISSED_KEY);
    } catch {
      // ignore storage errors
    }
    Promise.resolve(startWizardFlow()).catch(() => null);
  });
}

function initShopifyConnectPicker() {
  applyShopifyConnectMethod(getShopifyConnectMethod());
  loadShopifyOAuthStatus().catch(() => null);
  if (!shopifyConnectPicker) return;
  shopifyConnectPicker.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const button = target.closest("[data-shopify-connect]");
    if (!(button instanceof HTMLButtonElement)) return;
    setShopifyConnectMethod(button.getAttribute("data-shopify-connect") || "oauth");
  });
  if (shopifyToken) {
    shopifyToken.addEventListener("input", () => {
      if (shopifyToken.value.trim() && getShopifyConnectMethod() !== "token") {
        setShopifyConnectMethod("token");
      }
    });
  }
}

async function loadShopifyOAuthStatus() {
  if (!shopifyConnectPicker) return;
  try {
    const status = await fetchJson("/api/auth/shopify/status");
    shopifyOAuthAvailable = Boolean(status && status.enabled);
    shopifyOAuthMissing = Array.isArray(status?.missing) ? status.missing : [];
  } catch {
    shopifyOAuthAvailable = false;
    shopifyOAuthMissing = [];
  }
  applyShopifyOAuthAvailability();
}

function applyShopifyOAuthAvailability() {
  if (!shopifyConnectPicker) return;
  const oauthBtn = shopifyConnectPicker.querySelector('[data-shopify-connect="oauth"]');
  if (oauthBtn instanceof HTMLButtonElement) {
    const disabled = !shopifyOAuthAvailable;
    oauthBtn.disabled = disabled;
    oauthBtn.classList.toggle("is-disabled", disabled);
    oauthBtn.title = disabled
      ? `No disponible: falta configurar ${shopifyOAuthMissing.length ? shopifyOAuthMissing.join(", ") : "OAuth"} en el servidor.`
      : "";
  }
  if (!shopifyOAuthAvailable && getShopifyConnectMethod() === "oauth") {
    setShopifyConnectMethod("token");
  } else {
    applyShopifyConnectMethod(getShopifyConnectMethod());
  }
}

function applyRoleAccess(role) {
  currentUserRole = role || "agent";
  const settingsNav = document.querySelector('.nav-item[data-target="settings"]');
  const adminOnlyPanels = document.querySelectorAll(".admin-only");
  if (currentUserRole !== "admin") {
    if (settingsNav) settingsNav.style.display = "none";
    adminOnlyPanels.forEach((panel) => {
      panel.style.display = "none";
    });
    const settingsSection = document.getElementById("settings");
    if (settingsSection && settingsSection.classList.contains("is-active")) {
      activateNav("dashboard");
    }
  } else {
    if (settingsNav) settingsNav.style.display = "";
    adminOnlyPanels.forEach((panel) => {
      panel.style.display = "";
    });
  }
}

async function loadCurrentUser() {
  try {
    const data = await fetchJson("/api/profile");
    const user = data.user || {};
    currentUserId = user.id || null;
    const roleLabel = user.role === "admin" ? "Admin" : "Agente";
    if (userName) userName.textContent = user.name || user.email || "Usuario";
    if (userRole) userRole.textContent = roleLabel;
    if (userAvatar) {
      userAvatar.src = user.photoBase64 || "/assets/avatar.png";
    }
    if (profileName) profileName.value = user.name || "";
    if (profileEmail) profileEmail.value = user.email || "";
    if (profilePhone) profilePhone.value = user.phone || "";
    applyRoleAccess(user.role);
  } catch {
    applyRoleAccess("agent");
  }
}

function openPanelInSection(sectionId, panelId) {
  sections.forEach((section) => {
    section.classList.toggle("is-active", section.id === sectionId);
  });
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function toggleUserMenu(forceState) {
  if (!userMenu) return;
  const next = typeof forceState === "boolean" ? forceState : !userMenu.classList.contains("is-open");
  userMenu.classList.toggle("is-open", next);
}

async function loadCompanyProfile() {
  try {
    const data = await fetchJson("/api/company");
    if (companyLogo && data.logoBase64) {
      companyLogo.src = data.logoBase64;
    }
    if (companyName) companyName.value = data.name || "";
    if (companyPhone) companyPhone.value = data.phone || "";
    if (companyAddress) companyAddress.value = data.address || "";
  } catch {
    // ignore load errors
  }
}

async function saveProfile() {
  if (!profileSave) return;
  try {
    if (profileMessage) profileMessage.textContent = "Guardando...";
    const payload = {
      name: profileName ? profileName.value.trim() : "",
      email: profileEmail ? profileEmail.value.trim() : "",
      phone: profilePhone ? profilePhone.value.trim() : "",
    };
    if (profilePhoto && profilePhoto.files && profilePhoto.files[0]) {
      if (profilePhoto.files[0].size > 2 * 1024 * 1024) {
        throw new Error("La foto supera 2MB.");
      }
      payload.photoBase64 = await readFileAsDataUrl(profilePhoto.files[0]);
    }
    const result = await fetchJson("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (profileMessage) profileMessage.textContent = "Perfil actualizado.";
    if (result?.user) {
      if (userName) userName.textContent = result.user.name || result.user.email || "Usuario";
      if (userAvatar) {
        userAvatar.src = result.user.photoBase64 || "/assets/avatar.png";
      }
    }
  } catch (error) {
    if (profileMessage) {
      profileMessage.textContent = error?.message || "No se pudo guardar el perfil.";
    }
  }
}

async function saveCompany() {
  if (!companySave) return;
  try {
    if (companyMessage) companyMessage.textContent = "Guardando...";
    const payload = {
      name: companyName ? companyName.value.trim() : "",
      phone: companyPhone ? companyPhone.value.trim() : "",
      address: companyAddress ? companyAddress.value.trim() : "",
    };
    if (companyLogoInput && companyLogoInput.files && companyLogoInput.files[0]) {
      if (companyLogoInput.files[0].size > 2 * 1024 * 1024) {
        throw new Error("El logo supera 2MB.");
      }
      payload.logoBase64 = await readFileAsDataUrl(companyLogoInput.files[0]);
    }
    const data = await fetchJson("/api/company", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (companyMessage) companyMessage.textContent = "Empresa actualizada.";
    if (companyLogo) {
      companyLogo.src = data.logoBase64 || "/assets/logo.png";
    }
  } catch (error) {
    if (companyMessage) {
      companyMessage.textContent = error?.message || "No se pudo guardar la empresa.";
    }
  }
}

function renderUsers(items) {
  if (!usersTableBody) return;
  if (!Array.isArray(items) || !items.length) {
    usersTableBody.innerHTML = `<tr><td colspan="5" class="empty">Sin usuarios.</td></tr>`;
    return;
  }
  usersTableBody.innerHTML = items
    .map(
      (user) => `
      <tr>
        <td>${user.name || "-"}</td>
        <td>${user.email || "-"}</td>
        <td>${user.role === "admin" ? "Admin" : "Agente"}</td>
        <td>${user.phone || "-"}</td>
        <td>
          ${
            currentUserRole === "admin"
              ? `<button class="ghost" data-user-delete="${user.id}">Eliminar</button>`
              : "-"
          }
        </td>
      </tr>
    `
    )
    .join("");
  usersTableBody.querySelectorAll("button[data-user-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = Number(button.dataset.userDelete);
      if (!userId) return;
      const confirmDelete = window.confirm("Seguro que deseas eliminar este usuario?");
      if (!confirmDelete) return;
      try {
        await fetchJson(`/api/users/${userId}`, { method: "DELETE" });
        await loadUsers();
      } catch (error) {
        if (usersMessage) {
          usersMessage.textContent = error?.message || "No se pudo eliminar.";
        }
      }
    });
  });
}

async function loadUsers() {
  if (currentUserRole !== "admin") return;
  try {
    const data = await fetchJson("/api/users");
    renderUsers(data.items || []);
  } catch (error) {
    if (usersMessage) {
      usersMessage.textContent = error?.message || "No se pudieron cargar usuarios.";
    }
  }
}

async function createUserFromForm() {
  if (!userCreate) return;
  try {
    if (usersMessage) usersMessage.textContent = "Creando usuario...";
    const payload = {
      name: userNameInput ? userNameInput.value.trim() : "",
      email: userEmailInput ? userEmailInput.value.trim() : "",
      phone: userPhoneInput ? userPhoneInput.value.trim() : "",
      role: userRoleInput ? userRoleInput.value : "agent",
      password: userPasswordInput ? userPasswordInput.value : "",
    };
    const data = await fetchJson("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (usersMessage) usersMessage.textContent = "Usuario creado.";
    if (userNameInput) userNameInput.value = "";
    if (userEmailInput) userEmailInput.value = "";
    if (userPhoneInput) userPhoneInput.value = "";
    if (userPasswordInput) userPasswordInput.value = "";
    await loadUsers();
    return data;
  } catch (error) {
    if (usersMessage) {
      usersMessage.textContent = error?.message || "No se pudo crear el usuario.";
    }
  }
}

async function loadLogs() {
  const params = new URLSearchParams();
  if (logStatus.value) {
    params.set("status", logStatus.value);
  }
  if (logOrderId.value) {
    params.set("orderId", logOrderId.value);
  }
  try {
    const data = await fetchJson(`/api/logs?${params.toString()}`);
    if (data?.error) {
      renderLogs([]);
      renderErrors([]);
      logTableBody.innerHTML = `<tr><td colspan="6" class="empty">${data.error}</td></tr>`;
      queueStatus.textContent = data.error;
      return;
    }
    renderLogs(data.items || []);
  } catch (error) {
    const message = error?.message || "No se pudieron cargar los logs.";
    logTableBody.innerHTML = `<tr><td colspan="6" class="empty">${message}</td></tr>`;
    queueStatus.textContent = message;
  }
}

function renderLogs(items) {
  if (!items.length) {
    logTableBody.innerHTML = `<tr><td colspan="6" class="empty">Sin datos.</td></tr>`;
    queueStatus.textContent = "Sin datos";
    queueStatus.classList.remove("is-ok", "is-off");
    return;
  }
  const failedCount = items.filter((item) => item.status === "fail").length;
  queueStatus.textContent = `${failedCount} fallos`;
  queueStatus.classList.toggle("is-ok", failedCount === 0);
  queueStatus.classList.toggle("is-off", failedCount > 0);
  logTableBody.innerHTML = items
    .map((item) => {
      const statusLabel =
        item.status === "success"
          ? "Exitoso"
          : item.status === "retrying"
          ? "Reintentando"
          : "Error";
      return `
        <tr>
          <td>${formatDate(item.created_at)}</td>
          <td>${item.entity || "-"}</td>
          <td>${formatDirection(item.direction)}</td>
          <td>${statusLabel}</td>
          <td>${item.message || "-"}</td>
          <td><button class="ghost" data-payload='${escapeJson(item)}'>Ver</button></td>
        </tr>
      `;
    })
    .join("");

  logTableBody.querySelectorAll("button[data-payload]").forEach((button) => {
    button.addEventListener("click", () => {
      const payload = button.getAttribute("data-payload");
      openModal(payload);
    });
  });
}

async function retryFailed() {
  try {
    queueStatus.textContent = "Reintentando...";
    queueStatus.classList.remove("is-ok", "is-off");
    const result = await fetchJson("/api/logs/retry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (typeof result?.retried === "number") {
      queueStatus.textContent = `Encolados: ${result.retried}`;
    }
    await loadLogs();
  } catch (error) {
    const message = error?.message || "No se pudo reintentar.";
    queueStatus.textContent = message;
    queueStatus.classList.remove("is-ok");
    queueStatus.classList.add("is-off");
  }
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-CO", { hour12: false });
}

function formatDirection(value) {
  if (!value) return "-";
  if (value === "shopify->alegra") return "Shopify → Alegra";
  if (value === "alegra->shopify") return "Alegra → Shopify";
  return value;
}

function escapeJson(item) {
  const payload = {
    request: item.request_json || null,
    response: item.response_json || null,
  };
  return JSON.stringify(payload, null, 2).replace(/'/g, "&#39;");
}

function openEinvoiceModal(orderId) {
  if (!einvoiceModal) return;
  activeEinvoiceOrderId = orderId;
  if (einvoiceOrderLabel) {
    einvoiceOrderLabel.textContent = `Pedido: ${orderId}`;
  }
  if (einvoiceStatus) einvoiceStatus.textContent = "Cargando...";
  fetchJson(`/api/operations/${encodeURIComponent(orderId)}/einvoice`)
    .then((data) => {
      if (einvoiceFlag) einvoiceFlag.checked = Boolean(data?.override?.einvoiceRequested);
      if (einvoiceName) einvoiceName.value = data?.override?.fiscalName || "";
      if (einvoiceIdType) einvoiceIdType.value = data?.override?.idType || "";
      if (einvoiceIdNumber) einvoiceIdNumber.value = data?.override?.idNumber || "";
      if (einvoiceEmail) einvoiceEmail.value = data?.override?.email || "";
      if (einvoicePhone) einvoicePhone.value = data?.override?.phone || "";
      if (einvoiceAddress) einvoiceAddress.value = data?.override?.address || "";
      if (einvoiceCity) einvoiceCity.value = data?.override?.city || "";
      if (einvoiceState) einvoiceState.value = data?.override?.state || "";
      if (einvoiceCountry) einvoiceCountry.value = data?.override?.country || "";
      if (einvoiceZip) einvoiceZip.value = data?.override?.zip || "";
      if (einvoiceStatus) {
        einvoiceStatus.textContent = data?.einvoiceEnabled
          ? "E-factura habilitada"
          : "E-factura desactivada en configuracion";
      }
    })
    .catch((error) => {
      if (einvoiceStatus) {
        einvoiceStatus.textContent = error?.message || "No se pudo cargar.";
      }
    });
  einvoiceModal.classList.add("is-open");
  einvoiceModal.setAttribute("aria-hidden", "false");
}

function closeEinvoiceModal() {
  if (!einvoiceModal) return;
  einvoiceModal.classList.remove("is-open");
  einvoiceModal.setAttribute("aria-hidden", "true");
  activeEinvoiceOrderId = "";
}

if (einvoiceClose) {
  einvoiceClose.addEventListener("click", closeEinvoiceModal);
}

if (einvoiceSave) {
  einvoiceSave.addEventListener("click", async () => {
    if (!activeEinvoiceOrderId) return;
    const payload = {
      orderId: activeEinvoiceOrderId,
      einvoiceRequested: einvoiceFlag ? einvoiceFlag.checked : false,
      fiscalName: einvoiceName ? einvoiceName.value.trim() : "",
      idType: einvoiceIdType ? einvoiceIdType.value : "",
      idNumber: einvoiceIdNumber ? einvoiceIdNumber.value.trim() : "",
      email: einvoiceEmail ? einvoiceEmail.value.trim() : "",
      phone: einvoicePhone ? einvoicePhone.value.trim() : "",
      address: einvoiceAddress ? einvoiceAddress.value.trim() : "",
      city: einvoiceCity ? einvoiceCity.value.trim() : "",
      state: einvoiceState ? einvoiceState.value.trim() : "",
      country: einvoiceCountry ? einvoiceCountry.value.trim() : "",
      zip: einvoiceZip ? einvoiceZip.value.trim() : "",
    };
    try {
      if (einvoiceStatus) einvoiceStatus.textContent = "Guardando...";
      await fetchJson(`/api/operations/${encodeURIComponent(activeEinvoiceOrderId)}/einvoice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (einvoiceStatus) einvoiceStatus.textContent = "Guardado.";
      await loadOperations();
    } catch (error) {
      if (einvoiceStatus) {
        einvoiceStatus.textContent = error?.message || "No se pudo guardar.";
      }
    }
  });
}

function loadProductSettings() {
  try {
    const raw = localStorage.getItem(PRODUCT_SETTINGS_KEY);
    if (!raw) {
      return {
        ...DEFAULT_PRODUCT_SETTINGS,
        filters: {
          ...DEFAULT_PRODUCT_SETTINGS.filters,
          productsDate: "",
          ordersDate: "",
          ordersDateTouched: false,
          ordersDays: DEFAULT_PRODUCT_SETTINGS.filters.ordersDays,
        },
      };
    }
    const parsed = JSON.parse(raw);
    const hasListLimit =
      parsed &&
      parsed.filters &&
      Object.prototype.hasOwnProperty.call(parsed.filters, "listLimit");
    const nextSync = { ...DEFAULT_PRODUCT_SETTINGS.sync, ...(parsed.sync || {}) };
    const nextFilters = { ...DEFAULT_PRODUCT_SETTINGS.filters, ...(parsed.filters || {}) };
    if (!Array.isArray(nextFilters.warehouseIds)) {
      nextFilters.warehouseIds = [];
    }
    if (typeof nextFilters.inStockOnly !== "boolean") {
      nextFilters.inStockOnly = false;
    }
    if (!nextFilters.statusFilter) {
      nextFilters.statusFilter = "all";
    }
    if (!hasListLimit) {
      nextFilters.listLimit = parsed?.sync?.limit || DEFAULT_PRODUCT_SETTINGS.filters.listLimit;
      nextSync.limit = DEFAULT_PRODUCT_SETTINGS.sync.limit;
    }
    if (!nextFilters.ordersDays) {
      nextFilters.ordersDays = DEFAULT_PRODUCT_SETTINGS.filters.ordersDays;
    }
    if (typeof nextSync.includeInventory !== "boolean") {
      nextSync.includeInventory = true;
    }
    if (typeof nextSync.onlyActive !== "boolean") {
      nextSync.onlyActive = true;
    }
    if (!Array.isArray(nextSync.warehouseIds)) {
      nextSync.warehouseIds = [];
    }
    if (typeof parsed?.filters?.ordersDateTouched !== "boolean") {
      if (nextFilters.ordersDate === getTodayISO()) {
        nextFilters.ordersDate = "";
      }
      nextFilters.ordersDateTouched = false;
    }
    return {
      publish: { ...DEFAULT_PRODUCT_SETTINGS.publish, ...(parsed.publish || {}) },
      sync: nextSync,
      orders: { ...DEFAULT_PRODUCT_SETTINGS.orders, ...(parsed.orders || {}) },
      filters: nextFilters,
    };
  } catch {
    return { ...DEFAULT_PRODUCT_SETTINGS };
  }
}

function startSyncProgress(label) {
  if (!syncProgress || !syncProgressBar || !syncProgressLabel) {
    return () => {};
  }
  let progress = 0;
  syncProgress.classList.add("is-active");
  syncProgressLabel.textContent = `${label} 0%`;
  syncProgressBar.style.width = "0%";
  const interval = setInterval(() => {
    progress = Math.min(90, progress + Math.max(1, Math.round(Math.random() * 7)));
    syncProgressBar.style.width = `${progress}%`;
    syncProgressLabel.textContent = `${label} ${progress}%`;
  }, 300);
  return (finalLabel) => {
    clearInterval(interval);
    syncProgressBar.style.width = "100%";
    syncProgressLabel.textContent = finalLabel || `${label} 100%`;
    setTimeout(() => {
      syncProgress.classList.remove("is-active");
      syncProgressBar.style.width = "0%";
    }, 800);
  };
}

function startProgressBar(container, bar, label, text) {
  if (!container || !bar || !label) {
    return () => {};
  }
  let progress = 0;
  container.classList.add("is-active");
  label.textContent = `${text} 0%`;
  bar.style.width = "0%";
  const interval = setInterval(() => {
    progress = Math.min(90, progress + Math.max(1, Math.round(Math.random() * 7)));
    bar.style.width = `${progress}%`;
    label.textContent = `${text} ${progress}%`;
  }, 300);
  return (finalLabel) => {
    clearInterval(interval);
    bar.style.width = "100%";
    label.textContent = finalLabel || `${text} 100%`;
    setTimeout(() => {
      container.classList.remove("is-active");
      bar.style.width = "0%";
    }, 800);
  };
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00";
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateProductsProgress(percent, labelText) {
  const normalized = Math.min(100, Math.max(0, percent));
  if (productsProgress && productsProgressBar && productsProgressLabel) {
    productsProgress.classList.add("is-active");
    productsProgressBar.style.width = `${normalized}%`;
    productsProgressLabel.textContent = labelText;
  }
  if (productsSyncProgress && productsSyncProgressBar && productsSyncProgressLabel) {
    productsSyncProgress.classList.add("is-active");
    productsSyncProgressBar.style.width = `${normalized}%`;
    productsSyncProgressLabel.textContent = labelText;
  }
}

function finishProductsProgress(labelText) {
  const finalText = labelText || "Productos 100%";
  if (productsProgress && productsProgressBar && productsProgressLabel) {
    productsProgressBar.style.width = "100%";
    productsProgressLabel.textContent = finalText;
    setTimeout(() => {
      productsProgress.classList.remove("is-active");
      productsProgressBar.style.width = "0%";
    }, 800);
  }
  if (productsSyncProgress && productsSyncProgressBar && productsSyncProgressLabel) {
    productsSyncProgressBar.style.width = "100%";
    productsSyncProgressLabel.textContent = finalText;
    setTimeout(() => {
      productsSyncProgress.classList.remove("is-active");
      productsSyncProgressBar.style.width = "0%";
    }, 800);
  }
}

function updateOrdersProgress(percent, labelText) {
  const normalized = Math.min(100, Math.max(0, percent));
  if (ordersProgress && ordersProgressBar && ordersProgressLabel) {
    ordersProgress.classList.add("is-active");
    ordersProgressBar.style.width = `${normalized}%`;
    ordersProgressLabel.textContent = labelText;
  }
  if (ordersSyncProgress && ordersSyncProgressBar && ordersSyncProgressLabel) {
    ordersSyncProgress.classList.add("is-active");
    ordersSyncProgressBar.style.width = `${normalized}%`;
    ordersSyncProgressLabel.textContent = labelText;
  }
}

function finishOrdersProgress(labelText) {
  const finalText = labelText || "Pedidos 100%";
  if (ordersProgress && ordersProgressBar && ordersProgressLabel) {
    ordersProgressBar.style.width = "100%";
    ordersProgressLabel.textContent = finalText;
    setTimeout(() => {
      ordersProgress.classList.remove("is-active");
      ordersProgressBar.style.width = "0%";
    }, 800);
  }
  if (ordersSyncProgress && ordersSyncProgressBar && ordersSyncProgressLabel) {
    ordersSyncProgressBar.style.width = "100%";
    ordersSyncProgressLabel.textContent = finalText;
    setTimeout(() => {
      ordersSyncProgress.classList.remove("is-active");
      ordersSyncProgressBar.style.width = "0%";
    }, 800);
  }
}

function saveProductSettings(next) {
  try {
    localStorage.setItem(PRODUCT_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function getModulePanel(name) {
  return document.querySelector(`.module[data-module="${name}"]`);
}

function getGroupPanel(name) {
  return document.querySelector(`[data-group="${name}"]`);
}

function setModuleReadonly(panel, readonly) {
  if (!panel) return;
  panel.classList.toggle("is-readonly", Boolean(readonly));
  const controls = panel.querySelectorAll("input, select, textarea");
  controls.forEach((control) => {
    if (control.closest(".panel-actions") || control.closest(".module-footer")) return;
    if (control.closest("[data-readonly-free=\"1\"]")) return;
    if (readonly) {
      control.disabled = true;
    } else {
      control.disabled = false;
    }
  });
  panel.querySelectorAll("details").forEach((details) => {
    if (!readonly) return;
    if (details.closest("[data-readonly-free=\"1\"]")) return;
    details.open = false;
  });
}

function setModuleCollapsed(panel, collapsed) {
  if (!panel) return;
  // UX: los sub-modulos (panels) siempre se muestran; el pliegue/despliegue
  // ocurre solo a nivel de grupos principales.
  panel.classList.remove("is-collapsed");
  const toggle = panel.querySelector("[data-module-toggle]");
  if (toggle) toggle.setAttribute("aria-expanded", "true");
}

function setModuleSaved(panel, saved) {
  if (!panel) return;
  panel.classList.toggle("is-saved", Boolean(saved));
}

function setButtonLoading(button, loading, label = "Guardando...") {
  if (!(button instanceof HTMLButtonElement)) return;
  if (loading) {
    if (button.dataset.loading !== "true") {
      button.dataset.loading = "true";
      button.dataset.loadingText = button.textContent || "";
      button.dataset.loadingDisabled = button.disabled ? "true" : "false";
    }
    button.disabled = true;
    button.classList.add("is-loading");
    button.textContent = label;
    return;
  }
  if (button.dataset.loading === "true") {
    button.classList.remove("is-loading");
    button.textContent = button.dataset.loadingText || button.textContent || "";
    button.disabled = button.dataset.loadingDisabled === "true";
    delete button.dataset.loading;
    delete button.dataset.loadingText;
    delete button.dataset.loadingDisabled;
  }
}

function markFieldError(field, message) {
  if (!field) return;
  const container = field.closest(".field");
  if (container) {
    container.classList.add("is-error");
    container.classList.remove("is-warning");
    let error = container.querySelector(".field-error");
    if (!error) {
      error = document.createElement("span");
      error.className = "field-error";
      container.appendChild(error);
    }
    error.textContent = message || "Campo requerido.";
    const warn = container.querySelector(".field-warning");
    if (warn) warn.remove();
  }
  field.classList.add("input-error");
  field.setAttribute("aria-invalid", "true");
}

function clearFieldError(field) {
  if (!field) return;
  const container = field.closest(".field");
  if (container) {
    container.classList.remove("is-error");
    const error = container.querySelector(".field-error");
    if (error) error.remove();
  }
  field.classList.remove("input-error");
  field.removeAttribute("aria-invalid");
}

function markFieldWarning(field, message) {
  if (!field) return;
  const container = field.closest(".field");
  if (container) {
    container.classList.add("is-warning");
    container.classList.remove("is-error");
    let warn = container.querySelector(".field-warning");
    if (!warn) {
      warn = document.createElement("span");
      warn.className = "field-warning";
      container.appendChild(warn);
    }
    warn.textContent = message || "Recomendado.";
    const error = container.querySelector(".field-error");
    if (error) error.remove();
  }
}

function clearFieldWarning(field) {
  if (!field) return;
  const container = field.closest(".field");
  if (container) {
    container.classList.remove("is-warning");
    const warn = container.querySelector(".field-warning");
    if (warn) warn.remove();
  }
}

const moduleWarningNodes = {};
document.querySelectorAll("[data-module-warning]").forEach((node) => {
  const key = node.getAttribute("data-module-warning");
  if (key) moduleWarningNodes[key] = node;
});

function setModuleWarning(moduleKey, message, options = {}) {
  const node = moduleWarningNodes[moduleKey];
  if (!node) return;
  const text = message ? String(message).trim() : "";
  node.textContent = text;
  node.classList.toggle("is-hidden", !text);
  node.classList.remove("is-warn");
  if (text) {
    node.dataset.warningKind = options.kind || "default";
  } else {
    node.dataset.warningKind = "";
  }
}

function setModulePrereqWarning(moduleKey, message) {
  const node = moduleWarningNodes[moduleKey];
  if (!node) return;
  const text = message ? String(message).trim() : "";
  if (text) {
    setModuleWarning(moduleKey, text, { kind: "prereq" });
    return;
  }
  if (node.dataset.warningKind === "prereq") {
    setModuleWarning(moduleKey, "", { kind: "prereq" });
  }
}

function clearInvoiceErrors() {
  clearFieldError(cfgResolution);
  clearFieldError(cfgWarehouse);
  clearFieldError(cfgPaymentMethod);
  clearFieldError(cfgBankAccount);
  clearFieldError(cfgApplyPayment);
  clearFieldError(cfgEinvoiceEnabled);
  clearFieldWarning(cfgResolution);
  clearFieldWarning(cfgWarehouse);
  clearFieldWarning(cfgPaymentMethod);
  clearFieldWarning(cfgBankAccount);
  clearFieldWarning(cfgApplyPayment);
  clearFieldWarning(cfgEinvoiceEnabled);
  setModuleWarning("alegra-invoice", "");
}

function clearTransferErrors() {
  clearFieldError(cfgTransferDest);
  clearFieldWarning(cfgTransferDest);
  if (cfgTransferOriginField) {
    const target = cfgTransferOriginField.querySelector("details") || cfgTransferOriginField;
    clearFieldError(target);
    clearFieldWarning(target);
  }
  setModuleWarning("alegra-logistics", "");
}

function focusFieldWithContext(field) {
  if (!(field instanceof HTMLElement)) return;
  activateNav("settings");
  ensureSettingsPaneForElement(field, { persist: false });
  const panel = field.closest(".module[data-module]");
  if (panel) {
    setModuleCollapsed(panel, false);
    setModuleReadonly(panel, false);
  }
  let group = field.closest("[data-group]");
  while (group) {
    setGroupCollapsed(group, false);
    group = group.parentElement ? group.parentElement.closest("[data-group]") : null;
  }
  field.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    if (field.focus) field.focus();
  }, 200);
}

function resolveWizardFocusableTarget(target) {
  if (!(target instanceof HTMLElement)) return null;

  // If it is already a focusable control, use it.
  const tag = target.tagName;
  if (
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    tag === "BUTTON" ||
    tag === "SUMMARY"
  ) {
    return target;
  }

  // If it's a <details>, focus its <summary>.
  if (tag === "DETAILS") {
    const summary = target.querySelector("summary");
    if (summary instanceof HTMLElement) return summary;
  }

  // If it's a container (like .field), focus the first interactive element inside.
  const inside = target.querySelector("input, select, textarea, summary, button");
  if (inside instanceof HTMLElement) return inside;

  return null;
}

function focusWizardTarget(target) {
  const focusable = resolveWizardFocusableTarget(target) || target;
  if (focusable instanceof HTMLElement) {
    focusFieldWithContext(focusable);
  }
}

function validateInitialConnection(kind) {
  const errors = [];
  if (storeNameInput) clearFieldError(storeNameInput);
  if (shopifyDomain) clearFieldError(shopifyDomain);
  if (alegraEmail) clearFieldError(alegraEmail);
  if (alegraKey) clearFieldError(alegraKey);
  if (shopifyToken) clearFieldError(shopifyToken);

  const domainInput = normalizeShopDomain(shopifyDomain?.value || "");
  const activeDomain = normalizeShopDomain(activeStoreDomain || "");
  const resolvedDomain = domainInput || activeDomain;
  const hasActiveContext = Boolean(activeDomain);
  const nameInput = storeNameInput ? storeNameInput.value.trim() : "";
  const resolvedName = nameInput || (activeDomain && activeStoreName ? activeStoreName : "");

  if (!resolvedName && !hasActiveContext) {
    errors.push({ field: storeNameInput, message: "Nombre de tienda requerido." });
  }
  if (!resolvedDomain) {
    errors.push({ field: shopifyDomain, message: "Dominio Shopify requerido." });
  }
  if (kind === "shopify" && getShopifyConnectMethod() === "token") {
    if (!shopifyToken || !shopifyToken.value.trim()) {
      errors.push({ field: shopifyToken, message: "Clave de acceso de Shopify requerida." });
    }
  }
  if (kind === "alegra") {
    if (alegraAccountSelect && alegraAccountSelect.value !== "new") {
      // account selected; no extra required fields
    } else {
      if (!alegraEmail || !alegraEmail.value.trim()) {
        errors.push({
          field: alegraEmail,
          message: "Email Alegra requerido.",
        });
      }
      if (!alegraKey || !alegraKey.value.trim()) {
        errors.push({
          field: alegraKey,
          message: "Clave de acceso de Alegra requerida.",
        });
      }
    }
  }
  if (errors.length) {
    errors.forEach((item) => {
      if (item.field) markFieldError(item.field, item.message);
    });
    const first = errors.find((item) => item.field)?.field;
    if (first) focusFieldWithContext(first);
    return false;
  }
  return true;
}

function validateInvoiceModule() {
  clearInvoiceErrors();
  if (!cfgGenerateInvoice || !cfgGenerateInvoice.checked) {
    setModuleWarning("sync-orders", "");
    return true;
  }
  const orderMode = syncOrdersShopify ? syncOrdersShopify.value : "db_only";
  const errors = [];
  const recommendations = [];
  if (!cfgResolution || !String(cfgResolution.value || "").trim()) {
    recommendations.push("Resolucion");
  }
  if (!cfgWarehouse || !String(cfgWarehouse.value || "").trim()) {
    recommendations.push("Bodega");
  }
  if (cfgApplyPayment && cfgApplyPayment.checked) {
    if (!cfgPaymentMethod || !String(cfgPaymentMethod.value || "").trim()) {
      recommendations.push("Metodo de pago");
    }
    if (!cfgBankAccount || !String(cfgBankAccount.value || "").trim()) {
      errors.push({ field: cfgBankAccount, message: "Cuenta bancaria requerida." });
    }
  } else if (cfgApplyPayment) {
    recommendations.push("Aplicar pagos");
  }
  if (cfgEinvoiceEnabled && !cfgEinvoiceEnabled.checked) {
    recommendations.push("Factura electronica");
  }
  if (errors.length) {
    errors.forEach((item) => {
      if (item.field) markFieldError(item.field, item.message);
    });
    const first = errors.find((item) => item.field)?.field;
    if (first) focusFieldWithContext(first);
    return false;
  }
  if (recommendations.length) {
    if (!cfgResolution || !String(cfgResolution.value || "").trim()) {
      markFieldWarning(cfgResolution, "Recomendado: Resolucion.");
    }
    if (!cfgWarehouse || !String(cfgWarehouse.value || "").trim()) {
      markFieldWarning(cfgWarehouse, "Recomendado: Bodega.");
    }
    if (cfgApplyPayment && cfgApplyPayment.checked) {
      if (!cfgPaymentMethod || !String(cfgPaymentMethod.value || "").trim()) {
        markFieldWarning(cfgPaymentMethod, "Recomendado: Metodo de pago.");
      }
    } else if (cfgApplyPayment) {
      markFieldWarning(cfgApplyPayment, "Recomendado: aplicar pagos a las facturas.");
    }
    if (cfgEinvoiceEnabled && !cfgEinvoiceEnabled.checked) {
      markFieldWarning(cfgEinvoiceEnabled, "Recomendado: facturar electronicamente.");
    }
    const message = `Recomendado: ${recommendations.join(", ")}.`;
    setModuleWarning("alegra-invoice", message);
    if (orderMode === "invoice") {
      setModuleWarning("sync-orders", "Recomendado: completa Facturacion y Logistica.");
    } else {
      setModuleWarning("sync-orders", "");
    }
    setStoreConfigStatus("Guardado con recomendaciones pendientes.", "is-warn");
  } else {
    setModuleWarning("alegra-invoice", "");
    setModuleWarning("sync-orders", "");
  }
  return true;
}

function validateLogisticsModule() {
  clearTransferErrors();
  if (!cfgTransferEnabled || !cfgTransferEnabled.checked) {
    return true;
  }
  const errors = [];
  const strategy = cfgTransferStrategy ? cfgTransferStrategy.value || "manual" : "manual";
  const selectedOrigins = getSelectedTransferOriginIds();
  if (!cfgTransferDest || !String(cfgTransferDest.value || "").trim()) {
    errors.push({ field: cfgTransferDest, message: "Bodega destino requerida." });
  }
  if (strategy === "manual" && !selectedOrigins.length) {
    const target = cfgTransferOriginField || cfgTransferOrigin;
    errors.push({ field: target, message: "Selecciona bodegas origen." });
  }
  if (errors.length) {
    errors.forEach((item) => {
      if (item.field) markFieldError(item.field, item.message);
    });
    const first = errors.find((item) => item.field)?.field;
    if (first) focusFieldWithContext(first);
    return false;
  }
  setModuleWarning("alegra-logistics", "");
  return true;
}

function validateOrdersModule() {
  const orderMode = syncOrdersShopify ? syncOrdersShopify.value : "db_only";
  if (orderMode === "invoice") {
    validateInvoiceModule();
    validateLogisticsModule();
  } else if (orderMode === "contact_only") {
    validateLogisticsModule();
  }
  return true;
}

function setGroupCollapsed(panel, collapsed) {
  if (!panel) return;
  panel.classList.toggle("is-collapsed", Boolean(collapsed));
  const toggle = panel.querySelector("[data-group-toggle]");
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(!collapsed));
  }
  if (collapsed) {
    panel.querySelectorAll(".module[data-module]").forEach((module) => {
      setModuleCollapsed(module, true);
    });
  }
}

function collapseAllGroupsAndModules() {
  document.querySelectorAll("[data-group]").forEach((panel) => {
    setGroupCollapsed(panel, true);
  });
  document.querySelectorAll(".module[data-module]").forEach((panel) => {
    setModuleCollapsed(panel, true);
  });
}

function reorderSettingsPanels() {
  const ordersBody = document.querySelector('.settings-group.provider-group[data-group="orders"] .settings-group-body');
  if (!ordersBody) return;

  const syncOrdersPanel = ordersBody.querySelector('.module[data-module="sync-orders"]');
  const syncContactsPanel = ordersBody.querySelector('.module[data-module="sync-contacts"]');
  if (syncOrdersPanel && syncContactsPanel) {
    ordersBody.insertBefore(syncOrdersPanel, syncContactsPanel);
  }

  const invoicePanel = ordersBody.querySelector('.module[data-module="alegra-invoice"]');
  const logisticsPanel = ordersBody.querySelector('.module[data-module="alegra-logistics"]');
  if (invoicePanel && logisticsPanel) {
    ordersBody.insertBefore(invoicePanel, logisticsPanel);
  }
}

function openDefaultGroups() {
  const openKeys = new Set();
  document.querySelectorAll("[data-group]").forEach((panel) => {
    const key = panel.getAttribute("data-group") || "";
    setGroupCollapsed(panel, !openKeys.has(key));
  });
}

function openWizardGroups(moduleKey) {
  if (!moduleKey) return;
  if (moduleKey === "connect-shopify" || moduleKey === "connect-alegra") {
    return;
  }
  const storeGroup = getGroupPanel("store");
  if (storeGroup) setGroupCollapsed(storeGroup, false);
  const map = {
    "shopify-rules": "products",
    "alegra-inventory": "products",
    "sync-contacts": "orders",
    "sync-orders": "orders",
    "alegra-logistics": "orders",
    "alegra-invoice": "orders",
    "alegra-tech": "operations",
  };
  const groupKey = map[moduleKey];
  if (!groupKey) return;
  const group = getGroupPanel(groupKey);
  if (group) setGroupCollapsed(group, false);
}

function shouldSkipWizardStep(moduleKey) {
  const targetDomain = getWizardTargetDomain();
  if (moduleKey === "connect-shopify") {
    return Boolean(targetDomain && isShopifyConnectedForDomain(targetDomain));
  }
  if (moduleKey === "connect-alegra") {
    return Boolean(targetDomain && isAlegraConnectedForDomain(targetDomain));
  }
  const orderMode = syncOrdersShopify ? syncOrdersShopify.value : "db_only";
  if (moduleKey === "alegra-invoice") {
    return orderMode !== "invoice";
  }
  if (moduleKey === "alegra-logistics") {
    return orderMode === "off" || orderMode === "db_only";
  }
  return false;
}

function getWizardState() {
  try {
    const raw = localStorage.getItem(STORE_WIZARD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setWizardState(state) {
  try {
    localStorage.setItem(STORE_WIZARD_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

function clearWizardState() {
  try {
    localStorage.removeItem(STORE_WIZARD_KEY);
  } catch {
    // ignore storage errors
  }
}

function isWizardStateActive(state) {
  if (!state || !state.shopDomain) return false;
  const current = normalizeShopDomain(activeStoreDomain || shopifyDomain?.value || "");
  return normalizeShopDomain(state.shopDomain) === current;
}

function getWizardModuleTitle(moduleKey) {
  if (!moduleKey) return "";
  if (moduleKey === "connect-shopify") return "Conectar Shopify";
  if (moduleKey === "connect-alegra") return "Conectar Alegra";
  const panel = getModulePanel(moduleKey);
  const header = panel ? panel.querySelector(`[data-module-toggle="${moduleKey}"]`) : null;
  const base = header ? header.getAttribute("data-title-base") : "";
  const raw = base || (header ? header.textContent : "") || moduleKey;
  return raw.replace(/\s+/g, " ").trim();
}

function updateWizardUI() {
  const state = getWizardState();
  const active = isWizardStateActive(state);

  if (wizardStart) wizardStart.style.display = active ? "none" : "";
  if (wizardStop) wizardStop.style.display = active ? "" : "none";
  if (wizardSkip) {
    const currentKey = state ? WIZARD_MODULE_ORDER[state.step] : "";
    const isConnectionStep = currentKey === "connect-shopify" || currentKey === "connect-alegra";
    wizardSkip.style.display = active && !isConnectionStep ? "" : "none";
  }
  updateWizardStartAvailability();

  if (!wizardHint) return;
  if (!active) {
    wizardHint.textContent = DEFAULT_WIZARD_HINT || "Opcional. Te guia por las configuraciones clave.";
    return;
  }

  const moduleKey = state ? WIZARD_MODULE_ORDER[state.step] : "";
  const visibleSteps = WIZARD_MODULE_ORDER.filter((key) => !shouldSkipWizardStep(key));
  const visibleIndex = visibleSteps.indexOf(moduleKey);
  const stepLabel = getWizardModuleTitle(moduleKey) || "Paso";
  const stepText =
    visibleIndex >= 0
      ? `Asistente: Paso ${visibleIndex + 1}/${Math.max(visibleSteps.length, 1)} · ${stepLabel}`
      : "Asistente activo";
  wizardHint.textContent = stepText;
}

function finishWizardFlow(message) {
  clearWizardState();
  updateWizardUI();
  setConnectionsSetupOpen(false);
  closeCoach({ persistDismiss: false });
  showToast(message || "Asistente completado.", "is-ok");
}

function stopWizardFlow() {
  clearWizardState();
  updateWizardUI();
  setConnectionsSetupOpen(false);
  closeCoach({ persistDismiss: false });
  collapseAllGroupsAndModules();
  openDefaultGroups();
  showToast("Asistente finalizado.", "is-ok");
}

function getWizardModuleStatus(moduleKey) {
  if (!moduleKey) return { complete: true, focusTarget: null };
  if (moduleKey === "connect-shopify") {
    const domain = getWizardTargetDomain();
    const hasName = Boolean(storeNameInput && storeNameInput.value.trim());
    const hasDomain = Boolean(shopifyDomain && normalizeShopDomain(shopifyDomain.value));
    if (!hasName) return { complete: false, focusTarget: storeNameInput };
    if (!hasDomain) return { complete: false, focusTarget: shopifyDomain };
    if (domain && isShopifyConnectedForDomain(domain)) {
      return { complete: true, focusTarget: null };
    }
    return { complete: false, focusTarget: connectShopify || shopifyDomain };
  }
  if (moduleKey === "connect-alegra") {
    const domain = getWizardTargetDomain();
    if (!domain || !isShopifyConnectedForDomain(domain)) {
      return { complete: false, focusTarget: connectShopify || shopifyDomain };
    }
    if (isAlegraConnectedForDomain(domain)) {
      return { complete: true, focusTarget: null };
    }
    const target =
      (alegraAccountSelect && alegraAccountSelect.value === "new" ? alegraEmail : null) ||
      alegraAccountSelect ||
      connectAlegra;
    return { complete: false, focusTarget: target };
  }
  if (!activeStoreConfig) {
    return { complete: false, focusTarget: null };
  }
  const orderMode = syncOrdersShopify ? syncOrdersShopify.value : "db_only";
  if (moduleKey === "sync-orders") {
    const needsAutomation = Boolean(syncOrdersShopifyEnabled?.checked);
    if (needsAutomation && !shopifyWebhooksStatus?.classList.contains("is-ok")) {
      return { complete: false, focusTarget: shopifyWebhooksCreate };
    }
    return { complete: true, focusTarget: null };
  }
  if (moduleKey === "alegra-invoice") {
    if (orderMode !== "invoice") return { complete: true, focusTarget: null };
    if (cfgGenerateInvoice && !cfgGenerateInvoice.checked) {
      return { complete: false, focusTarget: cfgGenerateInvoice };
    }
    if (cfgApplyPayment && cfgApplyPayment.checked) {
      if (!cfgBankAccount || !String(cfgBankAccount.value || "").trim()) {
        return { complete: false, focusTarget: cfgBankAccount };
      }
    }
    return { complete: true, focusTarget: null };
  }
  if (moduleKey === "alegra-logistics") {
    if (orderMode === "off" || orderMode === "db_only") return { complete: true, focusTarget: null };
    if (cfgTransferEnabled && !cfgTransferEnabled.checked) {
      return { complete: true, focusTarget: null };
    }
    if (!cfgTransferDest || !String(cfgTransferDest.value || "").trim()) {
      return { complete: false, focusTarget: cfgTransferDest };
    }
    const strategy = cfgTransferStrategy ? cfgTransferStrategy.value || "manual" : "manual";
    const fallback = cfgTransferFallback ? cfgTransferFallback.value || "" : "";
    const requiresOrigins = strategy === "manual" || fallback === "manual";
    if (requiresOrigins && !getSelectedTransferOriginIds().length) {
      const summary = cfgTransferOriginField
        ? cfgTransferOriginField.querySelector("summary")
        : null;
      return { complete: false, focusTarget: summary || cfgTransferOriginField };
    }
    return { complete: true, focusTarget: null };
  }
  return { complete: true, focusTarget: null };
}

async function findNextWizardStep(fromIndex = 0) {
  const start = Number.isFinite(fromIndex) ? Math.max(0, fromIndex) : 0;
  for (let index = start; index < WIZARD_MODULE_ORDER.length; index += 1) {
    const moduleKey = WIZARD_MODULE_ORDER[index];
    if (shouldSkipWizardStep(moduleKey)) continue;

    if (moduleKey === "sync-orders" && syncOrdersShopifyEnabled?.checked) {
      const ok = await loadShopifyWebhooksStatus();
      if (!ok) {
        return { index, moduleKey, focusTarget: shopifyWebhooksCreate };
      }
    }

    const status = getWizardModuleStatus(moduleKey);
    if (!status.complete) {
      return { index, moduleKey, focusTarget: status.focusTarget };
    }
  }
  return null;
}

function setModuleEnabled(panel, enabled) {
  if (!panel) return;
  panel.classList.toggle("is-disabled", !enabled);
  // Ojo: no forzamos "editable" al habilitar; solo bloqueamos cuando falta prerequisito.
  if (!enabled) setModuleReadonly(panel, true);
  panel.querySelectorAll(".module-action").forEach((button) => {
    button.disabled = !enabled;
  });
  panel.querySelectorAll("button").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.classList.contains("module-action")) return;
    if (button.closest(".module-footer")) return;
    if (button.hasAttribute("data-nav-to")) return;
    if (button.closest("[data-readonly-free=\"1\"]")) return;
    button.disabled = !enabled;
  });
}

function setModulePrereqButtons(panel, disabled) {
  if (!panel) return;
  panel.querySelectorAll("button").forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) return;
    if (button.closest(".panel-header")) return;
    if (button.closest("[data-readonly-free=\"1\"]")) return;
    if (disabled) {
      if (!button.dataset.prereqDisabled) {
        button.dataset.prereqDisabled = "true";
        button.disabled = true;
      }
      return;
    }
    if (button.dataset.prereqDisabled === "true") {
      button.disabled = false;
      delete button.dataset.prereqDisabled;
    }
  });
}

function getActiveStore() {
  const domain = normalizeShopDomain(activeStoreDomain || "");
  if (!domain) return null;
  return (
    storesCache.find(
      (store) => normalizeShopDomain(store.shopDomain || "") === domain
    ) || null
  );
}

function getStoreConnections(store) {
  return {
    shopifyConnected: Boolean(store?.shopifyConnected ?? store?.status === "Conectado"),
    alegraConnected: Boolean(store?.alegraConnected ?? store?.alegraAccountId),
  };
}

function resolvePrereqState(requirements, context) {
  const { hasStore, shopifyConnected, alegraConnected } = context;
  if (requirements.store && !hasStore) {
    return { enabled: false, message: "Primero crea una tienda en Nueva conexion." };
  }
  if (requirements.shopify && requirements.alegra) {
    if (!shopifyConnected && !alegraConnected) {
      return { enabled: false, message: "Conecta Shopify y Alegra para activar este modulo." };
    }
    if (!shopifyConnected) {
      return { enabled: false, message: "Conecta Shopify para activar este modulo." };
    }
    if (!alegraConnected) {
      return { enabled: false, message: "Conecta Alegra para activar este modulo." };
    }
  } else if (requirements.shopify && !shopifyConnected) {
    return { enabled: false, message: "Conecta Shopify para activar este modulo." };
  } else if (requirements.alegra && !alegraConnected) {
    return { enabled: false, message: "Conecta Alegra para activar este modulo." };
  }
  return { enabled: true, message: "" };
}

function applyPrereqState(moduleKey, state) {
  const panel = getModulePanel(moduleKey);
  if (!panel) return;
  setModuleEnabled(panel, state.enabled);
  setModulePrereqWarning(moduleKey, state.message);
  setModulePrereqButtons(panel, Boolean(state.message));
}

function updatePrerequisites() {
  const store = getActiveStore();
  const hasStore = Boolean(store);
  const storeConnections = getStoreConnections(store);
  const orderMode = syncOrdersShopify ? syncOrdersShopify.value : "db_only";
  const storeContext = {
    hasStore,
    shopifyConnected: storeConnections.shopifyConnected,
    alegraConnected: storeConnections.alegraConnected,
  };
  const globalContext = {
    hasStore: true,
    shopifyConnected: shopifyHasToken,
    alegraConnected: alegraHasToken,
  };

  applyPrereqState("shopify-rules", resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext));
  applyPrereqState("alegra-inventory", resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext));
  applyPrereqState("sync-contacts", resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext));
  applyPrereqState("sync-orders", resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext));
  applyPrereqState("alegra-tech", resolvePrereqState({ alegra: true }, globalContext));

  const invoiceState = resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext);
  const invoiceEnabled = invoiceState.enabled && orderMode === "invoice";
  applyPrereqState("alegra-invoice", { ...invoiceState, enabled: invoiceEnabled });

  const logisticsState = resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext);
  const logisticsEnabled = logisticsState.enabled && (orderMode === "invoice" || orderMode === "contact_only");
  applyPrereqState("alegra-logistics", { ...logisticsState, enabled: logisticsEnabled });
}

function updateOrderSyncDependencies() {
  updatePrerequisites();
}

function applyOrderToggle(select, toggle, fallbackValue) {
  if (!select || !toggle) return;
  if (!toggle.checked) {
    if (!select.dataset.lastValue) {
      select.dataset.lastValue = select.value || fallbackValue;
    }
    select.value = "off";
    select.disabled = true;
  } else {
    const next = select.dataset.lastValue || fallbackValue;
    select.value = next;
    select.disabled = false;
  }
}

function applySetupModeUI(mode) {
  const panel = getModulePanel("connections");
  if (!panel) return;
  const value = mode === "manual" ? "manual" : "guided";
  panel.setAttribute("data-setup-mode", value);
  if (setupModePicker) {
    setupModePicker.querySelectorAll("[data-setup-mode]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-setup-mode") === value);
    });
  }
}

function getSavedSetupMode() {
  try {
    const stored = localStorage.getItem(SETUP_MODE_KEY) || "";
    return stored === "manual" || stored === "guided" ? stored : "";
  } catch {
    return "";
  }
}

function saveSetupMode(mode) {
  try {
    localStorage.setItem(SETUP_MODE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}

function setSetupMode(mode, options = {}) {
  const { persist = true, stopWizard = false } = options || {};
  const value = mode === "manual" ? "manual" : "guided";
  applySetupModeUI(value);
  if (persist) saveSetupMode(value);
  if (stopWizard && value === "manual") {
    clearWizardState();
    updateWizardUI();
  }
}

function initSetupMode(storesCount = 0) {
  const stored = getSavedSetupMode();
  const defaultMode = "guided";
  setSetupMode(stored || defaultMode, { persist: false });
  const panel = getModulePanel("connections");
  const alreadyOpen = panel?.getAttribute("data-setup-open") === "1";
  const activePane =
    document.querySelector("[data-settings-pane].is-active")?.getAttribute("data-settings-pane") || "";
  const wizardActive = isWizardStateActive(getWizardState());
  const shouldOpen = alreadyOpen || activePane === "connections" || wizardActive || storesCount === 0;
  setConnectionsSetupOpen(shouldOpen);
}

async function openWizardStep() {
  const state = getWizardState();
  if (!state || !isWizardStateActive(state)) {
    updateWizardUI();
    closeCoach({ persistDismiss: false });
    return;
  }

  setSetupMode("guided", { persist: false });
  activateNav("settings");
  await loadLegacyStoreConfig();
  updatePrerequisites();

  const next = await findNextWizardStep(state.step);
  if (!next) {
    finishWizardFlow("Asistente completado. No hay configuraciones pendientes.");
    return;
  }

  if (next.index !== state.step) {
    setWizardState({ ...state, step: next.index });
    state.step = next.index;
  }

  openWizardGroups(next.moduleKey);
  WIZARD_MODULE_ORDER.forEach((moduleKey) => {
    const panel = getModulePanel(moduleKey);
    if (panel) setModuleCollapsed(panel, true);
  });

  if (next.moduleKey === "connect-shopify" || next.moduleKey === "connect-alegra") {
    setSettingsPane("connections", { persist: false });
    ensureConnectionsSetupOpen();
    const target = next.focusTarget || getWizardModuleStatus(next.moduleKey).focusTarget;
    if (target) {
      focusWizardTarget(target);
    } else {
      showToast("Completa las conexiones para continuar.", "is-warn");
    }
    if (!isCoachDismissed()) {
      const isShopify = next.moduleKey === "connect-shopify";
      openCoach({
        title: `Guia · ${getWizardModuleTitle(next.moduleKey)}`,
        text: isShopify
          ? "1) Escribe el dominio Shopify.\n2) Presiona “Conectar Shopify” y completa la autorizacion.\n3) Al volver, seguimos con Alegra."
          : "1) Selecciona una cuenta Alegra (o crea una nueva).\n2) Presiona “Conectar Alegra”.\n3) Al terminar, pasamos a configurar la tienda.",
        target: resolveWizardFocusableTarget(target) || (target instanceof HTMLElement ? target : null),
        actions: [
          {
            label: "Ir al campo",
            kind: "primary",
            onClick: () => {
              if (target) focusWizardTarget(target);
            },
          },
          {
            label: "Salir guia",
            kind: "ghost",
            variant: "danger",
            onClick: () => stopWizardFlow(),
          },
        ],
      });
    }
    updateWizardUI();
    return;
  }

  setConnectionsSetupOpen(false);
  const panel = getModulePanel(next.moduleKey);
  if (!panel) {
    updateWizardUI();
    return;
  }
  ensureSettingsPaneForElement(panel, { persist: false });
  if (panel.classList.contains("is-disabled")) {
    const warning = moduleWarningNodes[next.moduleKey]?.textContent || "Completa los requisitos para continuar.";
    showToast(warning, "is-warn");
    const needsShopify = /shopify/i.test(warning);
    const needsAlegra = /alegra/i.test(warning);
    const target =
      (needsShopify && connectShopify) ||
      (needsAlegra && connectAlegra) ||
      storeActiveSelect ||
      shopifyDomain ||
      storeNameInput;
    focusFieldWithContext(target);
    updateWizardUI();
    return;
  }

  setModuleCollapsed(panel, false);
  setModuleReadonly(panel, false);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  const focusTarget =
    next.focusTarget ||
    getWizardModuleStatus(next.moduleKey).focusTarget ||
    panel.querySelector("input:not([type=\"hidden\"]), select, textarea, summary, button");
  if (focusTarget instanceof HTMLElement) {
    // En wizard el foco debe quedar EXACTO en el campo/toggle/selector.
    focusWizardTarget(focusTarget);
  }
  if (!isCoachDismissed()) {
    const stepTitle = getWizardModuleTitle(next.moduleKey);
    const defaultTextMap = {
      "shopify-rules":
        "Elige los 3 modos: masivo, automatico y manual.\nLuego guarda para continuar.",
      "alegra-inventory":
        "Configura inventario/bodegas (bodegas fuente y sincronizacion automatica).\nLuego guarda para continuar.",
      "sync-orders":
        "Elige que hacer con pedidos nuevos (solo registrar / crear contacto / crear factura).\nActiva la automatizacion y verifica el estado.\nLuego guarda para continuar.",
      "alegra-invoice":
        "Opcional si vas a crear facturas: resolucion, bodega, pagos y factura electronica.\nLuego guarda para continuar.",
      "alegra-logistics":
        "Opcional: reglas de traslados/bodegas (si aplican a tu flujo).\nLuego guarda para continuar.",
    };
    openCoach({
      title: `Guia · ${stepTitle}`,
      text: defaultTextMap[next.moduleKey] || "Sigue este paso y guarda para continuar.",
      target: resolveWizardFocusableTarget(focusTarget) || panel,
      actions: [
        {
          label: "Entendido",
          kind: "primary",
          onClick: () => closeCoach({ persistDismiss: false }),
        },
        {
          label: "Saltar paso",
          kind: "ghost",
          onClick: () => skipWizardStep(),
        },
        {
          label: "Salir guia",
          kind: "ghost",
          variant: "danger",
          onClick: () => stopWizardFlow(),
        },
      ],
    });
  }
  updateWizardUI();
}

function advanceWizardStep(expectedKey) {
  const wizard = getWizardState();
  if (!wizard || !isWizardStateActive(wizard)) return;
  const currentKey = WIZARD_MODULE_ORDER[wizard.step];
  if (currentKey !== expectedKey) return;
  wizard.step += 1;
  setWizardState(wizard);
  openWizardStep();
}

function skipWizardStep() {
  const wizard = getWizardState();
  if (!wizard || !isWizardStateActive(wizard)) return;
  const currentKey = WIZARD_MODULE_ORDER[wizard.step] || "";
  const label = getWizardModuleTitle(currentKey) || "este paso";
  if (!confirm(`Saltar ${label}? Puedes volver luego y terminarlo.`)) return;
  wizard.step += 1;
  setWizardState(wizard);
  closeCoach({ persistDismiss: false });
  openWizardStep();
}

async function handleModuleSave(moduleKey) {
  if (!moduleKey) return;
  const panel = getModulePanel(moduleKey);
  const saveActions = {
    ai: async () => {
      await saveSettings({ includeAi: true });
    },
    "alegra-tech": async () => {
      await saveSettings({ includeRules: true });
    },
    "alegra-invoice": async () => {
      await saveStoreConfigFromSettings();
    },
    "alegra-inventory": async () => {
      // Guardamos (1) bodegas por tienda y (2) frecuencia/estado de automatizacion global.
      await saveStoreConfigFromSettings();
      await saveSettings({ includeRules: true });
    },
    "alegra-logistics": async () => {
      await saveStoreConfigFromSettings();
    },
    "shopify-rules": async () => {
      await saveStoreConfigFromSettings();
    },
    "sync-contacts": async () => {
      await saveStoreConfigFromSettings();
    },
    "sync-orders": async () => {
      await saveStoreConfigFromSettings();
    },
  };
  const action = saveActions[moduleKey];
  if (!action) return;
  try {
    const hadWarning = cfgStoreMessage?.classList.contains("is-warn");
    const validators = {
      "alegra-invoice": validateInvoiceModule,
      "alegra-logistics": validateLogisticsModule,
      "sync-orders": validateOrdersModule,
    };
    const validator = validators[moduleKey];
    if (validator && !validator()) {
      throw new Error("Completa los campos obligatorios.");
    }
    await action();
    if (moduleKey === "alegra-invoice" || moduleKey === "alegra-inventory" || moduleKey === "alegra-logistics" || moduleKey === "shopify-rules" || moduleKey === "sync-contacts" || moduleKey === "sync-orders") {
      if (hadWarning) {
        setStoreConfigStatus("Guardado con recomendaciones pendientes.", "is-warn");
      } else {
        setStoreConfigStatus("Configuracion guardada.", "is-ok");
      }
    }
    setModuleReadonly(panel, true);
    setModuleSaved(panel, true);
    advanceWizardStep(moduleKey);
  } catch (error) {
    if (moduleKey === "alegra-invoice" || moduleKey === "alegra-inventory" || moduleKey === "alegra-logistics" || moduleKey === "shopify-rules" || moduleKey === "sync-contacts" || moduleKey === "sync-orders") {
      setStoreConfigStatus(error?.message || "No se pudo guardar.", "is-error");
    }
    throw error;
  }
}

function initModuleControls() {
  document.querySelectorAll(".module[data-module]").forEach((panel) => {
    const readonly = panel.getAttribute("data-module-readonly") !== "false";
    setModuleReadonly(panel, readonly);
    setModuleSaved(panel, false);
    setModuleCollapsed(panel, false);
  });
  document.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const toggle = target.closest("[data-module-toggle]");
    if (toggle) {
      return;
    }
    const edit = target.closest("[data-module-edit]");
    if (edit) {
      const key = edit.getAttribute("data-module-edit");
      const panel = getModulePanel(key);
      setModuleReadonly(panel, false);
      setModuleSaved(panel, false);
      return;
    }
    const save = target.closest("[data-module-save]");
    if (save) {
      const key = save.getAttribute("data-module-save");
      if (!key) return;
      const button = save instanceof HTMLButtonElement ? save : null;
      if (button) setButtonLoading(button, true);
      handleModuleSave(key)
        .catch((error) => {
          showToast(error?.message || "No se pudo guardar.", "is-error");
        })
        .finally(() => {
          if (button) setButtonLoading(button, false);
        });
    }
  });
  document.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const panel = target.closest(".module[data-module]");
    if (!panel) return;
    setModuleSaved(panel, false);
  });
  document.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const panel = target.closest(".module[data-module]");
    if (!panel) return;
    setModuleSaved(panel, false);
  });
  const clearErrorIfValid = (target) => {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    if (target.value && String(target.value).trim() !== "") {
      clearFieldError(target);
      clearFieldWarning(target);
    }
  };
  document.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    clearErrorIfValid(target);
  });
  document.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    clearErrorIfValid(target);
  });
}

function initGroupControls() {
  reorderSettingsPanels();
  openDefaultGroups();
  document.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const toggle = target.closest("[data-group-toggle]");
    if (!toggle) return;
    const key = toggle.getAttribute("data-group-toggle");
    const panel = key ? getGroupPanel(key) : null;
    if (!panel) return;
    const nextCollapsed = !panel.classList.contains("is-collapsed");
    setGroupCollapsed(panel, nextCollapsed);
    if (key === "orders" && !nextCollapsed) {
      loadShopifyWebhooksStatus().catch(() => null);
    }
  });
}

function applyProductSettings() {
  if (productsPublishStatus) productsPublishStatus.value = productSettings.publish.status;
  if (productsPublishStatusMass) productsPublishStatusMass.value = productSettings.publish.status;
  if (productsIncludeImages) productsIncludeImages.checked = productSettings.publish.includeImages;
  if (productsDateStart) productsDateStart.value = productSettings.sync.dateStart;
  if (productsDateEnd) productsDateEnd.value = productSettings.sync.dateEnd;
  if (productsSyncLimitInput) productsSyncLimitInput.value = productSettings.sync.limit || "";
  if (productsSyncQuery) productsSyncQuery.value = productSettings.sync.query || "";
  if (productsSyncOnlyActive) {
    productsSyncOnlyActive.checked = productSettings.sync.onlyActive !== false;
  }
  if (productsSyncPublish) productsSyncPublish.checked = productSettings.sync.publishOnSync !== false;
  if (productsSyncOnlyPublished) {
    productsSyncOnlyPublished.checked = productSettings.sync.onlyPublishedInShopify !== false;
  }
  if (productsSyncIncludeInventory) {
    productsSyncIncludeInventory.checked = productSettings.sync.includeInventory !== false;
  }
	updateSyncWarehouseState();
	if (productsLimitInput) productsLimitInput.value = productSettings.filters.listLimit || "30";
	if (productsDateFilter) productsDateFilter.value = productSettings.filters.productsDate || "";
	if (productsSort) productsSort.value = productSettings.filters.productsSort || "date_desc";
	if (productsInStockOnly) {
	  productsInStockOnly.checked = Boolean(productSettings.filters.inStockOnly);
	}
  if (productsStatusFilter) {
    productsStatusFilter.value = productSettings.filters.statusFilter || "all";
  }
  if (ordersDateStart) ordersDateStart.value = productSettings.orders.dateStart;
  if (ordersDateEnd) ordersDateEnd.value = productSettings.orders.dateEnd;
  if (ordersLimit) ordersLimit.value = productSettings.orders.limit;
  if (ordersSyncNumber) ordersSyncNumber.value = productSettings.orders.orderNumber || "";
  if (opsSearch) opsSearch.value = productSettings.orders.search || "";
  if (ordersDateFilter) ordersDateFilter.value = productSettings.filters.ordersDate || "";
  if (ordersDaysSelect) ordersDaysSelect.value = productSettings.filters.ordersDays || "30";
  if (ordersSort) ordersSort.value = productSettings.filters.ordersSort || "date_desc";
}

function refreshProductSettingsFromInputs() {
  productSettings = {
    publish: {
      status: productsPublishStatus ? productsPublishStatus.value : "draft",
      includeImages: productsIncludeImages ? productsIncludeImages.checked : true,
    },
    sync: {
      dateStart: productsDateStart ? productsDateStart.value : "",
      dateEnd: productsDateEnd ? productsDateEnd.value : "",
      limit: productsSyncLimitInput ? productsSyncLimitInput.value : "",
      query: productsSyncQuery ? productsSyncQuery.value.trim() : "",
      warehouseIds: getSelectedSyncWarehouseIds(),
      onlyActive: productsSyncOnlyActive ? productsSyncOnlyActive.checked : true,
      publishOnSync: productsSyncPublish ? productsSyncPublish.checked : true,
      onlyPublishedInShopify: productsSyncOnlyPublished
        ? productsSyncOnlyPublished.checked
        : true,
      includeInventory: productsSyncIncludeInventory
        ? productsSyncIncludeInventory.checked
        : true,
    },
    orders: {
      dateStart: ordersDateStart ? ordersDateStart.value : "",
      dateEnd: ordersDateEnd ? ordersDateEnd.value : "",
      limit: ordersLimit ? ordersLimit.value : "",
      search: opsSearch ? opsSearch.value.trim() : "",
      orderNumber: ordersSyncNumber ? ordersSyncNumber.value.trim() : "",
	    },
	    filters: {
	      publishStatus: "all",
	      productsDate: productsDateFilter ? productsDateFilter.value : "",
	      productsSort: productsSort ? productsSort.value : "date_desc",
	      listLimit: productsLimitInput ? productsLimitInput.value : "",
	      warehouseIds: getSelectedWarehouseIds(),
      inStockOnly: productsInStockOnly ? productsInStockOnly.checked : false,
      statusFilter: productsStatusFilter ? productsStatusFilter.value : "all",
      ordersDate: ordersDateFilter ? ordersDateFilter.value : "",
      ordersDateTouched: Boolean(ordersDateFilter ? ordersDateFilter.value : ""),
      ordersDays: ordersDaysSelect ? ordersDaysSelect.value : DEFAULT_PRODUCT_SETTINGS.filters.ordersDays,
      ordersSort: ordersSort ? ordersSort.value : "date_desc",
    },
  };
  saveProductSettings(productSettings);
}

async function loadSettings() {
  storeRuleOverrides = null;
  storeInvoiceOverrides = null;
  const data = await fetchJson("/api/settings");
  shopifyHasToken = false;
  alegraHasToken = false;
  // ambiente fijo en produccion
  if (data.shopify) {
    shopifyHasToken = Boolean(data.shopify.hasAccessToken);
    if (shopifyDomain) {
      shopifyDomain.value = "";
      shopifyDomain.placeholder = "tu-tienda.myshopify.com";
    }
    if (shopifyToken) {
      shopifyToken.placeholder = "shpat_********";
    }
    if (statusTextShopify) {
      statusTextShopify.textContent = data.shopify.hasAccessToken ? "Conectado" : "Sin conexion";
    }
    if (statusLedShopify) {
      statusLedShopify.classList.toggle("is-ok", Boolean(data.shopify.hasAccessToken));
      statusLedShopify.classList.toggle("is-off", !data.shopify.hasAccessToken);
    }
    if (data.shopify.shopDomain) {
      shopifyAdminBase = `https://${data.shopify.shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/admin`;
    } else {
      shopifyAdminBase = "";
    }
  }
  if (data.alegra) {
    alegraHasToken = Boolean(data.alegra.hasApiKey);
    if (alegraEmail) {
      alegraEmail.value = "";
      alegraEmail.placeholder = "correo@empresa.com";
    }
    if (alegraKey) {
      alegraKey.placeholder = "api_********";
    }
    if (statusTextAlegra) {
      statusTextAlegra.textContent = data.alegra.hasApiKey ? "Conectado" : "Sin conexion";
    }
    if (statusLedAlegra) {
      statusLedAlegra.classList.toggle("is-ok", Boolean(data.alegra.hasApiKey));
      statusLedAlegra.classList.toggle("is-off", !data.alegra.hasApiKey);
    }
  }
  if (data.ai) {
    if (aiKey) {
      aiKey.placeholder = "sk-********";
    }
  }
  if (data.invoice) {
    globalInvoiceSettings = {
      generateInvoice: Boolean(data.invoice.generateInvoice),
      einvoiceEnabled: Boolean(data.invoice.einvoiceEnabled),
      resolutionId: data.invoice.resolutionId || "",
      costCenterId: data.invoice.costCenterId || "",
      warehouseId: data.invoice.warehouseId || "",
      sellerId: data.invoice.sellerId || "",
      paymentMethod: data.invoice.paymentMethod || "",
      bankAccountId: data.invoice.bankAccountId || "",
      applyPayment: Boolean(data.invoice.applyPayment),
      observationsTemplate: data.invoice.observationsTemplate || "",
    };
    if (cfgGenerateInvoice) {
      cfgGenerateInvoice.checked = Boolean(data.invoice.generateInvoice);
    }
    if (cfgEinvoiceEnabled) {
      cfgEinvoiceEnabled.checked = Boolean(data.invoice.einvoiceEnabled);
    }
    cfgApplyPayment.checked = Boolean(data.invoice.applyPayment);
    cfgObservations.value = data.invoice.observationsTemplate || "";
    cfgResolution.dataset.selected = data.invoice.resolutionId || "";
    cfgCostCenter.dataset.selected = data.invoice.costCenterId || "";
    cfgWarehouse.dataset.selected = data.invoice.warehouseId || "";
    cfgSeller.dataset.selected = data.invoice.sellerId || "";
    cfgPaymentMethod.dataset.selected = data.invoice.paymentMethod || "";
    cfgBankAccount.dataset.selected = data.invoice.bankAccountId || "";
  }
    if (data.rules) {
      inventoryRules = {
        publishOnStock: data.rules.publishOnStock !== false,
        autoPublishOnWebhook: Boolean(data.rules.autoPublishOnWebhook),
        autoPublishStatus: data.rules.autoPublishStatus === "active" ? "active" : "draft",
        inventoryAdjustmentsEnabled: data.rules.inventoryAdjustmentsEnabled !== false,
        inventoryAdjustmentsIntervalMinutes: Number(data.rules.inventoryAdjustmentsIntervalMinutes || 5),
        inventoryAdjustmentsAutoPublish: data.rules.inventoryAdjustmentsAutoPublish !== false,
        onlyActiveItems: Boolean(data.rules.onlyActiveItems),
        includeImages: data.rules.includeImages !== false,
        syncEnabled: data.rules.syncEnabled !== false,
        warehouseIds: Array.isArray(data.rules.warehouseIds) ? data.rules.warehouseIds : [],
      };
    }
  if (rulesAutoPublish) rulesAutoPublish.checked = inventoryRules.autoPublishOnWebhook;
  if (rulesAutoStatus) rulesAutoStatus.value = inventoryRules.autoPublishStatus;
  if (rulesOnlyActive) rulesOnlyActive.checked = Boolean(inventoryRules.onlyActiveItems);
  if (rulesSyncEnabled) rulesSyncEnabled.checked = inventoryRules.syncEnabled !== false;
  if (cfgInventoryPublishStock) {
    cfgInventoryPublishStock.checked = inventoryRules.publishOnStock !== false;
  }
  if (cfgInventoryAutoPublish) {
    cfgInventoryAutoPublish.checked = inventoryRules.inventoryAdjustmentsAutoPublish !== false;
  }
  if (inventoryCronEnabled) {
    inventoryCronEnabled.checked = inventoryRules.inventoryAdjustmentsEnabled !== false;
  }
  if (inventoryCronIntervalSelect) {
    inventoryCronIntervalSelect.value = String(
      inventoryRules.inventoryAdjustmentsIntervalMinutes || 5
    );
  }
  setMetricsStatusPills(data.shopify?.hasAccessToken, data.alegra?.hasApiKey);
  await loadConnections();
  await loadLegacyStoreConfig();
  updatePrerequisites();
  applyToggleDependencies();
  loadSettingsWarehouses().catch(() => null);
  loadInventoryCheckpoint().catch(() => null);
}

function renderCopyConfigOptions(stores) {
  if (!copyConfigSelect || !copyConfigField) return;
  const list = Array.isArray(stores) ? stores : [];
  if (!list.length) {
    copyConfigField.style.display = "none";
    copyConfigSelect.innerHTML = "";
    return;
  }

  const current = normalizeShopDomain(copyConfigSelect.value || "");
  copyConfigField.style.display = "";
  copyConfigSelect.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Iniciar en blanco (sin copiar)";
  copyConfigSelect.appendChild(emptyOption);

  list.forEach((store) => {
    const domain = normalizeShopDomain(store?.shopDomain || "");
    if (!domain) return;
    const option = document.createElement("option");
    option.value = domain;
    option.textContent = store?.storeName || store?.shopDomain || domain;
    copyConfigSelect.appendChild(option);
  });

  const exists = list.some(
    (store) => normalizeShopDomain(store?.shopDomain || "") === current
  );
  copyConfigSelect.value = exists ? current : "";
}

function clearPendingConfigCopy() {
  try {
    localStorage.removeItem(COPY_CONFIG_FROM_KEY);
    localStorage.removeItem(COPY_CONFIG_TO_KEY);
    localStorage.removeItem(COPY_CONFIG_AT_KEY);
  } catch {
    // ignore storage errors
  }
}

function savePendingConfigCopy(fromDomain, toDomain) {
  try {
    localStorage.setItem(COPY_CONFIG_FROM_KEY, fromDomain);
    localStorage.setItem(COPY_CONFIG_TO_KEY, toDomain);
    localStorage.setItem(COPY_CONFIG_AT_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
}

function getPendingConfigCopy() {
  try {
    const from = normalizeShopDomain(localStorage.getItem(COPY_CONFIG_FROM_KEY) || "");
    const to = normalizeShopDomain(localStorage.getItem(COPY_CONFIG_TO_KEY) || "");
    const at = Number(localStorage.getItem(COPY_CONFIG_AT_KEY) || "");
    if (!from || !to) {
      clearPendingConfigCopy();
      return null;
    }
    if (Number.isFinite(at) && Date.now() - at > 30 * 60 * 1000) {
      clearPendingConfigCopy();
      return null;
    }
    return { from, to };
  } catch {
    return null;
  }
}

function getStoreLabelByDomain(domain) {
  const normalized = normalizeShopDomain(domain || "");
  const match = storesCache.find(
    (store) => normalizeShopDomain(store?.shopDomain || "") === normalized
  );
  return match?.storeName || match?.shopDomain || normalized;
}

let pendingCopyInProgress = false;
async function maybeApplyPendingStoreConfigCopy() {
  if (pendingCopyInProgress) return;
  const pending = getPendingConfigCopy();
  if (!pending) return;
  const fromDomain = pending.from;
  const toDomain = pending.to;
  if (!fromDomain || !toDomain || fromDomain === toDomain) {
    clearPendingConfigCopy();
    return;
  }
  const toExists = storesCache.some(
    (store) => normalizeShopDomain(store?.shopDomain || "") === toDomain
  );
  if (!toExists) return;

  pendingCopyInProgress = true;
  try {
    const data = await fetchJson("/api/store-configs");
    const items = Array.isArray(data.items) ? data.items : [];
    const source =
      items.find((item) => normalizeShopDomain(item.shopDomain || "") === fromDomain) || null;
    if (!source) {
      showToast("No se encontro configuracion para copiar en la tienda origen.", "is-warn");
      clearPendingConfigCopy();
      return;
    }
    const payload = {
      transfers: source.transfers || {},
      priceLists: source.priceLists || {},
      rules: source.rules || {},
      invoice: source.invoice || {},
      sync: source.sync || {},
    };
    await fetchJson(`/api/store-configs/${encodeURIComponent(toDomain)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showToast(
      `Configuracion copiada: ${getStoreLabelByDomain(fromDomain)} → ${getStoreLabelByDomain(toDomain)}`,
      "is-ok"
    );
    clearPendingConfigCopy();
  } catch (error) {
    showToast(error?.message || "No se pudo copiar la configuracion.", "is-error");
  } finally {
    pendingCopyInProgress = false;
  }
}

async function loadConnections() {
  try {
    const data = await fetchJson("/api/connections");
    maybeShowCryptoWarning(data);
    renderConnections(data);
    renderAlegraAccountOptions(data.alegraAccounts || []);
    const stores = Array.isArray(data.stores) ? data.stores : [];
    storesCache = stores;
    updateSettingsSubmenuAvailability();
    renderCopyConfigOptions(stores);
    renderStoreActiveSelect(stores);
    updatePrerequisites();
    initSetupMode(stores.length);
    updateWizardStartAvailability();
    syncSettingsPane();
    await maybeApplyPendingStoreConfigCopy();
  } catch {
    renderConnections({ stores: [] });
    renderAlegraAccountOptions([]);
    renderCopyConfigOptions([]);
    activeStoreDomain = "";
    activeStoreName = "";
    storesCache = [];
    updateSettingsSubmenuAvailability();
    renderStoreActiveSelect([]);
    updatePrerequisites();
    initSetupMode(0);
    updateWizardStartAvailability();
    syncSettingsPane();
  }
}

function maybeShowCryptoWarning(payload) {
  if (cryptoWarningShown) return;
  const misconfigured = Boolean(payload && payload.securityMisconfigured);
  if (!misconfigured) return;
  cryptoWarningShown = true;
  showToast(
    "Seguridad: CRYPTO_KEY_BASE64 no es estable o esta mal configurada. Por eso no se pueden leer credenciales guardadas. Solucion: fija CRYPTO_KEY_BASE64 en Render y reconecta la(s) tienda(s).",
    "is-warn"
  );
}

function updateStoreModuleTitles() {
  const storeTitle = document.querySelector("[data-store-title]");
  if (storeTitle) {
    const base = storeTitle.getAttribute("data-title-base") || storeTitle.textContent || "Tienda";
    const label = getActiveStoreLabel();
    storeTitle.textContent = label ? `${base} · ${label}` : base;
  }
  updateWizardStorePill();
}

function updateWizardStorePill() {
  if (!wizardStorePill) return;
  const label = getActiveStoreLabel();
  wizardStorePill.textContent = label ? `Tienda: ${label}` : "Sin tienda activa";
  wizardStorePill.classList.toggle("is-ok", Boolean(label));
  wizardStorePill.classList.toggle("is-off", !label);
}

function getActiveStoreLabel() {
  return activeStoreName || activeStoreDomain || "";
}

function getWizardTargetDomain() {
  const state = getWizardState();
  const candidate = state?.shopDomain || activeStoreDomain || shopifyDomain?.value || "";
  return normalizeShopDomain(candidate || "");
}

function getStoreConnectionByDomain(domain) {
  const normalized = normalizeShopDomain(domain || "");
  if (!normalized) return null;
  return (
    storesCache.find((store) => normalizeShopDomain(store?.shopDomain || "") === normalized) ||
    null
  );
}

function isShopifyConnectedForDomain(domain) {
  const store = getStoreConnectionByDomain(domain);
  return Boolean(store?.shopifyConnected);
}

function isAlegraConnectedForDomain(domain) {
  const store = getStoreConnectionByDomain(domain);
  return Boolean(store?.alegraConnected);
}

function applyConnectionPill(pill, ok, text) {
  if (!(pill instanceof HTMLElement)) return;
  pill.textContent = text;
  pill.classList.toggle("is-ok", Boolean(ok));
  pill.classList.toggle("is-off", !ok);
}

function updateConnectionPills() {
  const domain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  const store = domain ? getStoreConnectionByDomain(domain) : null;
  const shopifyOk = Boolean(store?.shopifyConnected);
  const alegraOk = Boolean(store?.alegraConnected);
  const shopifyLabel = store?.shopifyNeedsReconnect ? "Reconectar" : (shopifyOk ? "Conectado" : "Pendiente");
  const alegraLabel = store?.alegraNeedsReconnect ? "Reconectar" : (alegraOk ? "Conectado" : "Pendiente");
  applyConnectionPill(shopifyConnectionPill, shopifyOk && !store?.shopifyNeedsReconnect, shopifyLabel);
  applyConnectionPill(alegraConnectionPill, alegraOk && !store?.alegraNeedsReconnect, alegraLabel);
}

function setConnectionsSetupOpen(open) {
  const panel = getModulePanel("connections");
  if (!panel) return;
  panel.setAttribute("data-setup-open", open ? "1" : "0");
}

function ensureConnectionsSetupOpen() {
  const panel = getModulePanel("connections");
  if (!panel) return;
  const current = panel.getAttribute("data-setup-open") || "0";
  if (current !== "1") {
    setConnectionsSetupOpen(true);
  }
}

function renderStoreActiveSelect(stores) {
  if (!storeActiveSelect || !storeActiveField) return;
  if (!stores.length) {
    storeActiveField.style.display = "none";
    storeActiveSelect.innerHTML = "";
    shopifyAdminBase = "";
    updateConnectionPills();
    return;
  }
  storeActiveField.style.display = "";
  storeActiveSelect.disabled = stores.length <= 1;
  storeActiveSelect.innerHTML = stores
    .map(
      (store) =>
        `<option value="${store.shopDomain}">${store.storeName || store.shopDomain}</option>`
    )
    .join("");
  const stored = (() => {
    try {
      return localStorage.getItem("apiflujos-active-store") || "";
    } catch {
      return "";
    }
  })();
  const nextDomain =
    stores.find((store) => store.shopDomain === stored)?.shopDomain ||
    stores[0]?.shopDomain ||
    "";
  activeStoreDomain = nextDomain;
  activeStoreName = stores.find((store) => store.shopDomain === nextDomain)?.storeName || "";
  storeActiveSelect.value = nextDomain;
  shopifyAdminBase = nextDomain ? `https://${nextDomain}/admin` : "";
  if (storeNameInput) {
    storeNameInput.placeholder = getActiveStoreLabel() || "Tienda de ejemplo";
  }
  updateStoreModuleTitles();
  renderStoreContextSelects(stores);
  setShopifyWebhooksStatus("Sin configurar");
  const activePane =
    document.querySelector("[data-settings-pane].is-active")?.getAttribute("data-settings-pane") || "";
  const keepConnectionsOpen = activePane === "connections" || getModulePanel("connections")?.getAttribute("data-setup-open") === "1";
  collapseAllGroupsAndModules();
  openDefaultGroups();
  if (keepConnectionsOpen) {
    const panel = getModulePanel("connections");
    if (panel) setModuleCollapsed(panel, false);
    const summary = getModulePanel("connections-summary");
    if (summary) setModuleCollapsed(summary, false);
    setConnectionsSetupOpen(true);
  }
  loadLegacyStoreConfig().catch(() => null);
  openWizardStep();
  updateConnectionPills();
}

function renderStoreContextSelects(stores) {
  const selects = [ordersStoreSelect, productsStoreSelect, contactsStoreSelect].filter(Boolean);
  if (!selects.length) return;
  const list = Array.isArray(stores) ? stores : [];
  const options = list
    .map((store) => `<option value="${store.shopDomain}">${store.storeName || store.shopDomain}</option>`)
    .join("");
  selects.forEach((select) => {
    select.innerHTML = options;
    select.disabled = list.length <= 1;
    if (activeStoreDomain) {
      select.value = activeStoreDomain;
    }
  });
}

function renderAlegraAccountOptions(accounts) {
  if (!alegraAccountSelect) return;
  const current = alegraAccountSelect.value || "new";
  const options = [
    `<option value="new">Nueva cuenta Alegra</option>`,
    ...accounts.map(
      (account) =>
        `<option value="${account.id}" data-needs-reconnect="${account.needsReconnect ? "1" : "0"}">${account.email} (${account.environment || "prod"})${account.needsReconnect ? " · reconectar" : ""}</option>`
    ),
  ];
  alegraAccountSelect.innerHTML = options.join("");
  alegraAccountSelect.value = accounts.some((a) => String(a.id) === current) ? current : "new";
  toggleAlegraAccountFields();
}

function toggleAlegraAccountFields() {
  if (!alegraAccountSelect) return;
  const isNew = alegraAccountSelect.value === "new";
  const selected = alegraAccountSelect.selectedOptions?.[0];
  const needsReconnect = selected?.getAttribute("data-needs-reconnect") === "1";
  if (alegraEmail) alegraEmail.closest(".field").style.display = isNew ? "" : "none";
  if (alegraEnvField) alegraEnvField.style.display = isNew ? "" : "none";
  if (alegraKey) {
    const showKey = isNew || needsReconnect;
    alegraKey.closest(".field").style.display = showKey ? "" : "none";
    alegraKey.placeholder = needsReconnect ? "Pega la clave para reconectar" : "api_********";
    if (needsReconnect) {
      showToast("Esta cuenta Alegra requiere reconectar. Pega la clave y presiona Conectar Alegra.", "is-warn");
      focusFieldWithContext(alegraKey);
    }
  }
}

function normalizeShopDomain(value) {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function getShopifyConnectMethod() {
  try {
    const stored = localStorage.getItem(SHOPIFY_CONNECT_METHOD_KEY) || "";
    return stored === "token" ? "token" : "oauth";
  } catch {
    return "oauth";
  }
}

function setShopifyConnectMethod(method) {
  const next = method === "token" ? "token" : "oauth";
  try {
    localStorage.setItem(SHOPIFY_CONNECT_METHOD_KEY, next);
  } catch {
    // ignore storage errors
  }
  applyShopifyConnectMethod(next);
}

function applyShopifyConnectMethod(method) {
  const next = method === "token" ? "token" : "oauth";
  const resolved = next === "oauth" && !shopifyOAuthAvailable ? "token" : next;
  if (shopifyConnectPicker) {
    shopifyConnectPicker.querySelectorAll("[data-shopify-connect]").forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.toggle(
        "is-active",
        button.getAttribute("data-shopify-connect") === resolved
      );
    });
  }
  const isToken = resolved === "token";
  if (shopifyTokenField) {
    shopifyTokenField.style.display = isToken ? "" : "none";
  }
  if (shopifyToken) {
    shopifyToken.disabled = !isToken;
    if (!isToken) {
      shopifyToken.value = "";
    }
  }
  if (shopifyConnectHint) {
    if (!shopifyOAuthAvailable) {
      shopifyConnectHint.textContent =
        "La autorizacion (OAuth2) no esta configurada en el servidor. Usa clave de acceso.";
    } else {
      shopifyConnectHint.textContent = isToken
        ? "Pega la clave de acceso de esta tienda y conecta."
        : "Por autorizacion abre la pantalla de Shopify para conectar esta tienda.";
    }
  }
}

function captureOnboardingParam() {
  const params = new URLSearchParams(window.location.search);
  const onboard = normalizeShopDomain(params.get("onboard") || "");
  if (!onboard) return;
  setWizardState({
    shopDomain: onboard,
    step: 0,
    startedAt: Date.now(),
  });
  try {
    localStorage.setItem("apiflujos-active-store", onboard);
  } catch {
    // ignore storage errors
  }
  params.delete("onboard");
  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

function updateWizardStartAvailability() {
  if (!wizardStart) return;
  const hasActiveStore = Boolean(normalizeShopDomain(activeStoreDomain || ""));
  const hasName = Boolean(storeNameInput && storeNameInput.value.trim()) || Boolean(activeStoreName);
  const hasDomain =
    Boolean(shopifyDomain && normalizeShopDomain(shopifyDomain.value)) || hasActiveStore;
  const ready = hasName && hasDomain;
  wizardStart.disabled = false;
  wizardStart.setAttribute(
    "title",
    ready
      ? "Iniciar configuracion guiada"
      : hasActiveStore
        ? "Iniciar guia en la tienda activa."
        : "Iniciar guia (luego completa nombre de tienda y dominio Shopify)."
  );
}

async function startWizardFlow() {
  setConnectionsSetupOpen(true);
  const domain = normalizeShopDomain(shopifyDomain?.value || "") || normalizeShopDomain(activeStoreDomain || "");
  const storeName = (storeNameInput ? storeNameInput.value.trim() : "") || activeStoreName || "";
  if (!storeName) {
    if (storeNameInput) markFieldError(storeNameInput, "Nombre de tienda requerido.");
    if (storeNameInput) focusFieldWithContext(storeNameInput);
    showToast("Completa el nombre de la tienda para iniciar.", "is-warn");
    if (!isCoachDismissed()) {
      openCoach({
        title: "Guia · Paso 1",
        text: "Escribe el nombre visible de la tienda para crear el set de configuraciones.",
        target: storeNameInput,
        actions: [
          {
            label: "Ir al campo",
            kind: "primary",
            onClick: () => {
              if (storeNameInput) focusFieldWithContext(storeNameInput);
              closeCoach({ persistDismiss: false });
            },
          },
          {
            label: "Cerrar",
            kind: "ghost",
            onClick: () => closeCoach({ persistDismiss: true }),
          },
        ],
      });
    }
    return false;
  }
  if (!domain) {
    if (shopifyDomain) markFieldError(shopifyDomain, "Dominio Shopify requerido.");
    if (shopifyDomain) focusFieldWithContext(shopifyDomain);
    showToast("Completa el dominio Shopify para iniciar.", "is-warn");
    if (!isCoachDismissed()) {
      openCoach({
        title: "Guia · Paso 2",
        text: "Escribe el dominio de Shopify (ej: tu-tienda.myshopify.com). Luego conectamos Shopify y seguimos.",
        target: shopifyDomain,
        actions: [
          {
            label: "Ir al campo",
            kind: "primary",
            onClick: () => {
              if (shopifyDomain) focusFieldWithContext(shopifyDomain);
              closeCoach({ persistDismiss: false });
            },
          },
          {
            label: "Cerrar",
            kind: "ghost",
            onClick: () => closeCoach({ persistDismiss: true }),
          },
        ],
      });
    }
    return false;
  }
  setWizardState({
    shopDomain: domain,
    step: 0,
    startedAt: Date.now(),
  });
  updateWizardUI();
  await openWizardStep();
  return true;
}

function applyInvoiceSettings(settings) {
  if (!settings) return;
  if (cfgGenerateInvoice) cfgGenerateInvoice.checked = Boolean(settings.generateInvoice);
  if (cfgEinvoiceEnabled) cfgEinvoiceEnabled.checked = Boolean(settings.einvoiceEnabled);
  if (cfgApplyPayment) cfgApplyPayment.checked = Boolean(settings.applyPayment);
  if (cfgObservations) cfgObservations.value = settings.observationsTemplate || "";
  if (cfgResolution) cfgResolution.dataset.selected = settings.resolutionId || "";
  if (cfgCostCenter) cfgCostCenter.dataset.selected = settings.costCenterId || "";
  if (cfgWarehouse) cfgWarehouse.dataset.selected = settings.warehouseId || "";
  if (cfgSeller) cfgSeller.dataset.selected = settings.sellerId || "";
  if (cfgPaymentMethod) cfgPaymentMethod.dataset.selected = settings.paymentMethod || "";
  if (cfgBankAccount) cfgBankAccount.dataset.selected = settings.bankAccountId || "";
}

function applyRuleSettings(settings, options = {}) {
  if (!settings) return;
  const includeCron = options.includeCron !== false;
  if (rulesAutoPublish) rulesAutoPublish.checked = Boolean(settings.autoPublishOnWebhook);
  if (rulesAutoImages) {
    rulesAutoImages.checked = settings.includeImages !== false;
  }
  if (rulesAutoStatus) {
    rulesAutoStatus.value = settings.autoPublishStatus === "active" ? "active" : "draft";
  }
  if (rulesOnlyActive) {
    rulesOnlyActive.checked = Boolean(settings.onlyActiveItems);
  }
  if (rulesSyncEnabled) {
    rulesSyncEnabled.checked = settings.syncEnabled !== false;
  }
  if (cfgInventoryPublishStock) {
    cfgInventoryPublishStock.checked = settings.publishOnStock !== false;
  }
  if (includeCron && cfgInventoryAutoPublish) {
    cfgInventoryAutoPublish.checked = settings.inventoryAdjustmentsAutoPublish !== false;
  }
  storeRuleOverrides = {
    publishOnStock: settings.publishOnStock !== false,
    autoPublishOnWebhook: Boolean(settings.autoPublishOnWebhook),
    autoPublishStatus: settings.autoPublishStatus === "active" ? "active" : "draft",
    onlyActiveItems: Boolean(settings.onlyActiveItems),
    includeImages: settings.includeImages !== false,
    syncEnabled: settings.syncEnabled !== false,
    warehouseIds: Array.isArray(settings.warehouseIds) ? settings.warehouseIds : [],
  };
  // Manual 1-a-1 comparte las mismas opciones.
  if (productsManualOnlyActive) productsManualOnlyActive.checked = Boolean(settings.onlyActiveItems);
  if (productsManualPublish) productsManualPublish.checked = Boolean(settings.autoPublishOnWebhook);
  if (productsIncludeImages) productsIncludeImages.checked = settings.includeImages !== false;
  if (productsPublishStatus) {
    productsPublishStatus.value = settings.autoPublishStatus === "active" ? "active" : "draft";
  }
  if (productsPublishStatusMass) {
    productsPublishStatusMass.value = productsPublishStatus?.value || "draft";
  }
  renderInventoryWarehouseFilters();
}

function applyLegacyStoreConfig(config) {
  const transfers = config?.transfers || {};
  const priceLists = config?.priceLists || {};
  const rules = config?.rules || null;
  const invoice = config?.invoice || null;
  transferOriginIds = Array.isArray(transfers.originWarehouseIds)
    ? transfers.originWarehouseIds.map((id) => String(id))
    : [];
  if (cfgTransferEnabled) {
    cfgTransferEnabled.checked = transfers.enabled !== false;
  }
  if (cfgTransferDest) {
    const value = String(transfers.destinationWarehouseId || "");
    cfgTransferDest.dataset.selected = value;
    if (cfgTransferDest.options.length) cfgTransferDest.value = value;
  }
  if (cfgTransferPriority) {
    const value = String(transfers.priorityWarehouseId || "");
    cfgTransferPriority.dataset.selected = value;
    if (cfgTransferPriority.options.length) cfgTransferPriority.value = value;
  }
  if (cfgTransferStrategy) {
    cfgTransferStrategy.value = String(transfers.strategy || "manual");
  }
  if (cfgTransferFallback) {
    cfgTransferFallback.value = String(transfers.fallbackStrategy || "");
  }
  if (cfgTransferTieBreak) {
    cfgTransferTieBreak.value = String(transfers.tieBreakRule || "");
  }
  if (cfgTransferSplit) {
    cfgTransferSplit.checked = Boolean(transfers.splitEnabled);
  }
  if (cfgTransferMinStock) {
    const minStock = Number(transfers.minStock);
    cfgTransferMinStock.value = Number.isFinite(minStock) && minStock > 0 ? String(minStock) : "";
  }
  if (cfgPriceGeneral) {
    const value = String(priceLists.generalId || "");
    cfgPriceGeneral.dataset.selected = value;
    if (cfgPriceGeneral.options.length) cfgPriceGeneral.value = value;
  }
  if (cfgPriceDiscount) {
    const value = String(priceLists.discountId || "");
    cfgPriceDiscount.dataset.selected = value;
    if (cfgPriceDiscount.options.length) cfgPriceDiscount.value = value;
  }
  if (cfgPriceWholesale) {
    const value = String(priceLists.wholesaleId || "");
    cfgPriceWholesale.dataset.selected = value;
    if (cfgPriceWholesale.options.length) cfgPriceWholesale.value = value;
  }
  if (cfgPriceCurrency) {
    cfgPriceCurrency.value = String(priceLists.currency || "");
  }
  if (cfgPriceEnabled) {
    cfgPriceEnabled.checked = priceLists.enabled !== false;
  }
  updatePriceListState();
  storeRuleOverrides = null;
  storeInvoiceOverrides = null;
  if (rules && typeof rules === "object") {
    applyRuleSettings(rules, { includeCron: false });
  }
  if (invoice && typeof invoice === "object") {
    applyInvoiceSettings(invoice);
    storeInvoiceOverrides = invoice;
  }
  const sync =
    config && typeof config === "object" && config.sync && typeof config.sync === "object"
      ? config.sync
      : {};
  const contactSync =
    sync.contacts && typeof sync.contacts === "object" ? sync.contacts : {};
  const orderSync =
    sync.orders && typeof sync.orders === "object" ? sync.orders : {};
  const matchPriority = Array.isArray(contactSync.matchPriority)
    ? contactSync.matchPriority.map((item) => String(item).toLowerCase())
    : typeof contactSync.matchPriority === "string"
      ? contactSync.matchPriority.split("_")
      : ["document", "phone", "email"];
  const priorityKey = matchPriority.join("_");
  const defaultShopifyMode = "db_only";
  if (syncContactsShopify) {
    syncContactsShopify.checked = contactSync.fromShopify !== false;
  }
  if (syncContactsAlegra) {
    syncContactsAlegra.checked = contactSync.fromAlegra !== false;
  }
  if (syncContactsPriority) {
    syncContactsPriority.value = priorityKey;
  }
  if (syncOrdersShopify) {
    syncOrdersShopify.value = String(orderSync.shopifyToAlegra || defaultShopifyMode);
  }
  if (syncOrdersAlegra) {
    syncOrdersAlegra.value = String(orderSync.alegraToShopify || "off");
  }
  if (syncOrdersShopifyEnabled) {
    syncOrdersShopifyEnabled.checked = syncOrdersShopify
      ? syncOrdersShopify.value !== "off"
      : true;
    applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, defaultShopifyMode);
  }
  if (syncOrdersAlegraEnabled) {
    syncOrdersAlegraEnabled.checked = syncOrdersAlegra ? syncOrdersAlegra.value !== "off" : true;
    applyOrderToggle(syncOrdersAlegra, syncOrdersAlegraEnabled, "draft");
  }
  renderTransferOriginFilters();
  updateTransferOriginState();
  updateOrderSyncDependencies();
}

function clearLegacyStoreConfig() {
  transferOriginIds = [];
  if (cfgTransferEnabled) cfgTransferEnabled.checked = true;
  if (cfgTransferDest) cfgTransferDest.dataset.selected = "";
  if (cfgTransferStrategy) cfgTransferStrategy.value = "manual";
  if (cfgTransferFallback) cfgTransferFallback.value = "";
  if (cfgTransferTieBreak) cfgTransferTieBreak.value = "";
  if (cfgTransferPriority) cfgTransferPriority.dataset.selected = "";
  if (cfgTransferMinStock) cfgTransferMinStock.value = "";
  if (cfgTransferSplit) cfgTransferSplit.checked = false;
  if (cfgPriceGeneral) cfgPriceGeneral.dataset.selected = "";
  if (cfgPriceDiscount) cfgPriceDiscount.dataset.selected = "";
  if (cfgPriceWholesale) cfgPriceWholesale.dataset.selected = "";
  if (cfgPriceCurrency) cfgPriceCurrency.value = "";
  if (cfgPriceEnabled) cfgPriceEnabled.checked = true;
  updatePriceListState();
  storeRuleOverrides = null;
  storeInvoiceOverrides = null;
  applyRuleSettings(inventoryRules);
  applyInvoiceSettings(globalInvoiceSettings);
  if (syncContactsShopify) syncContactsShopify.checked = true;
  if (syncContactsAlegra) syncContactsAlegra.checked = true;
  if (syncContactsPriority) syncContactsPriority.value = "document_phone_email";
  if (syncOrdersShopify) {
    syncOrdersShopify.value = "db_only";
  }
  if (syncOrdersAlegra) syncOrdersAlegra.value = "off";
  if (syncOrdersShopifyEnabled) {
    syncOrdersShopifyEnabled.checked = true;
    applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, "db_only");
  }
  if (syncOrdersAlegraEnabled) {
    syncOrdersAlegraEnabled.checked = false;
    applyOrderToggle(syncOrdersAlegra, syncOrdersAlegraEnabled, "draft");
  }
  renderTransferOriginFilters();
  updateTransferOriginState();
  updateOrderSyncDependencies();
}

async function loadLegacyStoreConfig() {
  const domain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!domain) {
    activeStoreConfig = null;
    clearLegacyStoreConfig();
    updatePrerequisites();
    return;
  }
  try {
    const data = await fetchJson("/api/store-configs");
    const items = Array.isArray(data.items) ? data.items : [];
    const match =
      items.find((item) => normalizeShopDomain(item.shopDomain || "") === domain) ||
      (items.length === 1 ? items[0] : null);
    if (match) {
      activeStoreConfig = match;
      applyLegacyStoreConfig(match);
    } else {
      activeStoreConfig = null;
      clearLegacyStoreConfig();
    }
  } catch {
    activeStoreConfig = null;
    clearLegacyStoreConfig();
  } finally {
    updatePrerequisites();
    applyToggleDependencies();
  }
}

function renderConnections(settings) {
  if (!connectionsGrid) return;
  connectionsGrid.innerHTML = "";
  const stores = Array.isArray(settings.stores) ? settings.stores : [];
  const activeDomain = normalizeShopDomain(activeStoreDomain || storeActiveSelect?.value || "");
  const list = stores
    .slice()
    .sort((a, b) => {
      const aIsActive = normalizeShopDomain(a?.shopDomain || "") === activeDomain;
      const bIsActive = normalizeShopDomain(b?.shopDomain || "") === activeDomain;
      if (aIsActive === bIsActive) return 0;
      return aIsActive ? -1 : 1;
    });

  if (!list.length) {
    connectionsGrid.innerHTML = `<div class="connection-card empty">Sin conexiones.</div>`;
    return;
  }
  connectionsGrid.innerHTML = list
    .map((store) => {
      const domain = normalizeShopDomain(store?.shopDomain || "");
      const isActive = domain && domain === activeDomain;
      const shopifyNeedsReconnect = Boolean(store.shopifyNeedsReconnect);
      const alegraNeedsReconnect = Boolean(store.alegraNeedsReconnect);
      const shopifyConnected = Boolean(store.shopifyConnected ?? store.status === "Conectado") && !shopifyNeedsReconnect;
      const alegraConnected = Boolean(store.alegraConnected ?? store.alegraAccountId) && !alegraNeedsReconnect;
      const shopifyLabel = store.shopDomain || "Shopify sin dominio";
      const storeLabel = store.storeName || store.shopDomain || "Tienda";
      const alegraLabel = store.alegraEmail
        ? `${store.alegraEmail} (${store.alegraEnvironment || "prod"})`
        : "Sin Alegra asignado";
      const overallConnected = shopifyConnected && alegraConnected;
      const overallLabel = overallConnected
        ? "Conectado"
        : shopifyNeedsReconnect
          ? "Reconectar Shopify"
          : alegraNeedsReconnect
            ? "Reconectar Alegra"
            : "Pendiente";
      return `
        <div class="connection-card${isActive ? " is-active" : ""}">
          <div class="connection-tiles" aria-label="Resumen de conexiones">
            <div class="connection-tile">
              <div class="connection-tile-label">Tienda</div>
              <div class="connection-tile-value">${storeLabel}</div>
            </div>
            <div class="connection-tile">
              <div class="connection-tile-label">Shopify</div>
              <div class="connection-tile-value">${shopifyLabel}</div>
            </div>
            <div class="connection-tile">
              <div class="connection-tile-label">Alegra</div>
              <div class="connection-tile-value">${alegraLabel}</div>
            </div>
          </div>
          <div class="connection-footer">
            <div class="connection-footer-pills">
              ${isActive ? `<span class="status-pill is-ok">Activa</span>` : ""}
              <span class="status-pill ${overallConnected ? "is-ok" : "is-off"}">${overallLabel}</span>
            </div>
            <button class="ghost danger" data-connection-remove="${store.id}">Eliminar tienda</button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadInventoryCheckpoint() {
  if (!inventoryCronStatus || !inventoryCronCheckpoint || !inventoryCronInterval) {
    return;
  }
  if (inventoryCronEnabled && inventoryCronEnabled.checked === false) {
    inventoryCronStatus.textContent = "Apagado";
    inventoryCronCheckpoint.textContent = "-";
    inventoryCronInterval.textContent = "Inactivo";
    if (inventoryCronLed) {
      inventoryCronLed.classList.remove("is-ok");
    }
    return;
  }
  try {
    const data = await fetchJson("/api/checkpoints/inventory-adjustments");
    const intervalMs = Number(data.intervalMs || 0);
    const checkpoint = data.checkpoint;
    inventoryCronInterval.textContent = intervalMs > 0 ? `${Math.round(intervalMs / 1000)}s` : "Inactivo";
    if (inventoryCronLed) {
      inventoryCronLed.classList.toggle("is-ok", intervalMs > 0);
    }
    if (!checkpoint) {
      inventoryCronStatus.textContent = "Sin datos";
      inventoryCronCheckpoint.textContent = "-";
      return;
    }
    inventoryCronStatus.textContent = "Activo";
    inventoryCronCheckpoint.textContent = checkpoint.updatedAt
      ? formatDate(checkpoint.updatedAt)
      : "-";
  } catch (error) {
    inventoryCronStatus.textContent = error?.message || "No disponible";
    inventoryCronCheckpoint.textContent = "-";
    inventoryCronInterval.textContent = "-";
  }
}

function setMetricsStatusPills(shopifyOk, alegraOk) {
  if (metricsShopifyStatus) {
    metricsShopifyStatus.textContent = shopifyOk ? "Shopify activo" : "Shopify sin conexion";
    metricsShopifyStatus.classList.toggle("is-ok", Boolean(shopifyOk));
    metricsShopifyStatus.classList.toggle("is-off", !shopifyOk);
  }
  if (metricsAlegraStatus) {
    metricsAlegraStatus.textContent = alegraOk ? "Alegra activo" : "Alegra sin conexion";
    metricsAlegraStatus.classList.toggle("is-ok", Boolean(alegraOk));
    metricsAlegraStatus.classList.toggle("is-off", !alegraOk);
  }
}

function buildProductRows(items) {
  const parentMap = new Map();
  const childMap = new Map();

  items.forEach((item) => {
    if (item.variantParentId) {
      if (!childMap.has(item.variantParentId)) {
        childMap.set(item.variantParentId, []);
      }
      childMap.get(item.variantParentId).push(item);
    } else {
      parentMap.set(item.id, item);
    }
  });

  const allParentIds = new Set([
    ...Array.from(parentMap.keys()),
    ...Array.from(childMap.keys()),
  ]);

  const rows = [];
  allParentIds.forEach((parentId) => {
    const parent = parentMap.get(parentId);
    const children = childMap.get(parentId) || [];
    const embedded = parent?.variants || [];
    const variants = children.length ? children : embedded;

    if (!parent && variants.length === 0) return;

    const baseParent = parent || {
      ...variants[0],
      id: String(parentId),
      name: variants[0]?.name || `Producto ${parentId}`,
      barcode: "",
      variantBarcodes: [],
    };

    const variantSkus = variants.flatMap((variant) =>
      variant.sku ? [variant.sku] : []
    );
    const mergedVariantBarcodes = Array.from(
      new Set([...(baseParent.variantBarcodes || []), ...variantSkus])
    );
    const variantTotals = variants.reduce(
      (acc, variant) => {
        const qty = Number(variant.inventoryQuantity);
        if (Number.isFinite(qty)) {
          acc.sum += qty;
          acc.count += 1;
        }
        return acc;
      },
      { sum: 0, count: 0 }
    );
    const parentInventory = variants.length
      ? variantTotals.count
        ? variantTotals.sum
        : null
      : baseParent.inventoryQuantity;

    rows.push({
      type: "parent",
      item: { ...baseParent, variantBarcodes: mergedVariantBarcodes, inventoryQuantity: parentInventory },
      parentId: String(parentId),
      hasChildren: variants.length > 0,
      childCount: variants.length,
    });

    const seen = new Set();
    variants.forEach((variant) => {
      const id = variant.id || variant.barcode || variant.reference || `${parentId}-variant`;
      if (seen.has(String(id))) return;
      seen.add(String(id));
      rows.push({ type: "variant", item: variant, parent: baseParent, parentId: String(parentId) });
    });
  });

  return rows;
}

function clampProductsLimit(value) {
  return Math.min(Math.max(value, 1), 30);
}

function extractAlegraItems(payload) {
  if (!payload || typeof payload !== "object") {
    return { items: [], total: null };
  }
  const data = payload;
  const items = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.items)
      ? data.items
      : Array.isArray(payload)
        ? payload
        : [];
  const total =
    (data.metadata && (data.metadata.total ?? data.metadata.totalItems ?? data.metadata.count)) ||
    data.total ||
    null;
  return { items, total };
}

function pickAlegraPrice(prices) {
  if (!Array.isArray(prices) || prices.length === 0) return null;
  const general =
    prices.find((price) => String(price?.name || "").toLowerCase().includes("general")) ||
    prices.find((price) => String(price?.type || "").toLowerCase().includes("general")) ||
    prices[0];
  if (!general) return null;
  const parsed = typeof general.price === "string" ? Number(general.price) : general.price;
  return Number.isFinite(parsed) ? Number(parsed) : null;
}

function normalizeProduct(item) {
  const isDbRow =
    item &&
    (Object.prototype.hasOwnProperty.call(item, "alegra_item_id") ||
      Object.prototype.hasOwnProperty.call(item, "shopify_product_id") ||
      Object.prototype.hasOwnProperty.call(item, "inventory_quantity"));
  if (isDbRow) {
    const warehouseIds = Array.isArray(item.warehouse_ids) ? item.warehouse_ids : [];
    const createdAt = item.source_updated_at || item.updated_at || "";
    const skuValue = item.sku || item.reference || "Sin referencia";
    const inventoryRaw = item.inventory_quantity;
    let inventoryQuantity = null;
    if (typeof inventoryRaw === "number") {
      inventoryQuantity = Number.isFinite(inventoryRaw) ? inventoryRaw : null;
    } else if (typeof inventoryRaw === "string" && inventoryRaw.trim() !== "") {
      const parsed = Number(inventoryRaw);
      inventoryQuantity = Number.isFinite(parsed) ? parsed : null;
    }
    return {
      id: item.alegra_item_id || item.shopify_product_id || item.id,
      name: item.name || "Producto",
      reference: item.reference || "",
      sku: skuValue,
      status: item.status_alegra || item.status || "",
      inventoryQuantity,
      warehouseIds,
      createdAt,
      images: [],
      variants: [],
      variantBarcodes: skuValue && skuValue !== "Sin referencia" ? [skuValue] : [],
    };
  }
  const createdAt = item.createdAt || item.created_at || item.created_at_date || item.created || "";
  const customSku = (() => {
    if (!Array.isArray(item.customFields)) return "";
    const keys = ["Codigo de barras", "Código de barras", "CODIGO DE BARRAS"];
    const match = item.customFields.find((field) => {
      const name = String(field?.name || field?.label || "").toLowerCase();
      return keys.map((key) => key.toLowerCase()).includes(name);
    });
    return String(match?.value || "").trim();
  })();
  const images = Array.isArray(item.images)
    ? item.images
        .map((image) => (typeof image === "string" ? image : image?.url))
        .filter(Boolean)
    : [];
  const variantList = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  const variantBarcodes = variantList
    .map((variant) => variant?.reference || variant?.barcode || customSku)
    .filter((barcode) => Boolean(barcode));
  const parseNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const warehouses = Array.isArray(item.inventory?.warehouses) ? item.inventory.warehouses : [];
  const warehouseIds = warehouses
    .map((warehouse) => String(warehouse?.id || ""))
    .filter((id) => Boolean(id));
  const warehouseSum = warehouses.reduce((total, warehouse) => {
    const qty = parseNumber(warehouse?.availableQuantity);
    return qty !== null ? total + qty : total;
  }, 0);
  const defaultWarehouse =
    warehouses.find((warehouse) => warehouse?.isDefault) || warehouses[0];
  const warehouseLabel = defaultWarehouse?.name || "";
  const warehouseBreakdown = warehouses
    .map((warehouse) => {
      const qty = parseNumber(warehouse?.availableQuantity);
      if (qty === null || qty <= 0) return null;
      const name = warehouse?.name || "Bodega";
      return `${name}: ${qty}`;
    })
    .filter(Boolean)
    .join(" · ");
  const quantity =
    parseNumber(item.inventory?.quantity) ??
    parseNumber(item.inventory?.availableQuantity) ??
    (warehouses.length ? warehouseSum : null) ??
    parseNumber(item.inventory?.initialQuantity);
  const primarySku = item.reference || item.barcode || customSku || "";
  const variantParentId =
    item.variantParent_id || item.variantParentId || item.idItemParent || null;
  const resolvedVariants = Array.isArray(item.itemVariants) ? item.itemVariants : [];
  const variantSkus = resolvedVariants
    .map((variant) => variant?.reference || variant?.barcode || customSku)
    .filter((sku) => Boolean(sku));
  const buildVariantLabel = (attrs) => {
    if (!Array.isArray(attrs) || attrs.length === 0) return "";
    return attrs
      .map((attr) => {
        const label = attr?.label || attr?.name || "";
        const value = attr?.value || "";
        if (!label && !value) return "";
        if (!label) return String(value);
        if (!value) return String(label);
        return `${label}: ${value}`;
      })
      .filter(Boolean)
      .join(" · ");
  };

  const variants = resolvedVariants.map((variant) => {
    const variantCreatedAt = variant?.createdAt || variant?.created_at || createdAt || "";
    const variantImages = Array.isArray(variant?.images)
      ? variant.images
          .map((image) => (typeof image === "string" ? image : image?.url))
          .filter(Boolean)
      : images;
    const variantWarehouses = Array.isArray(variant?.inventory?.warehouses)
      ? variant.inventory.warehouses
      : [];
    const variantWarehouseIds = variantWarehouses
      .map((warehouse) => String(warehouse?.id || ""))
      .filter((id) => Boolean(id));
    const variantWarehouseSum = variantWarehouses.reduce((total, warehouse) => {
      const qty = parseNumber(warehouse?.availableQuantity);
      return qty !== null ? total + qty : total;
    }, 0);
    const variantDefaultWarehouse =
      variantWarehouses.find((warehouse) => warehouse?.isDefault) ||
      variantWarehouses[0] ||
      defaultWarehouse;
    const variantWarehouseLabel = variantDefaultWarehouse?.name || "";
    const variantWarehouseBreakdown = variantWarehouses
      .map((warehouse) => {
        const qty = parseNumber(warehouse?.availableQuantity);
        if (qty === null || qty <= 0) return null;
        const name = warehouse?.name || "Bodega";
        return `${name}: ${qty}`;
      })
      .filter(Boolean)
      .join(" · ");
    const variantQty =
      parseNumber(variant?.inventory?.quantity) ??
      parseNumber(variant?.inventory?.availableQuantity) ??
      (variantWarehouses.length ? variantWarehouseSum : null) ??
      parseNumber(variant?.inventory?.initialQuantity);
    const variantSku = variant?.reference || variant?.barcode || customSku || "";
    return {
      id: variant?.id ? String(variant.id) : `${item.id || "parent"}-${variantSku || "variant"}`,
      name: variant?.name || `${item.name || "Producto"} / ${variantSku || "variante"}`,
      reference: variant?.reference || variantSku || "Sin referencia",
      sku: variantSku || "Sin referencia",
      barcode: variantSku,
      variantBarcodes: variantSku ? [variantSku] : [],
      variantParentId: item.id ? String(item.id) : null,
      attributeLabel: buildVariantLabel(variant?.variantAttributes),
      itemKind: variant?.type || "variant",
      price: pickAlegraPrice(variant?.price),
      inventoryUnit: variant?.inventory?.unit || item.inventory?.unit || "u",
      inventoryQuantity: variantQty,
      warehouseLabel: variantWarehouseLabel,
      warehouseBreakdown: variantWarehouseBreakdown,
      warehouseIds: variantWarehouseIds,
      images: variantImages,
      status: variant?.status || item.status || "active",
      variantCount: 0,
      createdAt: variantCreatedAt,
    };
  });
  return {
    id: item.id ? String(item.id) : "sin-id",
    name: item.name || "Sin nombre",
    reference: item.reference || "Sin referencia",
    sku: primarySku || "Sin referencia",
    barcode: primarySku,
    variantBarcodes,
    variantSkus,
    variantParentId: variantParentId ? String(variantParentId) : null,
    attributeLabel: buildVariantLabel(item.variantAttributes),
    itemKind: item.type || "item",
    variants,
    price: pickAlegraPrice(item.price),
    inventoryUnit: item.inventory?.unit || "u",
    inventoryQuantity: quantity,
    warehouseLabel,
    warehouseBreakdown,
    warehouseIds,
    images,
    status: item.status || "active",
    variantCount: variantList.length,
    createdAt,
  };
}

function formatShopifyStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "Activo";
  if (normalized === "draft") return "Borrador";
  if (normalized === "archived") return "Archivado";
  return status || "—";
}

function setProductsStatus(message) {
  if (productsStatus) {
    productsStatus.textContent = message || "Listo para sincronizar";
  }
}

function getSelectedSyncWarehouseIds() {
  if (!cfgWarehouseSync) return productSettings.sync?.warehouseIds || [];
  const inputs = Array.from(cfgWarehouseSync.querySelectorAll("input[data-warehouse-id]"));
  if (!inputs.length) return productSettings.sync?.warehouseIds || [];
  return inputs
    .filter((input) => input.checked)
    .map((input) => String(input.dataset.warehouseId || ""));
}

function getSelectedInventoryWarehouseIds() {
  if (!cfgInventoryWarehouses) return inventoryRules.warehouseIds || [];
  const inputs = Array.from(cfgInventoryWarehouses.querySelectorAll("input[data-warehouse-id]"));
  const fallback = storeRuleOverrides?.warehouseIds || inventoryRules.warehouseIds || [];
  if (!inputs.length) return fallback;
  return inputs
    .filter((input) => input.checked)
    .map((input) => String(input.dataset.warehouseId || ""));
}

function renderSyncWarehouseFilters() {
  if (!cfgWarehouseSync) return;
  const selected = new Set(productSettings.sync?.warehouseIds || []);
  cfgWarehouseSync.innerHTML = "";
  const totalCount = settingsWarehousesCatalog.length;
  const selectAllLabel = document.createElement("label");
  selectAllLabel.className = "select-all";
  const selectAllInput = document.createElement("input");
  selectAllInput.type = "checkbox";
  selectAllInput.dataset.selectAll = "sync";
  selectAllInput.checked = selected.size === 0 || selected.size === totalCount;
  const selectAllText = document.createElement("span");
  selectAllText.textContent = "Seleccionar todas";
  selectAllLabel.appendChild(selectAllInput);
  selectAllLabel.appendChild(selectAllText);
  cfgWarehouseSync.appendChild(selectAllLabel);
  if (!settingsWarehousesCatalog.length) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "Sin bodegas";
    cfgWarehouseSync.appendChild(empty);
    return;
  }
  const sortedWarehouses = [...settingsWarehousesCatalog].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), "es")
  );
  sortedWarehouses.forEach((warehouse) => {
    const id = String(warehouse.id || warehouse._id || "");
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.warehouseId = id;
    input.checked = selected.has(id);
    const text = document.createElement("span");
    text.textContent = warehouse.name || `Bodega ${id}`;
    label.appendChild(input);
    label.appendChild(text);
    cfgWarehouseSync.appendChild(label);
  });
  updateSyncWarehouseSummary();
}

function renderInventoryWarehouseFilters() {
  if (!cfgInventoryWarehouses) return;
  const selected = new Set(storeRuleOverrides?.warehouseIds || inventoryRules.warehouseIds || []);
  cfgInventoryWarehouses.innerHTML = "";
  if (!settingsWarehousesCatalog.length) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "Sin bodegas";
    cfgInventoryWarehouses.appendChild(empty);
    return;
  }
  const sortedWarehouses = [...settingsWarehousesCatalog].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), "es")
  );
  sortedWarehouses.forEach((warehouse) => {
    const id = String(warehouse.id || warehouse._id || "");
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.warehouseId = id;
    input.checked = selected.has(id);
    const text = document.createElement("span");
    text.textContent = warehouse.name || `Bodega ${id}`;
    label.appendChild(input);
    label.appendChild(text);
    cfgInventoryWarehouses.appendChild(label);
  });
  updateInventoryWarehouseSummary();
}

async function loadSettingsWarehouses() {
  if (!cfgWarehouseSync && !cfgInventoryWarehouses) return;
  try {
    const params = new URLSearchParams();
    const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
    if (shopDomain) params.set("shopDomain", shopDomain);
    params.set("t", String(Date.now()));
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await fetchJson(`/api/alegra/warehouses${query}`);
    settingsWarehousesCatalog = Array.isArray(data.items) ? data.items : [];
    settingsWarehousesCatalog.sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), "es")
    );
  } catch {
    settingsWarehousesCatalog = [];
  }
  renderSyncWarehouseFilters();
  renderInventoryWarehouseFilters();
  renderTransferOriginFilters();
}

function updateSyncWarehouseSummary() {
  if (!cfgWarehouseSyncSummary) return;
  if (!settingsWarehousesCatalog.length) {
    cfgWarehouseSyncSummary.textContent = "Sin bodegas";
    return;
  }
  const selected = getSelectedSyncWarehouseIds();
  if (!selected.length || selected.length === settingsWarehousesCatalog.length) {
    cfgWarehouseSyncSummary.textContent = "Todas";
    return;
  }
  cfgWarehouseSyncSummary.textContent = `${selected.length} seleccionadas`;
}

function updateInventoryWarehouseSummary() {
  if (!cfgInventoryWarehousesSummary) return;
  if (!settingsWarehousesCatalog.length) {
    cfgInventoryWarehousesSummary.textContent = "Sin bodegas";
    return;
  }
  const selected = getSelectedInventoryWarehouseIds();
  if (!selected.length || selected.length === settingsWarehousesCatalog.length) {
    cfgInventoryWarehousesSummary.textContent = "Todas";
    return;
  }
  cfgInventoryWarehousesSummary.textContent = `${selected.length} seleccionadas`;
}

function getSelectedTransferOriginIds() {
  if (!cfgTransferOrigin) return transferOriginIds || [];
  const inputs = Array.from(cfgTransferOrigin.querySelectorAll("input[data-warehouse-id]"));
  if (!inputs.length) return transferOriginIds || [];
  return inputs
    .filter((input) => input.checked)
    .map((input) => String(input.dataset.warehouseId || ""));
}

function renderTransferOriginFilters() {
  if (!cfgTransferOrigin) return;
  const selected = new Set(transferOriginIds || []);
  cfgTransferOrigin.innerHTML = "";
  const totalCount = settingsWarehousesCatalog.length;
  const selectAllLabel = document.createElement("label");
  selectAllLabel.className = "select-all";
  const selectAllInput = document.createElement("input");
  selectAllInput.type = "checkbox";
  selectAllInput.dataset.selectAll = "transfer-origin";
  selectAllInput.checked = selected.size === 0 || selected.size === totalCount;
  const selectAllText = document.createElement("span");
  selectAllText.textContent = "Seleccionar todas";
  selectAllLabel.appendChild(selectAllInput);
  selectAllLabel.appendChild(selectAllText);
  cfgTransferOrigin.appendChild(selectAllLabel);
  if (!settingsWarehousesCatalog.length) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "Sin bodegas";
    cfgTransferOrigin.appendChild(empty);
    if (cfgTransferOriginSummary) cfgTransferOriginSummary.textContent = "Sin bodegas";
    return;
  }
  const sortedWarehouses = [...settingsWarehousesCatalog].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), "es")
  );
  sortedWarehouses.forEach((warehouse) => {
    const id = String(warehouse.id || warehouse._id || "");
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.warehouseId = id;
    input.checked = selected.has(id);
    const text = document.createElement("span");
    text.textContent = warehouse.name || `Bodega ${id}`;
    label.appendChild(input);
    label.appendChild(text);
    cfgTransferOrigin.appendChild(label);
  });
  updateTransferOriginSummary();
}

function updateSyncWarehouseState() {
  if (!cfgWarehouseSyncField) return;
  const includeInventory = productsSyncIncludeInventory
    ? productsSyncIncludeInventory.checked !== false
    : true;
  cfgWarehouseSyncField.style.display = includeInventory ? "" : "none";
}

function updateTransferOriginSummary() {
  if (!cfgTransferOriginSummary) return;
  if (!settingsWarehousesCatalog.length) {
    cfgTransferOriginSummary.textContent = "Sin bodegas";
    return;
  }
  const selected = getSelectedTransferOriginIds();
  if (!selected.length || selected.length === settingsWarehousesCatalog.length) {
    cfgTransferOriginSummary.textContent = "Todas";
    return;
  }
  cfgTransferOriginSummary.textContent = `${selected.length} seleccionadas`;
}

function updateTransferOriginState() {
  if (!cfgTransferStrategy) return;
  const strategy = cfgTransferStrategy.value || "manual";
  const fallback = cfgTransferFallback ? cfgTransferFallback.value || "" : "";
  const transferEnabled = cfgTransferEnabled ? cfgTransferEnabled.checked !== false : true;
  const enableOrigins = transferEnabled && (strategy === "manual" || fallback === "manual");
  const details = getTransferOriginDetails();
  if (details) {
    details.classList.toggle("is-disabled", !enableOrigins);
  }
  if (cfgTransferOriginField) {
    cfgTransferOriginField.style.display = enableOrigins ? "" : "none";
  }
  if (cfgTransferOrigin) {
    cfgTransferOrigin
      .querySelectorAll("input[data-warehouse-id], input[data-select-all]")
      .forEach((input) => {
        input.disabled = !enableOrigins;
      });
  }
  if (!enableOrigins && cfgTransferOriginSummary) {
    cfgTransferOriginSummary.textContent = transferEnabled ? "Automatico" : "Desactivado";
    clearTransferErrors();
  } else {
    updateTransferOriginSummary();
  }
}

function updatePriceListState() {
  if (!cfgPriceEnabled) return;
  const enabled = cfgPriceEnabled.checked !== false;
  [cfgPriceGeneral, cfgPriceDiscount, cfgPriceWholesale, cfgPriceCurrency].forEach((select) => {
    if (!select) return;
    select.disabled = !enabled;
  });
}

function getSelectedWarehouseIds() {
  if (!productsWarehouseFilter) return [];
  return Array.from(
    productsWarehouseFilter.querySelectorAll("input[data-warehouse-id]")
  )
    .filter((input) => input.checked)
    .map((input) => String(input.dataset.warehouseId || ""));
}

function renderWarehouseFilters() {
  if (!productsWarehouseFilter) return;
  const selected = new Set(productSettings.filters?.warehouseIds || []);
  productsWarehouseFilter.innerHTML = "";
  const totalCount = warehousesCatalog.length;
  const selectAllLabel = document.createElement("label");
  selectAllLabel.className = "select-all";
  const selectAllInput = document.createElement("input");
  selectAllInput.type = "checkbox";
  selectAllInput.dataset.selectAll = "products";
  selectAllInput.checked = selected.size === 0 || selected.size === totalCount;
  const selectAllText = document.createElement("span");
  selectAllText.textContent = "Seleccionar todas";
  selectAllLabel.appendChild(selectAllInput);
  selectAllLabel.appendChild(selectAllText);
  productsWarehouseFilter.appendChild(selectAllLabel);
  if (!warehousesCatalog.length) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "Sin bodegas";
    productsWarehouseFilter.appendChild(empty);
    return;
  }
  const sortedWarehouses = [...warehousesCatalog].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), "es")
  );
  sortedWarehouses.forEach((warehouse) => {
    const id = String(warehouse.id || warehouse._id || "");
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.warehouseId = id;
    input.checked = selected.has(id);
    const text = document.createElement("span");
    text.textContent = warehouse.name || `Bodega ${id}`;
    label.appendChild(input);
    label.appendChild(text);
    productsWarehouseFilter.appendChild(label);
  });
  updateProductsWarehouseSummary();
}

async function loadWarehouseFilters() {
  if (!productsWarehouseFilter) return;
  try {
    const params = new URLSearchParams();
    const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
    if (shopDomain) params.set("shopDomain", shopDomain);
    params.set("t", String(Date.now()));
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await fetchJson(`/api/alegra/warehouses${query}`);
    warehousesCatalog = Array.isArray(data.items) ? data.items : [];
    warehousesCatalog.sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), "es")
    );
  } catch {
    warehousesCatalog = [];
  }
  renderWarehouseFilters();
}

function updateProductsWarehouseSummary() {
  if (!productsWarehouseSummary) return;
  if (!warehousesCatalog.length) {
    productsWarehouseSummary.textContent = "Sin bodegas";
    return;
  }
  const selected = getSelectedWarehouseIds();
  if (!selected.length || selected.length === warehousesCatalog.length) {
    productsWarehouseSummary.textContent = "Todas";
    return;
  }
  productsWarehouseSummary.textContent = `${selected.length} seleccionadas`;
}

function normalizeStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "inactive" || normalized === "inactivo" || normalized === "disabled") {
    return "inactive";
  }
  return "active";
}

function resolveInventoryQuantity(product) {
  const baseQty = Number(product.inventoryQuantity);
  if (product.inventoryQuantity !== null && product.inventoryQuantity !== undefined) {
    if (Number.isFinite(baseQty)) return baseQty;
  }
  if (Array.isArray(product.variants)) {
    const totals = product.variants.reduce(
      (acc, variant) => {
        const qty = Number(variant.inventoryQuantity);
        if (Number.isFinite(qty)) {
          acc.sum += qty;
          acc.count += 1;
        }
        return acc;
      },
      { sum: 0, count: 0 }
    );
    return totals.count ? totals.sum : null;
  }
  return null;
}

function matchesWarehouseFilter(product, selected) {
  if (!selected.size) return true;
  const direct = Array.isArray(product.warehouseIds) ? product.warehouseIds : [];
  if (direct.some((id) => selected.has(String(id)))) return true;
  if (Array.isArray(product.variants)) {
    return product.variants.some((variant) =>
      (variant.warehouseIds || []).some((id) => selected.has(String(id)))
    );
  }
  return false;
}

async function loadShopifyLookup(products) {
  const skus = Array.from(
    new Set(
      products
        .flatMap((product) => [product.sku, ...(product.variantBarcodes || [])])
        .filter((sku) => sku && sku !== "Sin referencia")
    )
  );
  if (skus.length === 0) {
    shopifyLookup = {};
    return;
  }
  try {
    const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
    const payload = await fetchJson("/api/shopify/lookup-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus, shopDomain }),
    });
    shopifyLookup = payload.results || {};
  } catch {
    shopifyLookup = {};
  }
}

function renderProducts() {
  if (!productsTableBody) return;
  if (productsLoading) {
    productsTableBody.innerHTML = `<tr><td colspan="9" class="empty">Cargando productos...</td></tr>`;
    return;
  }
  if (!productsRows.length) {
    productsTableBody.innerHTML = `<tr><td colspan="9" class="empty">Sin productos para mostrar.</td></tr>`;
    return;
  }

  const dateFilter = productSettings.filters?.productsDate || "";
  const sortMode = productSettings.filters?.productsSort || "date_desc";
  const inStockOnly = Boolean(productSettings.filters?.inStockOnly);
  const statusFilter = productSettings.filters?.statusFilter || "all";
  const selectedWarehouses = new Set(productSettings.filters?.warehouseIds || []);
  const parentRows = productsRows.filter((row) => row.type === "parent");
  const filteredParents = parentRows;

  const dateFilteredParents = dateFilter
    ? filteredParents.filter((row) => {
        const created = row.item.createdAt || "";
        if (!created) return true;
        return String(created).slice(0, 10) === dateFilter;
      })
    : filteredParents;
  const fullyFilteredParents = dateFilteredParents.filter((row) => {
    const product = row.item;
    const matchesStatus = statusFilter === "all" || normalizeStatus(product.status) === statusFilter;
    const qty = resolveInventoryQuantity(product);
    const matchesStock = !inStockOnly || qty === null || qty > 0;
    const matchesWarehouse = matchesWarehouseFilter(product, selectedWarehouses);
    return matchesStatus && matchesStock && matchesWarehouse;
  });
  const useFilteredCount =
    Boolean(dateFilter) ||
    inStockOnly ||
    statusFilter !== "all" ||
    selectedWarehouses.size > 0;

  const pageParents = [...fullyFilteredParents].sort((a, b) => {
    if (sortMode === "ref_asc") {
      return String(a.item.sku || "").localeCompare(String(b.item.sku || ""));
    }
    if (sortMode === "ref_desc") {
      return String(b.item.sku || "").localeCompare(String(a.item.sku || ""));
    }
    const left = String(a.item.createdAt || "");
    const right = String(b.item.createdAt || "");
    if (sortMode === "date_asc") {
      return left.localeCompare(right);
    }
    return right.localeCompare(left);
  });
  const pageParentIds = new Set(pageParents.map((row) => row.parentId));

  const visibleRows = productsRows.filter((row) => {
    if (row.type === "parent") return pageParentIds.has(row.parentId);
    if (!pageParentIds.has(row.parentId)) return false;
    return expandedParents.has(row.parentId);
  });

  renderProductsPagination(useFilteredCount ? fullyFilteredParents.length : undefined);

  productsTableBody.innerHTML = visibleRows
    .map((row) => {
      const product = row.item;
      const lookup = product.sku ? shopifyLookup[product.sku] : null;
      const variantLookup = (product.variantBarcodes || [])
        .map((sku) => shopifyLookup[sku])
        .find((entry) => entry?.published);
      const resolvedLookup = lookup?.published ? lookup : variantLookup;
      const isPublished = Boolean(resolvedLookup?.published);
      const statusLabel = isPublished ? "Publicado" : product.sku ? "Pendiente" : "Sin SKU";
      const statusClass = isPublished ? "status-chip is-success" : "status-chip is-warning";
      const alegraStatus = normalizeStatus(product.status) === "inactive" ? "Inactivo" : "Activo";
      const alegraStatusClass =
        normalizeStatus(product.status) === "inactive" ? "status-chip is-error" : "status-chip is-success";
      const shopifyUrl = resolvedLookup?.productId && shopifyAdminBase
        ? `${shopifyAdminBase}/products/${resolvedLookup.productId}`
        : "";
      const rawShopifyId = resolvedLookup?.productId ? String(resolvedLookup.productId) : "";
      const shopifyId = rawShopifyId.match(/(\d+)/)?.[1] || "-";
      const imageSource = row.type === "variant" && row.parent?.images?.[0]
        ? row.parent.images[0]
        : product.images && product.images[0]
          ? product.images[0]
          : "";
      const imageUrl = imageSource
        ? `/api/alegra/image?url=${encodeURIComponent(imageSource)}`
        : "";
      const imageHtml = imageUrl
        ? `<img class="product-thumb" src="${imageUrl}" alt="${product.name}" loading="lazy" referrerpolicy="no-referrer" />`
        : `<div class="product-thumb"></div>`;
      const nameClass = row.type === "variant" ? "product-variant" : "product-parent";
      const toggleButton =
        row.type === "parent" && row.hasChildren
          ? `<button class="variant-toggle" data-toggle="${row.parentId}">
              <span class="caret">${expandedParents.has(row.parentId) ? "▾" : "▸"}</span>
              <span>${expandedParents.has(row.parentId) ? "Ocultar" : "Ver"} ${row.childCount || 0} Variantes</span>
            </button>`
          : "";
      return `
        <tr class="${row.type === "variant" ? "row-variant" : "row-parent"}">
          <td class="product-cell ${row.type === "variant" ? "product-cell-variant" : ""}">
            <div class="product-main">
              ${imageHtml}
              <div class="product-meta">
                ${toggleButton}
                <strong class="${nameClass}">${product.name}</strong>
                <span class="kpi-sub">${product.sku || "-"}</span>
                <span class="kpi-sub">${product.attributeLabel || product.reference || "-"}</span>
              </div>
            </div>
          </td>
          <td>${product.id || "-"}</td>
          <td>${shopifyId}</td>
          <td>${product.sku || "-"}</td>
          <td>${product.createdAt ? formatDate(product.createdAt) : "-"}</td>
          <td>
            <span class="${alegraStatusClass}">${alegraStatus}</span>
          </td>
          <td>
            <span>${product.inventoryQuantity !== null ? product.inventoryQuantity : "—"}</span>
            <span class="kpi-sub">${product.warehouseBreakdown || "-"}</span>
          </td>
          <td>
            <span class="${statusClass}">${statusLabel}</span><br />
            <span class="kpi-sub">${isPublished ? formatShopifyStatus(resolvedLookup?.status || "active") : "Sin publicar"}</span>
          </td>
          <td class="actions">
            ${
              row.type === "parent"
                ? isPublished
                  ? `<button class="ghost" data-shopify="${shopifyUrl}">Ver Shopify</button>`
                  : `<button class="ghost" data-publish="${product.id}">Publicar</button>`
                : "-"
            }
          </td>
        </tr>
      `;
    })
    .join("");

  productsTableBody.onclick = async (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("button") : null;
    if (!target) return;
    const publishId = target.getAttribute("data-publish");
    if (publishId) {
      await publishProduct(publishId);
      return;
    }
    const shopifyUrl = target.getAttribute("data-shopify");
    if (shopifyUrl) {
      window.open(shopifyUrl, "_blank");
      return;
    }
    const toggleId = target.getAttribute("data-toggle");
    if (toggleId) {
      if (expandedParents.has(toggleId)) {
        expandedParents.delete(toggleId);
      } else {
        expandedParents.add(toggleId);
      }
      renderProducts();
    }
  };

}

function renderProductsPagination(parentCount) {
  if (!productsPageLabel) return;
  const limit = productsLimitInput ? Number(productsLimitInput.value) : 20;
  const totalCount = Number.isFinite(productsTotal)
    ? Number(productsTotal)
    : Number.isFinite(parentCount)
      ? parentCount
      : 0;
  const resolvedTotal = Number.isFinite(parentCount) ? parentCount : totalCount;
  const totalPages = Math.max(1, Math.ceil(resolvedTotal / limit));
  const currentPage = Math.min(totalPages, Math.floor(productsStart / limit) + 1);
  productsPageLabel.textContent = `Pagina ${currentPage} de ${totalPages} (${resolvedTotal || "?"} productos)`;
  if (productsCountLabel) {
    const startLabel = resolvedTotal === 0 ? 0 : productsStart + 1;
    const endLabel = Math.min(productsStart + limit, resolvedTotal);
    const totalLabel = resolvedTotal || "?";
    productsCountLabel.textContent = `Mostrando ${startLabel}-${endLabel} de ${totalLabel}`;
  }
  if (productsPageInput) {
    productsPageInput.max = String(totalPages);
    productsPageInput.value = String(currentPage);
  }
  if (productsPrevBtn) productsPrevBtn.disabled = productsStart <= 0;
  if (productsNextBtn) {
    const hasMore = currentPage < totalPages;
    productsNextBtn.disabled = !hasMore;
  }
}

async function loadProducts() {
  if (productsLoading) return;
  productsLoading = true;
  renderProducts();
  setProductsStatus("Cargando productos...");
	try {
	  const limit = productsLimitInput ? clampProductsLimit(Number(productsLimitInput.value)) : 30;
	  const params = new URLSearchParams();
	  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
	  if (shopDomain) params.set("shopDomain", shopDomain);
	  params.set("start", String(productsStart));
	  params.set("limit", String(limit));
	  if (productsQuery) params.set("query", productsQuery);
	  const inStockOnly = Boolean(productSettings.filters?.inStockOnly);
	  if (inStockOnly) params.set("inStockOnly", "1");
    const warehouseIds = Array.isArray(productSettings.filters?.warehouseIds)
      ? productSettings.filters.warehouseIds
      : [];
    if (warehouseIds.length) params.set("warehouseIds", warehouseIds.join(","));
    const payload = await fetchJson(`/api/products?${params.toString()}`);
    const { items, total } = extractAlegraItems(payload);
    productsList = items.map(normalizeProduct);
    productsRows = buildProductRows(productsList);
    productsTotal = total;
    if (productsQuery) {
      expandedParents.clear();
      productsRows.forEach((row) => {
        if (row.type === "parent" && row.hasChildren) {
          expandedParents.add(row.parentId);
        }
      });
    }
    await loadShopifyLookup(productsList);
    productsLoading = false;
    renderProducts();
    renderProductsPagination();
    setProductsStatus("Listo para sincronizar");
  } catch (error) {
    productsList = [];
    productsRows = [];
    productsTotal = null;
    productsLoading = false;
    renderProducts();
    renderProductsPagination();
    setProductsStatus(error?.message || "No se pudo cargar productos.");
  } finally {
    productsLoading = false;
  }
}

async function publishProduct(alegraId) {
  refreshProductSettingsFromInputs();
  const publishEnabled = productsManualPublish
    ? productsManualPublish.checked
    : rulesAutoPublish
      ? rulesAutoPublish.checked
      : true;
  if (!publishEnabled) {
    showToast("Publicar en Shopify esta apagado en Configuracion → Productos.", "is-warn");
    setProductsStatus("Publicacion desactivada.");
    return;
  }
  const confirmPublish = window.confirm("Vas a publicar este producto en Shopify. ¿Confirmas?");
  if (!confirmPublish) {
    setProductsStatus("Publicacion cancelada.");
    return;
  }
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  setProductsStatus(`Publicando ${alegraId}...`);
  const onlyActive = productsManualOnlyActive
    ? productsManualOnlyActive.checked
    : rulesOnlyActive
      ? rulesOnlyActive.checked
      : false;
  try {
    await fetchJson("/api/shopify/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alegraId,
        shopDomain,
        settings: {
          status: productSettings.publish.status,
          includeImages: productSettings.publish.includeImages,
          vendor: productSettings.publish.vendor,
          publishOnSync: publishEnabled,
          onlyActive,
        },
      }),
    });
    setProductsStatus("Producto publicado.");
    await loadProducts();
  } catch (error) {
    setProductsStatus(error?.message || "Error publicando en Shopify.");
  }
}

async function runProductsSync(mode) {
  refreshProductSettingsFromInputs();
  const activeStore = getActiveStore();
  const storeConnections = getStoreConnections(activeStore);
  if (!activeStore) {
    setProductsBulkSyncRunning(false);
    showToast("Primero crea o selecciona una tienda activa en Nueva conexion.", "is-warn");
    setProductsStatus("Sin tienda activa. Crea/selecciona una tienda para sincronizar.");
    if (productsSyncStatus) productsSyncStatus.textContent = "Sin tienda activa";
    return;
  }
  if (!storeConnections.shopifyConnected || !storeConnections.alegraConnected) {
    setProductsBulkSyncRunning(false);
    showToast("Conecta Shopify y Alegra para ejecutar la sincronizacion masiva.", "is-warn");
    setProductsStatus("Faltan conexiones: conecta Shopify y Alegra para sincronizar.");
    if (productsSyncStatus) productsSyncStatus.textContent = "Faltan conexiones";
    return;
  }
  if (productSettings.sync.publishOnSync) {
    const confirmPublish = window.confirm(
      "El checkbox de publicar esta activo. ¿Seguro que quieres publicar estos productos en Shopify?"
    );
    if (!confirmPublish) {
      setProductsStatus("Sincronizacion cancelada.");
      if (productsSyncStatus) {
        productsSyncStatus.textContent = "Cancelado por el usuario";
      }
      setProductsBulkSyncRunning(false);
      return;
    }
  }
  const hasFilters =
    Boolean(productSettings.sync.dateStart) ||
    Boolean(productSettings.sync.dateEnd) ||
    Boolean(productSettings.sync.query);
  const resolvedMode = hasFilters ? mode : "full";
  setProductsStatus(`Sincronizando productos (${resolvedMode})...`);
  if (productsSyncStatus) {
    productsSyncStatus.textContent = "Sincronizando...";
  }
  setProductsBulkSyncRunning(true);
  const stopProgress = startSyncProgress("Productos");
  updateProductsProgress(0, "Productos 0% · ETA --:--");
  let syncStartTime = Date.now();
		let currentSyncId = "";
		let latestTotals = {
    total: null,
    scanned: 0,
    processed: 0,
    published: 0,
    skipped: 0,
    skippedUnpublished: 0,
    failed: 0,
    rateLimitRetries: 0,
    parents: 0,
    variants: 0,
	};
		try {
		  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
		  const response = await fetch("/api/sync/products?stream=1", {
	    method: "POST",
	    headers: { "Content-Type": "application/json" },
	    body: JSON.stringify({
	      shopDomain,
	      mode: resolvedMode,
	      batchSize: 5,
	      filters: {
	        dateStart: productSettings.sync.dateStart || null,
	        dateEnd: productSettings.sync.dateEnd || null,
          limit: productSettings.sync.limit ? Number(productSettings.sync.limit) : null,
          query: productSettings.sync.query || null,
          includeInventory: productSettings.sync.includeInventory !== false,
          onlyActive: productSettings.sync.onlyActive !== false,
        },
        settings: {
          status: productSettings.publish.status,
          includeImages: productSettings.publish.includeImages,
          vendor: productSettings.publish.vendor,
          publishOnSync: productSettings.sync.publishOnSync !== false,
          onlyPublishedInShopify: productSettings.sync.onlyPublishedInShopify !== false,
        },
        stream: true,
      }),
    });
    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(text || "No se pudo sincronizar productos.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let payload;
        try {
          payload = JSON.parse(trimmed);
        } catch {
          continue;
        }
        if (payload.type === "start") {
          syncStartTime = payload.startedAt || Date.now();
          currentSyncId = payload.syncId || "";
          activeProductsSyncId = currentSyncId;
          if (Number.isFinite(payload.total)) {
            latestTotals.total = payload.total;
          }
          continue;
        }
        if (payload.type === "progress") {
          latestTotals = {
            ...latestTotals,
            total: payload.total ?? latestTotals.total,
            scanned: payload.scanned ?? latestTotals.scanned,
            processed: payload.processed ?? latestTotals.processed,
            published: payload.published ?? latestTotals.published,
            skipped: payload.skipped ?? latestTotals.skipped,
            skippedUnpublished: payload.skippedUnpublished ?? latestTotals.skippedUnpublished,
            failed: payload.failed ?? latestTotals.failed,
            rateLimitRetries: payload.rateLimitRetries ?? latestTotals.rateLimitRetries,
          };
          const total = Number(latestTotals.total) || 0;
          const scanned = Number(latestTotals.scanned) || 0;
          const elapsedMs = Date.now() - syncStartTime;
          const rate = scanned > 0 ? elapsedMs / scanned : 0;
          const remainingMs = total > 0 && rate > 0 ? rate * Math.max(0, total - scanned) : 0;
          const percent = total > 0 ? (scanned / total) * 100 : 0;
          const etaText = total > 0 ? formatDuration(remainingMs) : "--:--";
          updateProductsProgress(
            percent,
            `Productos ${Math.round(percent)}% · ETA ${etaText}`
          );
          if (productsSyncStatus) {
            productsSyncStatus.textContent = `Revisados ${scanned}/${total || "?"} · Procesados ${latestTotals.processed} · Publicados ${latestTotals.published} · Existentes ${latestTotals.skipped} · No publicados ${latestTotals.skippedUnpublished || 0} · Reintentos ${latestTotals.rateLimitRetries}`;
          }
          continue;
        }
        if (payload.type === "complete") {
          const parents = payload.parentCount ?? 0;
          const variants = payload.variantCount ?? 0;
          const total = payload.total ?? payload.scanned ?? payload.processed ?? 0;
          const scanned = payload.scanned ?? 0;
          const processed = payload.processed ?? 0;
          const published = payload.published ?? 0;
          const skipped = payload.skipped ?? 0;
          const failed = payload.failed ?? 0;
          const rateLimitRetries = payload.rateLimitRetries ?? 0;
          const publishOnSync = payload.publishOnSync !== false;
          const publishStatus = payload.publishStatus || "draft";
          const onlyPublished = payload.onlyPublishedInShopify !== false;
          const skippedUnpublished = payload.skippedUnpublished ?? 0;
          const summary =
            total > 0
              ? `Total: ${total} · Revisados: ${scanned} · Procesados: ${processed} · Publicados: ${published} · Existentes: ${skipped} · No publicados: ${skippedUnpublished} · Reintentos: ${rateLimitRetries} · Fallidos: ${failed} · Padres: ${parents} · Variantes: ${variants} · Publicar: ${publishOnSync ? "Si" : "No"} · Solo publicados: ${onlyPublished ? "Si" : "No"} · Estado: ${publishStatus}`
              : payload?.message
                ? payload.message
                : "Sin productos para sincronizar con esos filtros.";
          setProductsStatus(summary);
          if (productsSyncStatus) {
            productsSyncStatus.textContent = summary;
          }
	          finishProductsProgress("Productos 100%");
	          stopProgress("Productos 100%");
	          activeProductsSyncId = "";
	          return;
	        }
	        if (payload.type === "canceled") {
          const summary = "Sincronizacion detenida por el usuario.";
          setProductsStatus(summary);
          if (productsSyncStatus) {
            productsSyncStatus.textContent = summary;
          }
	          finishProductsProgress("Productos detenido");
	          stopProgress("Productos detenido");
	          activeProductsSyncId = "";
	          return;
	        }
	        if (payload.type === "error") {
	          throw new Error(payload.error || "No se pudo sincronizar productos.");
        }
      }
    }
    const total = Number(latestTotals.total) || 0;
    const scanned = Number(latestTotals.scanned) || 0;
    const processed = Number(latestTotals.processed) || 0;
    const published = Number(latestTotals.published) || 0;
    const skipped = Number(latestTotals.skipped) || 0;
    const skippedUnpublished = Number(latestTotals.skippedUnpublished) || 0;
    const failed = Number(latestTotals.failed) || 0;
    const rateLimitRetries = Number(latestTotals.rateLimitRetries) || 0;
    const summary =
      total > 0
        ? `Total: ${total} · Revisados: ${scanned} · Procesados: ${processed} · Publicados: ${published} · Existentes: ${skipped} · No publicados: ${skippedUnpublished} · Reintentos: ${rateLimitRetries} · Fallidos: ${failed}`
        : "Sin productos para sincronizar con esos filtros.";
    setProductsStatus(summary);
    if (productsSyncStatus) {
      productsSyncStatus.textContent = summary;
    }
	    finishProductsProgress("Productos 100%");
	    stopProgress("Productos 100%");
	    activeProductsSyncId = "";
	  } catch (error) {
	    const message = error?.message || "No se pudo sincronizar productos.";
	    setProductsStatus(message);
    if (productsSyncStatus) {
      productsSyncStatus.textContent = message;
    }
	    stopProgress("Error en productos");
	    finishProductsProgress("Error en productos");
	    activeProductsSyncId = "";
	  } finally {
	    setProductsBulkSyncRunning(false);
	  }
	}

async function runOrdersSync() {
  refreshProductSettingsFromInputs();
  setProductsStatus("Sincronizando pedidos...");
  if (ordersSyncStatus) {
    ordersSyncStatus.textContent = "Sincronizando...";
  }
  const stopProgress = startSyncProgress("Pedidos");
  updateOrdersProgress(0, "Pedidos 0% · ETA --:--");
  let syncStartTime = Date.now();
  let latestTotals = {
    total: null,
    processed: 0,
  };
	try {
	  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
	  const orderNumber = productSettings.orders.orderNumber
	    ? productSettings.orders.orderNumber.replace(/^#/, "")
	    : "";
	  const response = await fetch("/api/sync/orders?stream=1", {
	    method: "POST",
	    headers: { "Content-Type": "application/json" },
	    body: JSON.stringify({
	      shopDomain,
	      filters: {
	        dateStart: productSettings.orders.dateStart || null,
	        dateEnd: productSettings.orders.dateEnd || null,
	        limit: productSettings.orders.limit ? Number(productSettings.orders.limit) : null,
	        orderNumber: orderNumber || null,
	      },
	      stream: true,
	    }),
	  });
    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(text || "No se pudo sincronizar pedidos.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let payload;
        try {
          payload = JSON.parse(trimmed);
        } catch {
          continue;
        }
        if (payload.type === "start") {
          syncStartTime = payload.startedAt || Date.now();
          if (Number.isFinite(payload.total)) {
            latestTotals.total = payload.total;
          }
          continue;
        }
        if (payload.type === "progress") {
          latestTotals = {
            ...latestTotals,
            total: payload.total ?? latestTotals.total,
            processed: payload.processed ?? latestTotals.processed,
          };
          const total = Number(latestTotals.total) || 0;
          const processed = Number(latestTotals.processed) || 0;
          const elapsedMs = Date.now() - syncStartTime;
          const rate = processed > 0 ? elapsedMs / processed : 0;
          const remainingMs = total > 0 && rate > 0 ? rate * Math.max(0, total - processed) : 0;
          const percent = total > 0 ? (processed / total) * 100 : 0;
          const etaText = total > 0 ? formatDuration(remainingMs) : "--:--";
          updateOrdersProgress(
            percent,
            `Pedidos ${Math.round(percent)}% · ETA ${etaText}`
          );
          if (ordersSyncStatus) {
            ordersSyncStatus.textContent = `Procesados ${processed}/${total || "?"}`;
          }
          continue;
        }
        if (payload.type === "complete") {
          const count = payload?.count ?? payload?.processed ?? 0;
          const summary = `Pedidos: ${count}`;
          setProductsStatus(summary);
          if (ordersSyncStatus) {
            ordersSyncStatus.textContent = summary;
          }
          finishOrdersProgress("Pedidos 100%");
          stopProgress("Pedidos 100%");
          await loadOperations();
          return;
        }
        if (payload.type === "error") {
          throw new Error(payload.error || "No se pudo sincronizar pedidos.");
        }
      }
    }
    const total = Number(latestTotals.total) || 0;
    const processed = Number(latestTotals.processed) || 0;
    const summary = total > 0 ? `Pedidos: ${processed}/${total}` : "Pedidos sincronizados.";
    setProductsStatus(summary);
    if (ordersSyncStatus) {
      ordersSyncStatus.textContent = summary;
    }
    finishOrdersProgress("Pedidos 100%");
    stopProgress("Pedidos 100%");
    await loadOperations();
  } catch (error) {
    const message = error?.message || "No se pudo sincronizar pedidos.";
    setProductsStatus(message);
    if (ordersSyncStatus) {
      ordersSyncStatus.textContent = message;
    }
    stopProgress("Error en pedidos");
    finishOrdersProgress("Error en pedidos");
  }
}

function ensureProductsLoaded() {
  if (productsLoaded) return;
  productsLoaded = true;
  applyProductSettings();
  loadWarehouseFilters().catch(() => null);
  if (productsLimitInput) {
    productsLimitInput.value = String(clampProductsLimit(Number(productsLimitInput.value || 30)));
  }
  loadProducts();
}

async function loadMetrics() {
  try {
    const range = metricsRange ? String(metricsRange.value || "month") : "month";
    const params = new URLSearchParams();
    if (range) params.set("range", range);
    params.set("t", String(Date.now()));
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await fetchJson(`/api/metrics${query}`);
    if (metricsRange && data.range) {
      metricsRange.value = data.range;
    }
    const growthLabel =
      data.range === "day"
        ? "Pedidos del día"
        : data.range === "week"
        ? "Pedidos semanales"
        : "Pedidos mensuales";
    const billingLabel =
      data.range === "day"
        ? "Facturacion del día"
        : data.range === "week"
        ? "Facturacion semanal"
        : "Facturacion mensual";
    if (weeklyGrowthLabel) {
      weeklyGrowthLabel.textContent = growthLabel;
    }
    if (alegraGrowthLabel) {
      alegraGrowthLabel.textContent = billingLabel;
    }
    if (kpiSalesToday) {
      const rangeLabel = data.rangeLabel || "Mes";
      const salesRange = data.salesRange || data.salesToday || "0";
      kpiSalesToday.textContent = salesRange;
      if (kpiShopifyLabel) {
        kpiShopifyLabel.textContent = `Pedidos · ${rangeLabel}`;
      }
    }
    if (kpiSalesTodaySub) {
      const prevLabel =
        data.range === "day"
          ? "ayer"
          : data.range === "week"
          ? "semana pasada"
          : "mes pasado";
      const pct = typeof data.salesRangePct === "number" ? `${Math.abs(data.salesRangePct)}%` : "--";
      const sign = data.salesRangeTrend === "down" ? "-" : "+";
      const delta =
        typeof data.salesRangeDelta === "string" ? `${sign}${data.salesRangeDelta}` : "--";
      kpiSalesTodaySub.textContent = `Vs ${prevLabel} ${delta} (${pct})`;
    }
    if (kpiBillingAlegra) {
      const billingRange = data.billingRange || "0";
      kpiBillingAlegra.textContent = billingRange;
      if (kpiAlegraLabel) {
        const rangeLabel = data.rangeLabel || "Mes";
        kpiAlegraLabel.textContent = `Facturacion · ${rangeLabel}`;
      }
    }
    if (kpiBillingAlegraSub) {
      const prevLabel =
        data.range === "day"
          ? "ayer"
          : data.range === "week"
          ? "semana pasada"
          : "mes pasado";
      const pct = typeof data.billingRangePct === "number" ? `${Math.abs(data.billingRangePct)}%` : "--";
      const sign = data.billingRangeTrend === "down" ? "-" : "+";
      const delta =
        typeof data.billingRangeDelta === "string" ? `${sign}${data.billingRangeDelta}` : "--";
      kpiBillingAlegraSub.textContent = `Vs ${prevLabel} ${delta} (${pct})`;
    }
    renderLineChart(chartWeekly, data.weeklyRevenue || [], data.weeklyRevenuePrev || []);
    renderLineChart(chartAlegra, data.billingSeries || [], data.billingSeriesPrev || []);
    renderBarChart(winsTopProducts, data.topProductsUnits || [], {
      labelKey: "name",
      valueKey: "units",
      valueFormatter: (value) => `${value} u`,
    });
    renderBarChart(winsTopCities, data.topCities || [], {
      labelKey: "city",
      valueKey: "total",
      valueFormatter: (value) => `${value} pedidos`,
    });
    renderBarChart(winsPaymentMethods, data.paymentsByMethod || [], {
      labelKey: "method",
      valueKey: "amount",
      valueFormatter: (value) => formatCurrencyValue(Number(value || 0)),
    });
    renderTopRevenueTable(data.topProductsRevenue || []);
    renderTopCustomersTable(data.topCustomers || []);
    renderInventoryAlerts(data.lowStock || [], data.inactiveProducts || []);
    updatePanelVisibility(data);
  } catch {
    if (kpiSalesToday) kpiSalesToday.textContent = "0";
    if (kpiSalesTodaySub) kpiSalesTodaySub.textContent = "Vs periodo anterior --";
    if (kpiBillingAlegra) kpiBillingAlegra.textContent = "0";
    if (kpiBillingAlegraSub) kpiBillingAlegraSub.textContent = "Vs periodo anterior --";
    renderLineChart(chartWeekly, []);
    renderLineChart(chartAlegra, []);
    renderBarChart(winsTopProducts, []);
    renderBarChart(winsTopCities, []);
    renderBarChart(winsPaymentMethods, []);
    renderTopRevenueTable([]);
    renderTopCustomersTable([]);
    renderInventoryAlerts([], []);
    updatePanelVisibility({});
  }
}

async function loadOperations() {
  try {
    const days = ordersDaysSelect ? Number(ordersDaysSelect.value) : 30;
    const params = new URLSearchParams();
    const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
    if (shopDomain) params.set("shopDomain", shopDomain);
    if (Number.isFinite(days) && days > 0) params.set("days", String(days));
    if (opsSearch && opsSearch.value.trim()) {
      params.set("query", opsSearch.value.trim());
    }
    if (ordersDateFilter && ordersDateFilter.value) {
      params.set("date", ordersDateFilter.value);
    }
    if (ordersSort && ordersSort.value) {
      params.set("sort", ordersSort.value);
    }
    const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;
    params.set("limit", String(pageSize));
    params.set("offset", String(ordersStart));
    const data = await fetchJson(`/api/orders?${params.toString()}`);
    const items = data.items || [];
    operationsList = items;
    ordersTotal = Number.isFinite(data.total) ? Number(data.total) : items.length;
    renderOperations(operationsList);
  } catch {
    operationsList = [];
    ordersTotal = 0;
    renderOperations([]);
  }
}

function renderOperations(items) {
  if (!items.length) {
    opsTableBody.innerHTML = `<tr><td colspan="7" class="empty">Sin ordenes para mostrar.</td></tr>`;
    ordersTotal = 0;
    ordersStart = 0;
    if (ordersPageLabel) {
      ordersPageLabel.textContent = "Pagina 1 de 1";
    }
    if (ordersCountLabel) {
      ordersCountLabel.textContent = "Mostrando 0 de 0";
    }
    if (ordersPrevBtn) ordersPrevBtn.disabled = true;
    if (ordersNextBtn) ordersNextBtn.disabled = true;
    return;
  }
  const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;
  const totalPages = Math.max(1, Math.ceil((ordersTotal || 0) / pageSize));
  const currentPage = Math.min(totalPages, Math.floor(ordersStart / pageSize) + 1);
  if (ordersPageLabel) {
    ordersPageLabel.textContent = `Pagina ${currentPage} de ${totalPages} (${ordersTotal || 0} pedidos)`;
  }
  if (ordersPageInput) {
    ordersPageInput.max = String(totalPages);
    ordersPageInput.value = String(currentPage);
  }
  if (ordersCountLabel) {
    const startLabel = ordersTotal === 0 ? 0 : ordersStart + 1;
    const endLabel = Math.min(ordersStart + pageSize, ordersTotal || 0);
    ordersCountLabel.textContent = `Mostrando ${startLabel}-${endLabel} de ${ordersTotal || 0}`;
  }
  if (ordersPrevBtn) ordersPrevBtn.disabled = ordersStart <= 0;
  if (ordersNextBtn) ordersNextBtn.disabled = ordersStart + pageSize >= (ordersTotal || 0);

  opsTableBody.innerHTML = items
    .map((item) => {
      const statusLabel =
        item.alegraStatus === "facturado" ? "Facturado" : "Pendiente/Fallo";
      const statusClass =
        item.alegraStatus === "facturado" ? "status-chip is-success" : "status-chip is-error";
      const einvoiceLabel = item.einvoiceRequested
        ? item.einvoiceMissing && item.einvoiceMissing.length
          ? `<span class="status-chip is-warning">E-Factura incompleta</span>`
          : `<span class="status-chip is-success">E-Factura</span>`
        : "";
      const actions = [];
      if (item.shopifyId) {
        if (item.alegraStatus !== "facturado") {
          actions.push(`<button class="ghost" data-invoice="${item.shopifyId}">Facturar manualmente</button>`);
        }
        actions.push(`<button class="ghost" data-einvoice="${item.shopifyId}">Editar e-Factura</button>`);
      }
      return `
        <tr>
          <td>${item.processedAt ? formatDate(item.processedAt) : "-"}</td>
          <td>${item.orderNumber || item.id}</td>
          <td>${item.customer || "-"}</td>
          <td>${item.products || "-"}</td>
          <td><span class="${statusClass}">${statusLabel}</span>${einvoiceLabel ? ` ${einvoiceLabel}` : ""}</td>
          <td class="actions">${actions.join(" ") || "-"}</td>
          <td>${item.invoiceNumber || "-"}</td>
        </tr>
      `;
    })
    .join("");

  opsTableBody.querySelectorAll("button[data-invoice]").forEach((button) => {
    button.addEventListener("click", async () => {
      const orderId = encodeURIComponent(String(button.dataset.invoice || ""));
      try {
        await fetchJson(`/api/operations/${orderId}/invoice`, { method: "POST" });
        await loadLogs();
        await loadOperations();
      } catch (error) {
        showToast(error?.message || "No se pudo facturar.", "is-error");
      }
    });
  });

  opsTableBody.querySelectorAll("button[data-einvoice]").forEach((button) => {
    button.addEventListener("click", () => {
      const orderId = String(button.dataset.einvoice || "");
      if (!orderId) return;
      openEinvoiceModal(orderId);
    });
  });
}

function normalizeContactsLimit() {
  const value = contactsLimitInput ? Number(contactsLimitInput.value) : 0;
  return Number.isFinite(value) && value > 0 ? value : 20;
}

function renderContacts(items) {
  if (!contactsTableBody) return;
  const total = Number(contactsTotal || 0);
  const limit = normalizeContactsLimit();
  if (!items.length) {
    contactsTableBody.innerHTML = `<tr><td colspan="9" class="empty">Sin contactos para mostrar.</td></tr>`;
    if (contactsPageLabel) contactsPageLabel.textContent = "Pagina 1 de 1";
    if (contactsCountLabel) contactsCountLabel.textContent = "Mostrando 0 de 0";
    if (contactsPrevBtn) contactsPrevBtn.disabled = true;
    if (contactsNextBtn) contactsNextBtn.disabled = true;
    return;
  }
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(totalPages, Math.floor(contactsStart / limit) + 1);
  if (contactsPageLabel) {
    contactsPageLabel.textContent = `Pagina ${currentPage} de ${totalPages} (${total} contactos)`;
  }
  if (contactsPageInput) {
    contactsPageInput.max = String(totalPages);
    contactsPageInput.value = String(currentPage);
  }
  if (contactsCountLabel) {
    const startLabel = total === 0 ? 0 : contactsStart + 1;
    const endLabel = Math.min(contactsStart + limit, total);
    contactsCountLabel.textContent = `Mostrando ${startLabel}-${endLabel} de ${total}`;
  }
  if (contactsPrevBtn) contactsPrevBtn.disabled = contactsStart <= 0;
  if (contactsNextBtn) contactsNextBtn.disabled = contactsStart + limit >= total;

  contactsTableBody.innerHTML = items
    .map((item) => {
      const source =
        item.source === "shopify"
          ? "Shopify"
          : item.source === "alegra"
            ? "Alegra"
            : "-";
      const status = item.sync_status === "synced" ? "Sincronizado" : "Pendiente";
      return `
        <tr>
          <td>${item.name || "-"}</td>
          <td>${item.email || "-"}</td>
          <td>${item.phone || "-"}</td>
          <td>${item.doc || "-"}</td>
          <td>${source}</td>
          <td>${status}</td>
          <td>${item.shopify_id || "-"}</td>
          <td>${item.alegra_id || "-"}</td>
          <td>${item.updated_at ? formatDate(item.updated_at) : "-"}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadContacts() {
  const params = new URLSearchParams();
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (shopDomain) params.set("shopDomain", shopDomain);
  const query = contactsSearch ? contactsSearch.value.trim() : "";
  const status = contactsStatusFilter ? contactsStatusFilter.value : "";
  const source = contactsSourceFilter ? contactsSourceFilter.value : "";
  const from = contactsDateStart ? contactsDateStart.value : "";
  const to = contactsDateEnd ? contactsDateEnd.value : "";
  const limit = normalizeContactsLimit();
  params.set("limit", String(limit));
  params.set("offset", String(contactsStart));
  if (query) params.set("query", query);
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  try {
    const result = await fetchJson(`/api/contacts?${params.toString()}`);
    contactsList = Array.isArray(result.items) ? result.items : [];
    contactsTotal = Number(result.total || 0);
    renderContacts(contactsList);
  } catch {
    contactsList = [];
    contactsTotal = 0;
    renderContacts([]);
  }
}

function formatCurrencyValue(value) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(value);
}

function renderLineChart(container, items, prevItems = []) {
  if (!container) return;
  if (!Array.isArray(items) || !items.length) {
    container.innerHTML = "";
    return;
  }
  const sliceItems = container.classList.contains("chart-compact")
    ? items.slice(-7)
    : items;
  const prevSlice = container.classList.contains("chart-compact")
    ? prevItems.slice(-sliceItems.length)
    : prevItems;
  const values = sliceItems.map((item) => Number(item.amount || 0));
  const prevValues = prevSlice.map((item) => Number(item.amount || 0));
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const prevMax = prevValues.length ? Math.max(...prevValues, 1) : 0;
  const prevMin = prevValues.length ? Math.min(...prevValues, 0) : 0;
  const maxAll = Math.max(maxValue, prevMax, 1);
  const minAll = Math.min(minValue, prevMin, 0);
  const width = 100;
  const height = 40;
  const padX = 4;
  const padY = 6;
  const step = sliceItems.length > 1 ? (width - padX * 2) / (sliceItems.length - 1) : 0;
  const scale = (value) => {
    if (maxAll === minAll) return height / 2;
    const ratio = (value - minAll) / (maxAll - minAll);
    return height - padY - ratio * (height - padY * 2);
  };
  const points = sliceItems
    .map((item, index) => `${padX + index * step},${scale(Number(item.amount || 0))}`)
    .join(" ");
  const prevPoints = prevSlice
    .map((item, index) => `${padX + index * step},${scale(Number(item.amount || 0))}`)
    .join(" ");
  const lastValue = sliceItems[sliceItems.length - 1]?.amount || 0;
  const lastLabel = String(sliceItems[sliceItems.length - 1]?.date || "").slice(5);
  const prevTotal = prevValues.reduce((acc, value) => acc + value, 0);
  const currentTotal = values.reduce((acc, value) => acc + value, 0);
  const maxLabel = formatCurrencyValue(maxAll);
  const midLabel = formatCurrencyValue((maxAll + minAll) / 2);
  const minLabel = formatCurrencyValue(minAll);
  container.innerHTML = `
    <div class="line-chart">
      <div class="line-chart-plot">
        <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
          ${prevPoints ? `<polyline points="${prevPoints}" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 3" />` : ""}
          <polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="2" />
        </svg>
        <div class="line-chart-scale">
          <span>${maxLabel}</span>
          <span>${midLabel}</span>
          <span>${minLabel}</span>
        </div>
      </div>
      ${prevPoints ? `
        <div class="line-chart-legend">
          <span><i></i>Actual: ${formatCurrencyValue(currentTotal)}</span>
          <span><i class="is-prev"></i>Anterior: ${formatCurrencyValue(prevTotal)}</span>
        </div>
      ` : ""}
      <div class="line-chart-meta">
        <span>${lastLabel}</span>
        <strong>${formatCurrencyValue(Number(lastValue || 0))}</strong>
      </div>
    </div>
  `;
}

function renderBarChart(container, items, options = {}) {
  if (!container) return;
  if (!Array.isArray(items) || !items.length) {
    container.innerHTML = "";
    return;
  }
  const labelKey = options.labelKey || "name";
  const valueKey = options.valueKey || "value";
  const valueFormatter =
    typeof options.valueFormatter === "function"
      ? options.valueFormatter
      : (value) => String(value);
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1);
  container.innerHTML = `
    <div class="chart-bars">
      ${items
        .slice(0, 10)
        .map((item) => {
          const value = Number(item[valueKey] || 0);
          const width = Math.round((value / maxValue) * 100);
          return `
            <div class="bar-row">
              <span class="bar-label">${item[labelKey] || "-"}</span>
              <div class="bar-track">
                <div class="bar-fill" style="width: ${width}%"></div>
              </div>
              <span class="bar-value">${valueFormatter(value)}</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTopRevenueTable(items) {
  if (!winsTopRevenueBody) return;
  if (!Array.isArray(items) || !items.length) {
    winsTopRevenueBody.innerHTML = "";
    return;
  }
  winsTopRevenueBody.innerHTML = items
    .slice(0, 10)
    .map(
      (item) => `
      <tr>
        <td>${item.name || "-"}</td>
        <td>${formatCurrencyValue(Number(item.amount || 0))}</td>
        <td>${item.units ?? "-"}</td>
      </tr>
    `
    )
    .join("");
}

function renderTopCustomersTable(items) {
  if (!winsTopCustomersBody) return;
  if (!Array.isArray(items) || !items.length) {
    winsTopCustomersBody.innerHTML = "";
    return;
  }
  winsTopCustomersBody.innerHTML = items
    .slice(0, 10)
    .map(
      (item) => `
      <tr>
        <td>${item.name || item.email || "-"}</td>
        <td>${formatCurrencyValue(Number(item.avgTicket || 0))}</td>
        <td>${formatCurrencyValue(Number(item.total || 0))}</td>
      </tr>
    `
    )
    .join("");
}

function renderInventoryAlerts(lowStock, inactive) {
  if (alertLowStockBody) {
    if (!Array.isArray(lowStock) || !lowStock.length) {
      alertLowStockBody.innerHTML = "";
    } else {
      alertLowStockBody.innerHTML = lowStock
        .slice(0, 10)
        .map(
          (item) => `
          <tr>
            <td>${item.name || "-"}</td>
            <td>${item.stock ?? "-"}</td>
            <td>${item.sold ?? 0}</td>
          </tr>
        `
        )
        .join("");
    }
  }
  if (alertInactiveBody) {
    if (!Array.isArray(inactive) || !inactive.length) {
      alertInactiveBody.innerHTML = "";
    } else {
      alertInactiveBody.innerHTML = inactive
        .slice(0, 10)
        .map(
          (item) => `
          <tr>
            <td>${item.name || "-"}</td>
            <td>${item.stock ?? "-"}</td>
            <td>0</td>
          </tr>
        `
        )
        .join("");
    }
  }
}

function setVisible(element, visible) {
  if (!element) return;
  element.style.display = visible ? "" : "none";
}

function updatePanelVisibility(data) {
  const hasTopProducts = Array.isArray(data.topProductsUnits) && data.topProductsUnits.length > 0;
  const hasTopRevenue = Array.isArray(data.topProductsRevenue) && data.topProductsRevenue.length > 0;
  const hasTopCities = Array.isArray(data.topCities) && data.topCities.length > 0;
  const hasTopCustomers = Array.isArray(data.topCustomers) && data.topCustomers.length > 0;
  const hasPaymentMethods = Array.isArray(data.paymentsByMethod) && data.paymentsByMethod.length > 0;
  const hasLowStock = Array.isArray(data.lowStock) && data.lowStock.length > 0;
  const hasInactive = Array.isArray(data.inactiveProducts) && data.inactiveProducts.length > 0;
  const hasWeekly = Array.isArray(data.weeklyRevenue) && data.weeklyRevenue.length > 0;
  const hasBillingSeries = Array.isArray(data.billingSeries) && data.billingSeries.length > 0;

  setVisible(panelTopProducts, hasTopProducts);
  setVisible(panelTopRevenue, hasTopRevenue);
  setVisible(panelTopCities, hasTopCities);
  setVisible(panelTopCustomers, hasTopCustomers);
  setVisible(panelPaymentMethods, hasPaymentMethods);

  const showInventory = hasLowStock || hasInactive;
  setVisible(panelInventoryAlerts, showInventory);
  setVisible(cardLowStock, hasLowStock);
  setVisible(cardInactiveProducts, hasInactive);

  const weeklyCard = chartWeekly ? chartWeekly.closest(".kpi-card") : null;
  const billingCard = chartAlegra ? chartAlegra.closest(".kpi-card") : null;
  setVisible(weeklyCard, hasWeekly);
  setVisible(billingCard, hasBillingSeries);
}

function buildAssistantMessage(role, content, options = {}) {
  if (!assistantMessages) return null;
  const message = document.createElement("div");
  message.className = `assistant-message ${role === "user" ? "is-user" : "is-bot"}`;
  if (options.thinking) {
    message.classList.add("is-thinking");
  }
  const bubble = document.createElement("div");
  bubble.className = "assistant-message-bubble";
  if (role === "user") {
    bubble.textContent = content;
  } else {
    const avatarWrap = document.createElement("div");
    avatarWrap.className = "assistant-avatar-wrap";
    const badge = document.createElement("img");
    badge.src = "/assets/logo.png";
    badge.alt = "Apiflujos";
    badge.className = "assistant-avatar-badge";
    const avatar = document.createElement("img");
    avatar.src = "/assets/avatar.png";
    avatar.alt = "Olivia IA";
    avatar.className = "assistant-message-avatar";
    avatarWrap.appendChild(badge);
    avatarWrap.appendChild(avatar);
    message.appendChild(avatarWrap);
    bubble.innerHTML = content || "";
  }
  message.appendChild(bubble);
  return { message, bubble };
}

function appendAssistantMessage(role, content) {
  const built = buildAssistantMessage(role, content);
  if (!built || !assistantMessages) return null;
  assistantMessages.appendChild(built.message);
  assistantMessages.scrollTop = assistantMessages.scrollHeight;
  return built.message;
}

function appendAssistantTable(container, headers, rows) {
  const table = document.createElement("table");
  table.className = "table assistant-table";
  table.innerHTML = `
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
    </tbody>
  `;
  container.appendChild(table);
}

async function handleAssistantAction(action) {
  if (!action) return;
  if (action.clientAction) {
    if (action.type === "sync_products") {
      runProductsSync("full");
      appendAssistantMessage("bot", "Sincronizacion de productos iniciada.");
      return;
    }
    if (action.type === "sync_orders") {
      runOrdersSync();
      appendAssistantMessage("bot", "Sincronizacion de pedidos iniciada.");
      return;
    }
  }
  try {
    const result = await fetchJson("/api/assistant/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    appendAssistantMessage("bot", result.reply || "Accion ejecutada.");
  } catch (error) {
    appendAssistantMessage("bot", error?.message || "No se pudo ejecutar la accion.");
  }
}

function renderAssistantAttachments() {
  if (!assistantAttachments) return;
  if (!assistantFiles.length) {
    assistantAttachments.innerHTML = "";
    return;
  }
  assistantAttachments.innerHTML = assistantFiles
    .map((item, index) => {
      if (item.previewUrl && item.file.type.startsWith("image/")) {
        return `
          <span class="assistant-attachment is-image">
            <img class="assistant-attachment-thumb" src="${item.previewUrl}" alt="${item.file.name}" />
            <button class="assistant-attachment-remove" type="button" data-remove="${index}">×</button>
          </span>
        `;
      }
      return `
        <span class="assistant-attachment">
          ${item.file.name}
          <button type="button" data-remove="${index}">×</button>
        </span>
      `;
    })
    .join("");
  assistantAttachments.querySelectorAll("button[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const idx = Number(button.dataset.remove);
      const removed = assistantFiles[idx];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      assistantFiles = assistantFiles.filter((_, i) => i !== idx);
      renderAssistantAttachments();
    });
  });
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function sendAssistantMessage() {
  if (!assistantInput) return;
  const text = assistantInput.value.trim();
  if (!text && assistantFiles.length === 0) return;
  const shouldIntro = !assistantHasSpoken;
  assistantInput.value = "";
  appendAssistantMessage("user", text);
  assistantHasSpoken = true;
  let thinkingMessage = null;
  let thinkingBubble = null;
  if (assistantMessages) {
    const built = buildAssistantMessage("bot", "", { thinking: true });
    if (built) {
      thinkingMessage = built.message;
      thinkingBubble = built.bubble;
      assistantMessages.appendChild(thinkingMessage);
      assistantMessages.scrollTop = assistantMessages.scrollHeight;
    }
  }
  try {
    const attachments = [];
    for (const item of assistantFiles) {
      const file = item.file;
      if (file.size > 5 * 1024 * 1024) {
        continue;
      }
      const dataUrl = await readFileAsDataUrl(file);
      attachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      });
    }
    const payload = {
      message: text,
      mode: "assistant",
      intro: shouldIntro,
      attachments,
    };
    const result = await fetchJson("/api/assistant/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (thinkingMessage) {
      thinkingMessage.classList.remove("is-thinking");
    }
    if (thinkingBubble) {
      thinkingBubble.innerHTML = result.reply || "Listo.";
    } else {
      appendAssistantMessage("bot", result.reply || "Listo.");
    }
    const container = thinkingMessage;
    if (!container) return;
    if (Array.isArray(result.items) && result.items.length) {
      const headers = result.itemsHeaders || ["ID", "Nombre", "Referencia"];
      const rows = Array.isArray(result.itemsRows) && result.itemsRows.length
        ? result.itemsRows
        : result.items.map((item) => [
            item.id || "-",
            item.name || "-",
            item.reference || item.code || "-",
          ]);
      appendAssistantTable(container, headers, rows);
    }
    if (result.clientAction) {
      handleAssistantAction(result.clientAction).catch(() => null);
    }
    assistantFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    assistantFiles = [];
    renderAssistantAttachments();
  } catch (error) {
    if (thinkingMessage) {
      thinkingMessage.classList.remove("is-thinking");
      thinkingMessage.classList.add("is-error");
    }
    if (thinkingBubble) {
      thinkingBubble.textContent = error?.message || "No se pudo procesar la solicitud.";
    } else {
      appendAssistantMessage("bot", error?.message || "No se pudo procesar la solicitud.");
    }
  }
}

async function loadCatalog(select, endpoint) {
  try {
    const data = await fetchJson(`/api/alegra/${endpoint}`);
    const items = Array.isArray(data.items) ? data.items : [];
    select.innerHTML = "";
    const allowEmpty = select.dataset.allowEmpty === "true";
    if (allowEmpty) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = select.dataset.emptyLabel || "No usar";
      select.appendChild(option);
    }
    if (!items.length) {
      const option = document.createElement("option");
      option.disabled = true;
      option.selected = !allowEmpty;
      option.textContent = "Sin datos";
      select.appendChild(option);
      if (select.dataset.selected) {
        select.value = select.dataset.selected;
      }
      return;
    }
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id || item._id || "");
      option.textContent = item.name || `ID ${option.value}`;
      select.appendChild(option);
    });
    if (select.dataset.selected) {
      select.value = select.dataset.selected;
    }
  } catch (error) {
    select.innerHTML = "";
    const allowEmpty = select.dataset.allowEmpty === "true";
    if (allowEmpty) {
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = select.dataset.emptyLabel || "No usar";
      select.appendChild(emptyOption);
    }
    const option = document.createElement("option");
    option.disabled = true;
    option.selected = !allowEmpty;
    option.textContent = "Error al cargar";
    select.appendChild(option);
    console.error(error);
  }
}

async function loadResolutions() {
  try {
    const data = await fetchJson("/api/settings/resolutions");
    const items = Array.isArray(data.items) ? data.items : [];
    cfgResolution.innerHTML = "";
    if (!items.length) {
      const option = document.createElement("option");
      option.disabled = true;
      option.selected = true;
      option.textContent = "Sin datos";
      cfgResolution.appendChild(option);
      return;
    }
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id || item._id || "");
      option.textContent = item.name || `Resolucion ${option.value}`;
      cfgResolution.appendChild(option);
    });
    if (cfgResolution.dataset.selected) {
      cfgResolution.value = cfgResolution.dataset.selected;
    }
  } catch (error) {
    cfgResolution.innerHTML = "";
    const option = document.createElement("option");
    option.disabled = true;
    option.selected = true;
    option.textContent = "Error al cargar";
    cfgResolution.appendChild(option);
    console.error(error);
  }
}


if (aiSave) {
  aiSave.addEventListener("click", async () => {
    setButtonLoading(aiSave, true, "Guardando...");
    try {
      await saveSettings({ includeAi: true });
      showToast("Token guardado.", "is-ok");
    } catch (error) {
      showToast(error?.message || "No se pudo guardar.", "is-error");
    } finally {
      setButtonLoading(aiSave, false);
    }
  });
}

if (wizardStart) {
  wizardStart.addEventListener("click", async () => {
    setButtonLoading(wizardStart, true, "Iniciando...");
    try {
      try {
        localStorage.removeItem(COACH_DISMISSED_KEY);
      } catch {
        // ignore
      }
      await startWizardFlow();
    } catch (error) {
      showToast(error?.message || "No se pudo iniciar el asistente.", "is-error");
    } finally {
      setButtonLoading(wizardStart, false);
    }
  });
}

if (wizardStop) {
  wizardStop.addEventListener("click", () => {
    stopWizardFlow();
  });
}

if (wizardSkip) {
  wizardSkip.addEventListener("click", () => {
    skipWizardStep();
  });
}

if (manualOpen) {
  manualOpen.addEventListener("click", () => {
    setSetupMode("manual", { persist: true, stopWizard: true });
    setConnectionsSetupOpen(true);
    setSettingsPane("connections", { persist: false });
    closeCoach({ persistDismiss: false });
    const target = storeNameInput || shopifyDomain;
    if (target) focusFieldWithContext(target);
  });
}

if (storeNameInput) {
  storeNameInput.addEventListener("input", updateWizardStartAvailability);
}

if (shopifyDomain) {
  shopifyDomain.addEventListener("input", () => {
    updateWizardStartAvailability();
    updateConnectionPills();
  });
}

if (syncOrdersShopifyEnabled) {
  syncOrdersShopifyEnabled.addEventListener("change", () => {
    applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, "db_only");
    updateOrderSyncDependencies();
  });
}

if (syncOrdersAlegraEnabled) {
  syncOrdersAlegraEnabled.addEventListener("change", () => {
    applyOrderToggle(syncOrdersAlegra, syncOrdersAlegraEnabled, "draft");
  });
}

if (syncOrdersShopify) {
  syncOrdersShopify.addEventListener("change", () => {
    if (syncOrdersShopifyEnabled) {
      syncOrdersShopifyEnabled.checked = syncOrdersShopify.value !== "off";
      applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, "db_only");
    }
    updateOrderSyncDependencies();
  });
}

if (syncOrdersAlegra) {
  syncOrdersAlegra.addEventListener("change", () => {
    if (syncOrdersAlegraEnabled) {
      syncOrdersAlegraEnabled.checked = syncOrdersAlegra.value !== "off";
      applyOrderToggle(syncOrdersAlegra, syncOrdersAlegraEnabled, "draft");
    }
  });
}

function setPasswordStatus(text, state) {
  if (!passwordMessage) return;
  passwordMessage.textContent = text || "";
  passwordMessage.classList.remove("is-error", "is-ok");
  if (state) {
    passwordMessage.classList.add(state);
  }
}

if (passwordSave) {
  passwordSave.addEventListener("click", async () => {
    const current = passwordCurrent ? passwordCurrent.value.trim() : "";
    const next = passwordNew ? passwordNew.value.trim() : "";
    const confirm = passwordConfirm ? passwordConfirm.value.trim() : "";
    if (!current || !next || !confirm) {
      setPasswordStatus("Completa todos los campos.", "is-error");
      return;
    }
    if (next !== confirm) {
      setPasswordStatus("Las contrasenas no coinciden.", "is-error");
      return;
    }
    try {
      await fetchJson("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (passwordCurrent) passwordCurrent.value = "";
      if (passwordNew) passwordNew.value = "";
      if (passwordConfirm) passwordConfirm.value = "";
      setPasswordStatus("Contrasena actualizada.", "is-ok");
    } catch (error) {
      const message = error?.message || "No se pudo actualizar.";
      setPasswordStatus(message, "is-error");
    }
  });
}

function setStoreConfigStatus(text, state) {
  if (!cfgStoreMessage) return;
  cfgStoreMessage.textContent = text || "";
  cfgStoreMessage.classList.remove("is-error", "is-ok", "is-warn");
  if (state) {
    cfgStoreMessage.classList.add(state);
  }
}

function setShopifyWebhooksStatus(text, state) {
  if (!shopifyWebhooksStatus) return;
  shopifyWebhooksStatus.textContent = text || "";
  shopifyWebhooksStatus.classList.remove("is-error", "is-ok", "is-warn");
  if (state) {
    shopifyWebhooksStatus.classList.add(state);
  }
}

function setContactsSyncStatus(text, state) {
  if (!syncContactsStatus) return;
  syncContactsStatus.textContent = text || "";
  syncContactsStatus.classList.remove("is-error", "is-ok", "is-warn");
  if (state) {
    syncContactsStatus.classList.add(state);
  }
}

async function loadShopifyWebhooksStatus() {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!shopDomain) {
    setShopifyWebhooksStatus("Dominio Shopify requerido.", "is-error");
    return false;
  }
  setShopifyWebhooksStatus("Consultando estado...");
  try {
    const result = await fetchJson(
      `/api/shopify/webhooks/status?shopDomain=${encodeURIComponent(shopDomain)}`
    );
    const total = Number(result?.total || 0);
    const connected = Number(result?.connected || 0);
    const missing = Array.isArray(result?.missing) ? result.missing : [];
    if (!total) {
      setShopifyWebhooksStatus("Sin datos de automatizacion.", "is-error");
      return false;
    }
    if (!missing.length) {
      setShopifyWebhooksStatus(`Creado y conectado (${connected}/${total})`, "is-ok");
      return true;
    }
    setShopifyWebhooksStatus(`Faltan ${missing.length} (${connected}/${total})`, "is-error");
    return false;
  } catch (error) {
    setShopifyWebhooksStatus(error?.message || "No se pudo consultar.", "is-error");
    return false;
  }
}

async function createShopifyWebhooks() {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!shopDomain) {
    setShopifyWebhooksStatus("Dominio Shopify requerido.", "is-error");
    return;
  }
  setShopifyWebhooksStatus("Activando automatizacion...");
  try {
    const result = await fetchJson("/api/shopify/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain }),
    });
    const items = Array.isArray(result?.items) ? result.items : [];
    const okCount = items.filter((item) => item.ok).length;
    const total = items.length || 0;
    const statusText =
      total > 0 ? `Activados ${okCount}/${total}` : result?.message || "Automatizacion activada.";
    setShopifyWebhooksStatus(statusText, okCount === total ? "is-ok" : "is-error");
    await loadShopifyWebhooksStatus();
    advanceWizardStep("sync-orders");
  } catch (error) {
    setShopifyWebhooksStatus(error?.message || "No se pudieron crear.", "is-error");
  }
}

async function deleteShopifyWebhooks() {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!shopDomain) {
    setShopifyWebhooksStatus("Dominio Shopify requerido.", "is-error");
    return;
  }
  if (!window.confirm("Desactivar la automatizacion para esta tienda?")) {
    return;
  }
  setShopifyWebhooksStatus("Desactivando automatizacion...");
  try {
    const result = await fetchJson("/api/shopify/webhooks/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain }),
    });
    const deleted = Number(result?.deleted || 0);
    const total = Number(result?.total || 0);
    const statusText =
      total > 0 ? `Desactivados ${deleted}/${total}` : "Automatizacion desactivada.";
    setShopifyWebhooksStatus(statusText, deleted === total ? "is-ok" : "is-error");
    await loadShopifyWebhooksStatus();
  } catch (error) {
    setShopifyWebhooksStatus(error?.message || "No se pudieron eliminar.", "is-error");
  }
}

async function runSingleContactSync() {
  const identifier = syncContactIdentifier ? syncContactIdentifier.value.trim() : "";
  if (!identifier) {
    setContactsSyncStatus("Ingresa un email, telefono o documento.", "is-error");
    return;
  }
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!shopDomain) {
    setContactsSyncStatus("Dominio Shopify requerido.", "is-error");
    return;
  }
  const source = syncContactSource ? syncContactSource.value : "shopify";
  setContactsSyncStatus("Sincronizando...");
  try {
    const result = await fetchJson("/api/sync/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, identifier, shopDomain }),
    });
    if (result?.skipped) {
      setContactsSyncStatus("Sin cambios.");
    } else {
      setContactsSyncStatus("Contacto sincronizado.", "is-ok");
    }
  } catch (error) {
    setContactsSyncStatus(error?.message || "No se pudo sincronizar.", "is-error");
  }
}

async function runBulkContactSync(source) {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!shopDomain) {
    setContactsSyncStatus("Dominio Shopify requerido.", "is-error");
    return;
  }
  const limit = syncContactLimit ? Number(syncContactLimit.value || 0) : 0;
  setContactsSyncStatus("Sincronizando masivo...");
  try {
    const result = await fetchJson("/api/sync/contacts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, limit: limit || undefined, shopDomain }),
    });
    if (result?.skipped) {
      setContactsSyncStatus("Sin cambios.");
    } else {
      const total = Number(result?.total || 0);
      setContactsSyncStatus(`Sincronizados ${total}.`, "is-ok");
    }
  } catch (error) {
    setContactsSyncStatus(error?.message || "No se pudo sincronizar.", "is-error");
  }
}

async function saveStoreConfigFromSettings() {
  const domain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!domain) {
    throw new Error("Dominio Shopify requerido.");
  }
  const shopifyOrderMode = syncOrdersShopify ? syncOrdersShopify.value : "";
  const alegraOrderMode = syncOrdersAlegra ? syncOrdersAlegra.value : "";
  const matchPriorityKey = syncContactsPriority ? syncContactsPriority.value : "document_phone_email";
  const matchPriority = matchPriorityKey.split("_").filter(Boolean);
  let generateInvoiceValue = cfgGenerateInvoice ? cfgGenerateInvoice.checked : false;
  if (shopifyOrderMode === "contact_only" || shopifyOrderMode === "db_only" || shopifyOrderMode === "off") {
    generateInvoiceValue = false;
  }
  const payload = {
    transfers: {
      enabled: cfgTransferEnabled ? cfgTransferEnabled.checked : true,
      destinationWarehouseId: cfgTransferDest ? cfgTransferDest.value : "",
      priorityWarehouseId: cfgTransferPriority ? cfgTransferPriority.value : "",
      strategy: cfgTransferStrategy ? cfgTransferStrategy.value : "manual",
      fallbackStrategy: cfgTransferFallback ? cfgTransferFallback.value : "",
      tieBreakRule: cfgTransferTieBreak ? cfgTransferTieBreak.value : "",
      splitEnabled: cfgTransferSplit ? cfgTransferSplit.checked : false,
      minStock: cfgTransferMinStock
        ? Math.max(0, Number(cfgTransferMinStock.value || 0))
        : 0,
      originWarehouseIds: getSelectedTransferOriginIds(),
    },
    priceLists: {
      enabled: cfgPriceEnabled ? cfgPriceEnabled.checked !== false : true,
      generalId:
        cfgPriceEnabled && cfgPriceEnabled.checked === false
          ? ""
          : cfgPriceGeneral
            ? cfgPriceGeneral.value
            : "",
      discountId:
        cfgPriceEnabled && cfgPriceEnabled.checked === false
          ? ""
          : cfgPriceDiscount
            ? cfgPriceDiscount.value
            : "",
      wholesaleId:
        cfgPriceEnabled && cfgPriceEnabled.checked === false
          ? ""
          : cfgPriceWholesale
            ? cfgPriceWholesale.value
            : "",
      currency:
        cfgPriceEnabled && cfgPriceEnabled.checked === false
          ? ""
          : cfgPriceCurrency
            ? cfgPriceCurrency.value
            : "",
    },
    invoice: {
      generateInvoice: generateInvoiceValue,
      resolutionId: cfgResolution ? cfgResolution.value : "",
      costCenterId: cfgCostCenter ? cfgCostCenter.value : "",
      warehouseId: cfgWarehouse ? cfgWarehouse.value : "",
      sellerId: cfgSeller ? cfgSeller.value : "",
      paymentMethod: cfgPaymentMethod ? cfgPaymentMethod.value : "",
      bankAccountId: cfgBankAccount ? cfgBankAccount.value : "",
      applyPayment: cfgApplyPayment ? cfgApplyPayment.checked : false,
      observationsTemplate: cfgObservations ? cfgObservations.value : "",
      einvoiceEnabled: cfgEinvoiceEnabled ? cfgEinvoiceEnabled.checked : false,
    },
    rules: {
      publishOnStock: cfgInventoryPublishStock ? cfgInventoryPublishStock.checked : true,
      onlyActiveItems: rulesOnlyActive ? rulesOnlyActive.checked : false,
      autoPublishOnWebhook: rulesAutoPublish ? rulesAutoPublish.checked : false,
      autoPublishStatus:
        rulesAutoStatus && rulesAutoStatus.value === "active" ? "active" : "draft",
      includeImages: rulesAutoImages ? rulesAutoImages.checked !== false : true,
      syncEnabled: rulesSyncEnabled ? rulesSyncEnabled.checked : true,
      warehouseIds: getSelectedInventoryWarehouseIds(),
    },
    sync: {
      contacts: {
        fromShopify: syncContactsShopify ? syncContactsShopify.checked : true,
        fromAlegra: syncContactsAlegra ? syncContactsAlegra.checked : true,
        matchPriority,
      },
      orders: {
        shopifyToAlegra: shopifyOrderMode || "db_only",
        alegraToShopify: alegraOrderMode || "off",
      },
    },
  };
  await fetchJson(`/api/store-configs/${encodeURIComponent(domain)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function saveSettings(options = {}) {
  const includeRules = options.includeRules === true;
  const includeInvoice = options.includeInvoice === true;
  const includeAi = options.includeAi === true;
  const payload = {};
  const aiValue = aiKey ? aiKey.value.trim() : "";
  if (includeAi) {
    if (!aiValue) {
      throw new Error("Token de IA requerido.");
    }
    payload.ai = { apiKey: aiValue };
  } else if (aiValue) {
    payload.ai = { apiKey: aiValue };
  }
  if (includeInvoice) {
    payload.invoice = {
      generateInvoice: cfgGenerateInvoice ? cfgGenerateInvoice.checked : true,
      einvoiceEnabled: cfgEinvoiceEnabled ? cfgEinvoiceEnabled.checked : false,
      resolutionId: cfgResolution.value || "",
      costCenterId: cfgCostCenter.value || "",
      warehouseId: cfgWarehouse.value || "",
      sellerId: cfgSeller.value || "",
      paymentMethod: cfgPaymentMethod.value || "",
      bankAccountId: cfgBankAccount.value || "",
      applyPayment: cfgApplyPayment.checked,
      observationsTemplate: cfgObservations.value || "",
    };
  }
  if (includeRules) {
    const rulesPayload = {
      publishOnStock: inventoryRules.publishOnStock,
      onlyActiveItems: inventoryRules.onlyActiveItems,
      autoPublishOnWebhook: inventoryRules.autoPublishOnWebhook,
      autoPublishStatus: inventoryRules.autoPublishStatus,
      inventoryAdjustmentsEnabled: inventoryCronEnabled
        ? inventoryCronEnabled.checked
        : inventoryRules.inventoryAdjustmentsEnabled,
      inventoryAdjustmentsIntervalMinutes: inventoryCronIntervalSelect
        ? Number(inventoryCronIntervalSelect.value || inventoryRules.inventoryAdjustmentsIntervalMinutes || 5)
        : inventoryRules.inventoryAdjustmentsIntervalMinutes,
      inventoryAdjustmentsAutoPublish: cfgInventoryAutoPublish
        ? cfgInventoryAutoPublish.checked
        : inventoryRules.inventoryAdjustmentsAutoPublish !== false,
      warehouseIds: Array.isArray(inventoryRules.warehouseIds) ? inventoryRules.warehouseIds : [],
    };
    inventoryRules = { ...inventoryRules, ...rulesPayload };
    payload.rules = rulesPayload;
  }
  const alegraEmailValue = alegraEmail ? alegraEmail.value.trim() : "";
  const alegraKeyValue = alegraKey ? alegraKey.value.trim() : "";
  if (
    alegraAccountSelect &&
    alegraAccountSelect.value !== "new" &&
    (alegraEmailValue || alegraKeyValue)
  ) {
    throw new Error("No edites credenciales Alegra cuando usas una cuenta guardada.");
  }
  if (alegraEmailValue || alegraKeyValue) {
    payload.alegra = {
      email: alegraEmailValue,
      apiKey: alegraKeyValue,
      environment: alegraEnvSelect ? alegraEnvSelect.value : "prod",
    };
  }
  if (!Object.keys(payload).length) {
    return;
  }
  await fetchJson("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (aiKey) {
    aiKey.value = "";
  }
  await loadSettings();
  await loadResolutions();
  await Promise.all([
    loadCatalog(cfgCostCenter, "cost-centers"),
    loadCatalog(cfgWarehouse, "warehouses"),
    loadCatalog(cfgSeller, "sellers"),
    loadCatalog(cfgPaymentMethod, "payment-methods"),
    loadCatalog(cfgBankAccount, "bank-accounts"),
    loadCatalog(cfgTransferDest, "warehouses"),
    loadCatalog(cfgTransferPriority, "warehouses"),
    loadCatalog(cfgPriceGeneral, "price-lists"),
    loadCatalog(cfgPriceDiscount, "price-lists"),
    loadCatalog(cfgPriceWholesale, "price-lists"),
  ]);
}

async function testConnections() {
  if (statusLedShopify) {
    statusLedShopify.classList.remove("is-ok");
    statusLedShopify.classList.remove("is-off");
  }
  if (statusLedAlegra) {
    statusLedAlegra.classList.remove("is-ok");
    statusLedAlegra.classList.remove("is-off");
  }
  if (statusTextShopify) {
    statusTextShopify.textContent = "Verificando...";
  }
  if (statusTextAlegra) {
    statusTextAlegra.textContent = "Verificando...";
  }
  try {
    const payload = {
      shopify: {
        shopDomain: shopifyDomain ? shopifyDomain.value : "",
        accessToken: shopifyToken ? shopifyToken.value : "",
      },
      alegra: {
        email: alegraEmail.value,
        apiKey: alegraKey.value,
        environment: alegraEnvSelect ? alegraEnvSelect.value : "prod",
      },
    };
    const result = await fetchJson("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (String(result.shopify || "").startsWith("ok")) {
      if (statusLedShopify) {
        statusLedShopify.classList.add("is-ok");
        statusLedShopify.classList.remove("is-off");
      }
      if (statusTextShopify) statusTextShopify.textContent = "Activo";
    } else {
      if (statusLedShopify) statusLedShopify.classList.add("is-off");
      if (statusTextShopify) statusTextShopify.textContent = String(result.shopify || "Error");
    }
    if (String(result.alegra || "").startsWith("ok")) {
      if (statusLedAlegra) {
        statusLedAlegra.classList.add("is-ok");
        statusLedAlegra.classList.remove("is-off");
      }
      if (statusTextAlegra) statusTextAlegra.textContent = "Activo";
    } else {
      if (statusLedAlegra) statusLedAlegra.classList.add("is-off");
      if (statusTextAlegra) statusTextAlegra.textContent = String(result.alegra || "Error");
    }
    setMetricsStatusPills(String(result.shopify || "").startsWith("ok"), String(result.alegra || "").startsWith("ok"));
  } catch {
    if (statusTextShopify) statusTextShopify.textContent = "Error de red";
    if (statusTextAlegra) statusTextAlegra.textContent = "Error de red";
    setMetricsStatusPills(false, false);
  }
}

async function testShopifyConnection() {
  if (statusLedShopify) {
    statusLedShopify.classList.remove("is-ok");
    statusLedShopify.classList.remove("is-off");
  }
  if (statusTextShopify) {
    statusTextShopify.textContent = "Verificando...";
  }
  try {
    const payload = {
      shopify: {
        shopDomain: shopifyDomain ? shopifyDomain.value : "",
        accessToken: shopifyToken ? shopifyToken.value : "",
      },
    };
    const result = await fetchJson("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (String(result.shopify || "").startsWith("ok")) {
      if (statusLedShopify) {
        statusLedShopify.classList.add("is-ok");
        statusLedShopify.classList.remove("is-off");
      }
      if (statusTextShopify) statusTextShopify.textContent = "Activo";
      setMetricsStatusPills(true, Boolean(statusLedAlegra?.classList.contains("is-ok")));
    } else {
      if (statusLedShopify) statusLedShopify.classList.add("is-off");
      if (statusTextShopify) statusTextShopify.textContent = String(result.shopify || "Error");
      setMetricsStatusPills(false, Boolean(statusLedAlegra?.classList.contains("is-ok")));
    }
  } catch {
    if (statusTextShopify) statusTextShopify.textContent = "Error de red";
    setMetricsStatusPills(false, Boolean(statusLedAlegra?.classList.contains("is-ok")));
  }
}

async function testAlegraConnection() {
  if (statusLedAlegra) {
    statusLedAlegra.classList.remove("is-ok");
    statusLedAlegra.classList.remove("is-off");
  }
  if (statusTextAlegra) {
    statusTextAlegra.textContent = "Verificando...";
  }
  try {
    const payload = {
      alegra: {
        email: alegraEmail.value,
        apiKey: alegraKey.value,
        environment: alegraEnvSelect ? alegraEnvSelect.value : "prod",
      },
    };
    const result = await fetchJson("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (String(result.alegra || "").startsWith("ok")) {
      if (statusLedAlegra) {
        statusLedAlegra.classList.add("is-ok");
        statusLedAlegra.classList.remove("is-off");
      }
      if (statusTextAlegra) statusTextAlegra.textContent = "Activo";
      setMetricsStatusPills(Boolean(statusLedShopify?.classList.contains("is-ok")), true);
    } else {
      if (statusLedAlegra) statusLedAlegra.classList.add("is-off");
      if (statusTextAlegra) statusTextAlegra.textContent = String(result.alegra || "Error");
      setMetricsStatusPills(Boolean(statusLedShopify?.classList.contains("is-ok")), false);
    }
  } catch {
    if (statusTextAlegra) statusTextAlegra.textContent = "Error de red";
    setMetricsStatusPills(Boolean(statusLedShopify?.classList.contains("is-ok")), false);
  }
}

async function saveCredentials(kind) {
  const payload = {};
  if (kind === "alegra") {
    if (alegraAccountSelect && alegraAccountSelect.value !== "new") {
      return;
    }
    const email = alegraEmail ? alegraEmail.value.trim() : "";
    const apiKey = alegraKey ? alegraKey.value.trim() : "";
    if (email || apiKey) {
      payload.alegra = {
        email,
        apiKey,
        environment: alegraEnvSelect ? alegraEnvSelect.value : "prod",
      };
    }
  }
  if (!Object.keys(payload).length) return;
  await fetchJson("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function clearConnectionForm() {
  if (storeNameInput) storeNameInput.value = "";
  if (shopifyDomain) shopifyDomain.value = "";
  if (shopifyToken) shopifyToken.value = "";
  if (copyConfigSelect) copyConfigSelect.value = "";
  if (alegraEmail) alegraEmail.value = "";
  if (alegraKey) alegraKey.value = "";
  if (alegraAccountSelect) alegraAccountSelect.value = "new";
  if (alegraEnvSelect) alegraEnvSelect.value = "prod";
  toggleAlegraAccountFields();
}

async function connectShopifyWithToken(params) {
  const tokenValue = shopifyToken ? shopifyToken.value.trim() : "";
  if (!tokenValue) {
    throw new Error("Clave de acceso de Shopify requerida.");
  }
  const response = await fetchJson("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeName: params.storeName || "",
      shopify: {
        shopDomain: params.shopDomain,
        accessToken: tokenValue,
      },
    }),
  });
  if (shopifyToken) shopifyToken.value = "";
  showToast("Shopify conectado.", "is-ok");
  setConnectionsSetupOpen(true);
  setSettingsPane("connections", { persist: false });
  await loadConnections();
  updateConnectionPills();
  return response;
}

async function startShopifyOAuthFlow() {
  clearPendingConfigCopy();
  if (!validateInitialConnection("shopify")) {
    throw new Error("Completa los campos obligatorios.");
  }
  const shopDomainValue = shopifyDomain?.value.trim() || activeStoreDomain || "";
  const normalizedActive = normalizeShopDomain(activeStoreDomain || "");
  const normalizedInput = normalizeShopDomain(shopDomainValue || "");
  const sameStore = normalizedActive && normalizedActive === normalizedInput;
  const resolvedStoreName =
    (storeNameInput ? storeNameInput.value.trim() : "") ||
    (sameStore ? activeStoreName : "") ||
    "";
  if (!normalizedInput) {
    throw new Error("Dominio Shopify requerido");
  }
  const method = getShopifyConnectMethod();
  if (method === "token") {
    await connectShopifyWithToken({
      shopDomain: normalizedInput,
      storeName: resolvedStoreName,
    });
    return;
  }
  if (shopifyToken) {
    shopifyToken.value = "";
  }
  const params = new URLSearchParams({ shop: normalizedInput });
  if (resolvedStoreName) {
    params.set("storeName", resolvedStoreName);
  }
  const copyFrom = normalizeShopDomain(copyConfigSelect?.value || "");
  if (copyFrom && copyFrom !== normalizedInput) {
    savePendingConfigCopy(copyFrom, normalizedInput);
  }
  window.location.href = `/api/auth/shopify?${params.toString()}`;
}

async function connectStore(kind) {
  if (!validateInitialConnection(kind)) {
    throw new Error("Completa los campos obligatorios.");
  }
  const storeName = storeNameInput ? storeNameInput.value.trim() : "";
  const shopDomainValue = shopifyDomain?.value.trim() || activeStoreDomain || "";
  const normalizedActive = normalizeShopDomain(activeStoreDomain || "");
  const normalizedInput = normalizeShopDomain(shopDomainValue || "");
  const sameStore = normalizedActive && normalizedActive === normalizedInput;
  const resolvedStoreName = storeName || (sameStore ? activeStoreName : "") || "";
  if (!shopDomainValue) {
    throw new Error("Dominio Shopify requerido");
  }
  const payload = {
    storeName: resolvedStoreName,
    shopify: {
      shopDomain: normalizedInput || shopDomainValue,
    },
  };
  if (kind === "alegra") {
    payload.alegra = {};
    if (alegraAccountSelect && alegraAccountSelect.value !== "new") {
      payload.alegra.accountId = Number(alegraAccountSelect.value);
      const apiKey = alegraKey ? alegraKey.value.trim() : "";
      if (apiKey) {
        payload.alegra.apiKey = apiKey;
      }
    } else {
      const email = alegraEmail ? alegraEmail.value.trim() : "";
      const apiKey = alegraKey ? alegraKey.value.trim() : "";
      if (!email || !apiKey) {
        throw new Error("Credenciales Alegra requeridas");
      }
      payload.alegra.email = email;
      payload.alegra.apiKey = apiKey;
      payload.alegra.environment = alegraEnvSelect ? alegraEnvSelect.value : "prod";
    }
  }
  const response = await fetchJson("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response?.created?.isNew) {
    setWizardState({
      shopDomain: response.created.shopDomain,
      step: 0,
      startedAt: Date.now(),
    });
    try {
      localStorage.setItem("apiflujos-active-store", response.created.shopDomain);
    } catch {
      // ignore storage errors
    }
  }
  if (kind === "alegra") {
    try {
      await saveCredentials(kind);
    } catch (error) {
      showToast(
        error?.message || "Alegra conectado, pero no se pudo guardar credenciales auxiliares.",
        "is-warn"
      );
    }
  }
  clearConnectionForm();
  setConnectionsSetupOpen(true);
  setSettingsPane("connections", { persist: false });
  await loadConnections();
  try {
    await loadSettings();
  } catch (error) {
    showToast(error?.message || "Conexion guardada, pero no se pudieron cargar las configuraciones.", "is-warn");
  }
  updateConnectionPills();
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    const originalText = refreshButton.textContent;
    refreshButton.textContent = "Actualizando...";
    refreshButton.disabled = true;
    Promise.allSettled([loadLogs(), loadMetrics(), loadOperations()])
      .catch(() => null)
      .finally(() => {
        refreshButton.textContent = originalText || "Actualizar";
        refreshButton.disabled = false;
      });
  });
}
if (metricsRange) {
  metricsRange.addEventListener("change", () => {
    loadMetrics().catch(() => null);
  });
}
if (assistantInput) {
  assistantInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.ctrlKey) {
      event.preventDefault();
      sendAssistantMessage();
    }
  });
}
if (assistantSend) {
  assistantSend.addEventListener("click", sendAssistantMessage);
}
if (assistantLaunch && assistantDrawer) {
  const openDrawer = () => {
    assistantDrawer.classList.add("is-open");
    assistantDrawer.setAttribute("aria-hidden", "false");
  };
  const closeDrawer = () => {
    assistantDrawer.classList.remove("is-open");
    assistantDrawer.setAttribute("aria-hidden", "true");
  };
  assistantLaunch.addEventListener("click", openDrawer);
  if (assistantClose) {
    assistantClose.addEventListener("click", closeDrawer);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
    }
  });
}
if (assistantAttach && assistantFileInput) {
  assistantFileInput.addEventListener("change", () => {
    const files = Array.from(assistantFileInput.files || []);
    const mapped = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    assistantFiles = assistantFiles.concat(mapped).slice(0, 5);
    assistantFileInput.value = "";
    renderAssistantAttachments();
  });
}
if (logFilter) {
  logFilter.addEventListener("click", loadLogs);
}
if (logRetry) {
  logRetry.addEventListener("click", retryFailed);
}
if (alegraAccountSelect) {
  alegraAccountSelect.addEventListener("change", toggleAlegraAccountFields);
}
	  if (storeActiveSelect) {
	    storeActiveSelect.addEventListener("change", () => {
      const nextDomain = storeActiveSelect.value || "";
      activeStoreDomain = nextDomain;
      activeStoreName =
        storesCache.find((store) => store.shopDomain === nextDomain)?.storeName || "";
    if (storeNameInput) {
      storeNameInput.placeholder = getActiveStoreLabel() || "Tienda de ejemplo";
    }
    shopifyAdminBase = nextDomain ? `https://${nextDomain}/admin` : "";
    try {
      localStorage.setItem("apiflujos-active-store", nextDomain);
    } catch {
      // ignore storage errors
    }
	      updateStoreModuleTitles();
	      renderConnections({ stores: storesCache });
	      renderStoreContextSelects(storesCache);
	      setShopifyWebhooksStatus("Sin configurar");
	      const activePane =
	        document.querySelector("[data-settings-pane].is-active")?.getAttribute("data-settings-pane") || "";
	      const keepConnectionsOpen = activePane === "connections" || getModulePanel("connections")?.getAttribute("data-setup-open") === "1";
	      collapseAllGroupsAndModules();
	      openDefaultGroups();
	      if (keepConnectionsOpen) {
	        const panel = getModulePanel("connections");
	        if (panel) setModuleCollapsed(panel, false);
	        const summary = getModulePanel("connections-summary");
	        if (summary) setModuleCollapsed(summary, false);
	        setConnectionsSetupOpen(true);
	      }
	      loadLegacyStoreConfig().catch(() => null);
	      openWizardStep();
	      updateConnectionPills();
	      loadProducts().catch(() => null);
	      loadOperations().catch(() => null);
	      loadContacts().catch(() => null);
	    });
	  }

  const bindStoreContextSelect = (select) => {
    if (!select || !storeActiveSelect) return;
    select.addEventListener("change", () => {
      const nextDomain = select.value || "";
      if (!nextDomain || storeActiveSelect.value === nextDomain) return;
      storeActiveSelect.value = nextDomain;
      storeActiveSelect.dispatchEvent(new Event("change"));
    });
  };
  bindStoreContextSelect(ordersStoreSelect);
  bindStoreContextSelect(productsStoreSelect);
  bindStoreContextSelect(contactsStoreSelect);

	if (connectShopify) {
	  connectShopify.addEventListener("click", async () => {
	    try {
	      setButtonLoading(connectShopify, true, "Conectando...");
	      await startShopifyOAuthFlow();
	    } catch (error) {
	      showToast(error?.message || "No se pudo conectar Shopify.", "is-error");
	    } finally {
	      setButtonLoading(connectShopify, false);
	    }
	  });
	}
if (connectAlegra) {
  connectAlegra.addEventListener("click", () => {
    setButtonLoading(connectAlegra, true, "Conectando...");
    connectStore("alegra")
      .then(() => {
        showToast("Alegra conectado.", "is-ok");
      })
      .catch((error) => {
        showToast(error?.message || "No se pudo conectar Alegra.", "is-error");
      })
      .finally(() => {
        setButtonLoading(connectAlegra, false);
      });
  });
}
if (connectionsGrid) {
  connectionsGrid.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.connectionRemove;
    if (!id) return;
    const storeId = Number(id);
    const store = storesCache.find((item) => Number(item?.id) === storeId);
    const storeLabel = store?.storeName || store?.shopDomain || "esta tienda";
    if (!confirm(`Eliminar la tienda "${storeLabel}"?\nEsto desconecta Shopify y Alegra.`)) return;
    const purgeData = confirm(
      `Borrar tambien los datos sincronizados de "${storeLabel}"?\nIncluye productos, pedidos y contactos de esta tienda.`
    );
    const suffix = purgeData ? "?purgeData=1" : "";
    showToast(purgeData ? "Eliminando tienda y data..." : "Eliminando tienda...", "is-warn");
    fetchJson(`/api/connections/${storeId}${suffix}`, { method: "DELETE" })
      .then(() => {
        showToast(purgeData ? "Tienda y data eliminadas." : "Tienda eliminada.", "is-ok");
        return loadConnections();
      })
      .catch((error) => {
        showToast(error?.message || "No se pudo eliminar.", "is-error");
      });
  });
}

if (storeDelete) {
  storeDelete.addEventListener("click", () => {
    const domain = normalizeShopDomain(activeStoreDomain || storeActiveSelect?.value || "");
    if (!domain) {
      showToast("No hay tienda activa para eliminar.", "is-warn");
      return;
    }
    const store = storesCache.find((item) => normalizeShopDomain(item?.shopDomain || "") === domain);
    const storeId = Number(store?.id);
    const storeLabel = store?.storeName || store?.shopDomain || domain;
    if (!Number.isFinite(storeId)) {
      showToast("No se pudo resolver el ID de la tienda.", "is-error");
      return;
    }
    if (!confirm(`Eliminar la tienda "${storeLabel}"?\nEsto desconecta Shopify y Alegra.`)) return;
    const purgeData = confirm(
      `Borrar tambien los datos sincronizados de "${storeLabel}"?\nIncluye productos, pedidos y contactos de esta tienda.`
    );
    const suffix = purgeData ? "?purgeData=1" : "";
    showToast(purgeData ? "Eliminando tienda y data..." : "Eliminando tienda...", "is-warn");
    fetchJson(`/api/connections/${storeId}${suffix}`, { method: "DELETE" })
      .then(() => {
        showToast(purgeData ? "Tienda y data eliminadas." : "Tienda eliminada.", "is-ok");
        return loadConnections();
      })
      .catch((error) => {
        showToast(error?.message || "No se pudo eliminar.", "is-error");
      });
  });
}
if (cfgWarehouseSync) {
  cfgWarehouseSync.addEventListener("change", (event) => {
    const selectAllInput = cfgWarehouseSync.querySelector("input[data-select-all]");
    if (selectAllInput && event?.target === selectAllInput) {
      const nextChecked = selectAllInput.checked;
      cfgWarehouseSync.querySelectorAll("input[data-warehouse-id]").forEach((input) => {
        input.checked = nextChecked;
      });
    } else if (selectAllInput) {
      const total = cfgWarehouseSync.querySelectorAll("input[data-warehouse-id]").length;
      const selected = Array.from(
        cfgWarehouseSync.querySelectorAll("input[data-warehouse-id]")
      ).filter((input) => input.checked).length;
      selectAllInput.checked = selected === 0 || selected === total;
    }
    updateSyncWarehouseSummary();
    refreshProductSettingsFromInputs();
  });
}
if (cfgInventoryWarehouses) {
  cfgInventoryWarehouses.addEventListener("change", (event) => {
    const selectAllInput = cfgInventoryWarehouses.querySelector("input[data-select-all]");
    if (selectAllInput && event?.target === selectAllInput) {
      const nextChecked = selectAllInput.checked;
      cfgInventoryWarehouses
        .querySelectorAll("input[data-warehouse-id]")
        .forEach((input) => {
          input.checked = nextChecked;
        });
    } else if (selectAllInput) {
      const total = cfgInventoryWarehouses.querySelectorAll("input[data-warehouse-id]").length;
      const selected = Array.from(
        cfgInventoryWarehouses.querySelectorAll("input[data-warehouse-id]")
      ).filter((input) => input.checked).length;
      selectAllInput.checked = selected === 0 || selected === total;
    }
    updateInventoryWarehouseSummary();
  });
}
if (cfgTransferOrigin) {
  cfgTransferOrigin.addEventListener("change", (event) => {
    const selectAllInput = cfgTransferOrigin.querySelector("input[data-select-all]");
    if (selectAllInput && event?.target === selectAllInput) {
      const nextChecked = selectAllInput.checked;
      cfgTransferOrigin.querySelectorAll("input[data-warehouse-id]").forEach((input) => {
        input.checked = nextChecked;
      });
    } else if (selectAllInput) {
      const total = cfgTransferOrigin.querySelectorAll("input[data-warehouse-id]").length;
      const selected = Array.from(
        cfgTransferOrigin.querySelectorAll("input[data-warehouse-id]")
      ).filter((input) => input.checked).length;
      selectAllInput.checked = selected === 0 || selected === total;
    }
    transferOriginIds = getSelectedTransferOriginIds();
    updateTransferOriginSummary();
    if (transferOriginIds.length) {
      const target = cfgTransferOriginField || cfgTransferOrigin;
      clearFieldError(target);
    }
  });
}
if (cfgTransferStrategy) {
  cfgTransferStrategy.addEventListener("change", () => {
    updateTransferOriginState();
    clearTransferErrors();
  });
}
if (cfgTransferFallback) {
  cfgTransferFallback.addEventListener("change", () => {
    updateTransferOriginState();
    clearTransferErrors();
  });
}
if (cfgTransferEnabled) {
  cfgTransferEnabled.addEventListener("change", () => {
    updateTransferOriginState();
    if (!cfgTransferEnabled.checked) {
      clearTransferErrors();
    }
  });
}
if (cfgPriceEnabled) {
  cfgPriceEnabled.addEventListener("change", () => {
    updatePriceListState();
  });
}
if (cfgGenerateInvoice) {
  cfgGenerateInvoice.addEventListener("change", () => {
    if (!cfgGenerateInvoice.checked) {
      clearInvoiceErrors();
    }
  });
}
if (cfgEinvoiceEnabled) {
  cfgEinvoiceEnabled.addEventListener("change", () => {
    clearFieldWarning(cfgEinvoiceEnabled);
  });
}
  if (cfgApplyPayment) {
    cfgApplyPayment.addEventListener("change", () => {
      if (!cfgApplyPayment.checked) {
        clearFieldError(cfgPaymentMethod);
        clearFieldError(cfgBankAccount);
        clearFieldWarning(cfgApplyPayment);
      } else {
        clearFieldWarning(cfgApplyPayment);
      }
    });
  }
if (profileSave) {
  profileSave.addEventListener("click", () => {
    saveProfile();
  });
}
if (profilePhoto) {
  profilePhoto.addEventListener("change", async () => {
    try {
      const file = profilePhoto.files && profilePhoto.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("La foto supera 2MB.");
      }
      const preview = await readFileAsDataUrl(file);
      if (userAvatar) userAvatar.src = preview;
    } catch (error) {
      if (profileMessage) {
        profileMessage.textContent = error?.message || "No se pudo cargar la foto.";
      }
    }
  });
}
if (companySave) {
  companySave.addEventListener("click", () => {
    saveCompany();
  });
}
if (companyLogoInput) {
  companyLogoInput.addEventListener("change", async () => {
    try {
      const file = companyLogoInput.files && companyLogoInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("El logo supera 2MB.");
      }
      const preview = await readFileAsDataUrl(file);
      if (companyLogo) companyLogo.src = preview;
    } catch (error) {
      if (companyMessage) {
        companyMessage.textContent = error?.message || "No se pudo cargar el logo.";
      }
    }
  });
}
if (userCreate) {
  userCreate.addEventListener("click", () => {
    createUserFromForm();
  });
}
if (userMenuToggle) {
  userMenuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleUserMenu();
  });
}
  if (userMenu) {
    userMenu.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest("button") : null;
      if (!target) return;
      const action = target.getAttribute("data-user-action");
      toggleUserMenu(false);
    if (action === "profile") {
      openPanelInSection("profile", "profile-panel");
      return;
    }
    if (action === "company") {
      window.location.href = "/company.html";
      return;
    }
    if (action === "users") {
      window.location.href = "/users.html";
      return;
    }
      if (action === "logout") {
        fetch("/api/auth/logout", { method: "POST" })
          .catch(() => null)
          .finally(() => {
            window.location.href = "/login.html";
          });
      }
    });
  }
document.addEventListener("click", (event) => {
  if (!userMenu || !userMenuToggle) return;
  if (event.target instanceof HTMLElement && event.target.closest("#topbar-user")) {
    return;
  }
  toggleUserMenu(false);
});
if (opsSearchBtn) {
  opsSearchBtn.addEventListener("click", () => {
    ordersStart = 0;
    loadOperations();
  });
}

if (productsSearchBtn) {
  productsSearchBtn.addEventListener("click", () => {
    productsQuery = productsSearchInput ? productsSearchInput.value.trim() : "";
    productsStart = 0;
    loadProducts();
  });
}

if (productsSearchInput) {
  productsSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      productsQuery = productsSearchInput.value.trim();
      productsStart = 0;
      loadProducts();
    }
  });
}

if (productsRefreshBtn) {
  productsRefreshBtn.addEventListener("click", () => {
    productsQuery = productsSearchInput ? productsSearchInput.value.trim() : "";
    productsStart = 0;
    loadProducts();
  });
}

if (productsWarehouseFilter) {
  productsWarehouseFilter.addEventListener("change", (event) => {
    const selectAllInput = productsWarehouseFilter.querySelector("input[data-select-all]");
    if (selectAllInput && event?.target === selectAllInput) {
      const nextChecked = selectAllInput.checked;
      productsWarehouseFilter.querySelectorAll("input[data-warehouse-id]").forEach((input) => {
        input.checked = nextChecked;
      });
    } else if (selectAllInput) {
      const total = productsWarehouseFilter.querySelectorAll("input[data-warehouse-id]").length;
      const selected = Array.from(
        productsWarehouseFilter.querySelectorAll("input[data-warehouse-id]")
      ).filter((input) => input.checked).length;
      selectAllInput.checked = selected === 0 || selected === total;
    }
    updateProductsWarehouseSummary();
    productsStart = 0;
    refreshProductSettingsFromInputs();
    renderProducts();
  });
}

if (productsInStockOnly) {
  productsInStockOnly.addEventListener("change", () => {
    productsStart = 0;
    refreshProductSettingsFromInputs();
    renderProducts();
  });
}

if (productsStatusFilter) {
  productsStatusFilter.addEventListener("change", () => {
    productsStart = 0;
    refreshProductSettingsFromInputs();
    renderProducts();
  });
}

  if (productsLimitInput) {
    productsLimitInput.addEventListener("change", () => {
      const nextLimit = clampProductsLimit(Number(productsLimitInput.value || 30));
      productsLimitInput.value = String(nextLimit);
      productsStart = 0;
      refreshProductSettingsFromInputs();
      loadProducts();
    });
  }

if (productsPrevBtn) {
  productsPrevBtn.addEventListener("click", () => {
      const limit = productsLimitInput ? Number(productsLimitInput.value) : 20;
    productsStart = Math.max(0, productsStart - limit);
    loadProducts();
  });
}

if (productsNextBtn) {
  productsNextBtn.addEventListener("click", () => {
    const limit = productsLimitInput ? Number(productsLimitInput.value) : 20;
    const maxStart = productsTotal ? Math.max(0, (Math.ceil(productsTotal / limit) - 1) * limit) : productsStart + limit;
    productsStart = Math.min(productsStart + limit, maxStart);
    loadProducts();
  });
}

if (productsPageGo) {
  productsPageGo.addEventListener("click", () => {
    const limit = productsLimitInput ? Number(productsLimitInput.value) : 20;
    const totalPages = productsTotal ? Math.max(1, Math.ceil(productsTotal / limit)) : 1;
    const target = productsPageInput ? Number(productsPageInput.value) : 1;
    const page = Math.min(Math.max(1, target || 1), totalPages);
    productsStart = (page - 1) * limit;
    loadProducts();
  });
}

if (productsPageInput) {
  productsPageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && productsPageGo) {
      event.preventDefault();
      productsPageGo.click();
    }
  });
}

if (productsSyncFilteredBtn) {
  productsSyncFilteredBtn.addEventListener("click", () => runProductsSync("filtered"));
}

if (productsSyncIncludeInventory) {
  productsSyncIncludeInventory.addEventListener("change", () => {
    updateSyncWarehouseState();
  });
}

if (productsSyncStopBtn) {
  setProductsBulkSyncRunning(false);
  productsSyncStopBtn.addEventListener("click", async () => {
    try {
      productsSyncStopBtn.disabled = true;
      await fetchJson("/api/sync/products/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncId: activeProductsSyncId || null }),
      });
      setProductsStatus("Cancelando sincronizacion...");
      if (productsSyncStatus) {
        productsSyncStatus.textContent = "Cancelando...";
      }
    } catch (error) {
      productsSyncStopBtn.disabled = false;
      const message = error?.message || "No se pudo detener la sincronizacion.";
      setProductsStatus(message);
      if (productsSyncStatus) {
        productsSyncStatus.textContent = message;
      }
    }
  });
}

if (shopifyWebhooksCreate) {
  shopifyWebhooksCreate.addEventListener("click", () => {
    createShopifyWebhooks();
  });
}

if (qaTokenGenerate) {
  qaTokenGenerate.addEventListener("click", async () => {
    qaTokenGenerate.disabled = true;
    if (qaTokenHint) {
      qaTokenHint.textContent = "Generando clave...";
    }
    try {
      const result = await fetchJson("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlMinutes: 30 }),
      });
      if (qaTokenValue) {
        qaTokenValue.value = result?.token || "";
      }
      if (qaTokenHint) {
        const expiresAt = result?.expiresAt ? new Date(result.expiresAt) : null;
        qaTokenHint.textContent = expiresAt
          ? `Vence: ${expiresAt.toLocaleString()}`
          : "Clave generada.";
      }
    } catch (error) {
      if (qaTokenHint) {
        qaTokenHint.textContent =
          (error && error.message) || "No se pudo generar la clave.";
      }
      showToast(error?.message || "No se pudo generar la clave.", "is-error");
    } finally {
      qaTokenGenerate.disabled = false;
    }
  });
}

if (qaTokenCopy) {
  qaTokenCopy.addEventListener("click", async () => {
    if (!qaTokenValue || !qaTokenValue.value) {
      showToast("Primero genera una clave.", "is-warn");
      return;
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(qaTokenValue.value);
      copied = true;
    } catch {
      try {
        qaTokenValue.select();
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
    }
    showToast(copied ? "Clave copiada." : "No se pudo copiar.", copied ? "is-ok" : "is-error");
  });
}
if (shopifyWebhooksDelete) {
  shopifyWebhooksDelete.addEventListener("click", () => {
    deleteShopifyWebhooks();
  });
}
if (shopifyWebhooksStatusBtn) {
  shopifyWebhooksStatusBtn.addEventListener("click", () => {
    loadShopifyWebhooksStatus();
  });
}

if (syncContactRun) {
  syncContactRun.addEventListener("click", () => {
    runSingleContactSync();
  });
}

if (syncContactsShopifyRun) {
  syncContactsShopifyRun.addEventListener("click", () => {
    runBulkContactSync("shopify");
  });
}

if (syncContactsAlegraRun) {
  syncContactsAlegraRun.addEventListener("click", () => {
    runBulkContactSync("alegra");
  });
}

if (ordersSyncBtn) {
  ordersSyncBtn.addEventListener("click", runOrdersSync);
}

if (ordersSyncClear) {
  ordersSyncClear.addEventListener("click", () => {
    if (ordersDateStart) ordersDateStart.value = "";
    if (ordersDateEnd) ordersDateEnd.value = "";
    if (ordersSyncNumber) ordersSyncNumber.value = "";
    refreshProductSettingsFromInputs();
  });
}

if (ordersLimit) {
  ordersLimit.addEventListener("change", () => {
    ordersStart = 0;
    refreshProductSettingsFromInputs();
    loadOperations();
  });
}

if (ordersDateFilter) {
  ordersDateFilter.addEventListener("change", () => {
    ordersStart = 0;
    refreshProductSettingsFromInputs();
    loadOperations();
  });
}

if (ordersDaysSelect) {
  ordersDaysSelect.addEventListener("change", () => {
    ordersStart = 0;
    refreshProductSettingsFromInputs();
    loadOperations();
  });
}

if (ordersSort) {
  ordersSort.addEventListener("change", () => {
    ordersStart = 0;
    refreshProductSettingsFromInputs();
    loadOperations();
  });
}

if (opsSearch) {
  let opsSearchTimer;
  opsSearch.addEventListener("input", () => {
    if (opsSearchTimer) clearTimeout(opsSearchTimer);
    opsSearchTimer = setTimeout(() => {
      ordersStart = 0;
      refreshProductSettingsFromInputs();
      loadOperations();
    }, 400);
  });
}

if (ordersPrevBtn) {
  ordersPrevBtn.addEventListener("click", () => {
    const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;
    ordersStart = Math.max(0, ordersStart - pageSize);
    loadOperations();
  });
}

if (ordersNextBtn) {
  ordersNextBtn.addEventListener("click", () => {
    const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;
    const maxStart = ordersTotal ? Math.max(0, (Math.ceil(ordersTotal / pageSize) - 1) * pageSize) : ordersStart + pageSize;
    ordersStart = Math.min(ordersStart + pageSize, maxStart);
    loadOperations();
  });
}

if (ordersPageGo) {
  ordersPageGo.addEventListener("click", () => {
    const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;
    const totalPages = ordersTotal ? Math.max(1, Math.ceil(ordersTotal / pageSize)) : 1;
    const target = ordersPageInput ? Number(ordersPageInput.value) : 1;
    const page = Math.min(Math.max(1, target || 1), totalPages);
    ordersStart = (page - 1) * pageSize;
    loadOperations();
  });
}

if (ordersPageInput) {
  ordersPageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && ordersPageGo) {
      event.preventDefault();
      ordersPageGo.click();
    }
  });
}

if (contactsSearchBtn) {
  contactsSearchBtn.addEventListener("click", () => {
    contactsStart = 0;
    loadContacts();
  });
}

if (contactsRefreshBtn) {
  contactsRefreshBtn.addEventListener("click", () => {
    loadContacts();
  });
}

if (contactsClearBtn) {
  contactsClearBtn.addEventListener("click", () => {
    if (contactsSearch) contactsSearch.value = "";
    if (contactsDateStart) contactsDateStart.value = "";
    if (contactsDateEnd) contactsDateEnd.value = "";
    if (contactsStatusFilter) contactsStatusFilter.value = "";
    if (contactsSourceFilter) contactsSourceFilter.value = "";
    contactsStart = 0;
    loadContacts();
  });
}

if (contactsLimitInput) {
  contactsLimitInput.addEventListener("change", () => {
    contactsStart = 0;
    loadContacts();
  });
}

if (contactsPrevBtn) {
  contactsPrevBtn.addEventListener("click", () => {
    const limit = normalizeContactsLimit();
    contactsStart = Math.max(0, contactsStart - limit);
    loadContacts();
  });
}

if (contactsNextBtn) {
  contactsNextBtn.addEventListener("click", () => {
    const limit = normalizeContactsLimit();
    contactsStart = contactsStart + limit;
    loadContacts();
  });
}

if (contactsPageGo) {
  contactsPageGo.addEventListener("click", () => {
    const limit = normalizeContactsLimit();
    const page = contactsPageInput ? Number(contactsPageInput.value) : 1;
    const target = Number.isFinite(page) && page > 0 ? page : 1;
    contactsStart = (target - 1) * limit;
    loadContacts();
  });
}

if (ordersRefreshBtn) {
  ordersRefreshBtn.addEventListener("click", () => {
    ordersStart = 0;
    loadOperations();
  });
}

if (ordersClearBtn) {
  ordersClearBtn.addEventListener("click", () => {
    if (opsSearch) opsSearch.value = "";
    if (ordersDateStart) ordersDateStart.value = "";
    if (ordersDateEnd) ordersDateEnd.value = "";
    if (ordersLimit) ordersLimit.value = "";
    if (ordersDateFilter) ordersDateFilter.value = "";
    if (ordersDaysSelect) ordersDaysSelect.value = "30";
    if (ordersSort) ordersSort.value = "date_desc";
    ordersStart = 0;
    refreshProductSettingsFromInputs();
    loadOperations();
  });
}

	if (productsClearBtn) {
	  productsClearBtn.addEventListener("click", () => {
	    if (productsSearchInput) productsSearchInput.value = "";
	    if (productsDateStart) productsDateStart.value = "";
	    if (productsDateEnd) productsDateEnd.value = "";
	    if (productsSyncQuery) productsSyncQuery.value = "";
	    if (productsLimitInput) productsLimitInput.value = "30";
    if (productsDateFilter) productsDateFilter.value = "";
    if (productsSort) productsSort.value = "date_desc";
    if (productsInStockOnly) productsInStockOnly.checked = false;
    if (productsStatusFilter) productsStatusFilter.value = "all";
    if (productsWarehouseFilter) {
      productsWarehouseFilter
        .querySelectorAll("input[data-warehouse-id]")
        .forEach((input) => {
          input.checked = false;
        });
    }
    productsQuery = "";
    productsStart = 0;
    refreshProductSettingsFromInputs();
    loadProducts();
  });
}

if (productsPublishStatusMass && productsPublishStatus) {
  productsPublishStatusMass.addEventListener("change", () => {
    productsPublishStatus.value = productsPublishStatusMass.value;
    productsPublishStatus.dispatchEvent(new Event("change", { bubbles: true }));
  });
  productsPublishStatus.addEventListener("change", () => {
    if (productsPublishStatusMass.value !== productsPublishStatus.value) {
      productsPublishStatusMass.value = productsPublishStatus.value;
    }
  });
}

if (productsSyncPublish && productsPublishStatus) {
  productsSyncPublish.addEventListener("change", () => {
    if (!productsSyncPublish.checked) {
      productsPublishStatus.value = "draft";
      if (productsPublishStatusMass) {
        productsPublishStatusMass.value = "draft";
      }
      productsPublishStatus.dispatchEvent(new Event("change", { bubbles: true }));
    }
    applyToggleDependencies();
  });
}

if (rulesAutoPublish && rulesAutoStatus) {
  rulesAutoPublish.addEventListener("change", () => {
    if (!rulesAutoPublish.checked) {
      rulesAutoStatus.value = "draft";
      rulesAutoStatus.dispatchEvent(new Event("change", { bubbles: true }));
    }
    applyToggleDependencies();
  });
}

// Productos: Manual 1-a-1 y Automatico comparten las mismas opciones.
(() => {
  const lock = { active: false };

  const dispatchChange = (node) => {
    if (!(node instanceof HTMLElement)) return;
    node.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const mirrorChecked = (from, to) => {
    if (!(from instanceof HTMLInputElement) || !(to instanceof HTMLInputElement)) return;
    if (to.checked === from.checked) return;
    to.checked = from.checked;
    dispatchChange(to);
  };

  const mirrorValue = (from, to) => {
    if (!(from instanceof HTMLSelectElement) || !(to instanceof HTMLSelectElement)) return;
    if (to.value === from.value) return;
    to.value = from.value;
    dispatchChange(to);
  };

  const bindMirror = (a, b, kind) => {
    if (!(a instanceof HTMLElement) || !(b instanceof HTMLElement)) return;
    a.addEventListener("change", () => {
      if (lock.active) return;
      lock.active = true;
      try {
        if (kind === "checked") mirrorChecked(a, b);
        else mirrorValue(a, b);
        applyToggleDependencies();
      } finally {
        lock.active = false;
      }
    });
    b.addEventListener("change", () => {
      if (lock.active) return;
      lock.active = true;
      try {
        if (kind === "checked") mirrorChecked(b, a);
        else mirrorValue(b, a);
        applyToggleDependencies();
      } finally {
        lock.active = false;
      }
    });
  };

  bindMirror(rulesOnlyActive, productsManualOnlyActive, "checked");
  bindMirror(rulesAutoPublish, productsManualPublish, "checked");
  bindMirror(rulesAutoImages, productsIncludeImages, "checked");
  bindMirror(rulesAutoStatus, productsPublishStatus, "value");
})();

  if (productsSyncClear) {
    productsSyncClear.addEventListener("click", () => {
      if (productsDateStart) productsDateStart.value = "";
      if (productsDateEnd) productsDateEnd.value = "";
      if (productsSyncLimitInput) productsSyncLimitInput.value = "";
      if (productsSyncQuery) productsSyncQuery.value = "";
      if (productsSyncOnlyActive) productsSyncOnlyActive.checked = true;
      if (productsSyncPublish) productsSyncPublish.checked = true;
      if (productsSyncOnlyPublished) productsSyncOnlyPublished.checked = true;
      if (productsSyncIncludeInventory) productsSyncIncludeInventory.checked = true;
      updateSyncWarehouseState();
      if (cfgWarehouseSync) {
        cfgWarehouseSync.querySelectorAll("input[data-warehouse-id]").forEach((input) => {
          input.checked = false;
        });
        updateSyncWarehouseSummary();
      }
      refreshProductSettingsFromInputs();
    });
  }

	const productSettingInputs = [
	  productsPublishStatus,
	  productsIncludeImages,
	  productsDateStart,
	  productsDateEnd,
	  productsSyncLimitInput,
	  productsSyncQuery,
	  productsSyncOnlyActive,
	  productsSyncPublish,
	  productsSyncOnlyPublished,
	  productsSyncIncludeInventory,
	  productsDateFilter,
	  productsSort,
	  productsLimitInput,
	  productsInStockOnly,
  productsStatusFilter,
  ordersDateStart,
  ordersDateEnd,
  ordersLimit,
  ordersSyncNumber,
  ordersDateFilter,
  ordersDaysSelect,
  ordersSort,
  opsSearch,
].filter(Boolean);
productSettingInputs.forEach((input) => {
  input.addEventListener("change", refreshProductSettingsFromInputs);
});

async function init() {
  const safeLoad = async (promise) => {
    try {
      return await promise;
    } catch (error) {
      console.error(error);
      return null;
    }
  };
  loadSidebarState();
  captureOnboardingParam();
  initSettingsSubmenu();
  cleanupLegacyConnectionsUi();
  initGroupControls();
  initToggleFields();
  initToggleDependencies();
  initTips();
  initSetupModeControls();
  initShopifyConnectPicker();
  updateWizardStartAvailability();
  applyProductSettings();
  await safeLoad(loadCurrentUser());
  await safeLoad(loadCompanyProfile());
  await safeLoad(loadUsers());
  await safeLoad(loadLogs());
  await safeLoad(loadMetrics());
  await safeLoad(loadOperations());
  if (currentUserRole === "admin") {
    await safeLoad(loadConnections());
    await safeLoad(loadSettings());
    await safeLoad(loadResolutions());
  }
  await Promise.all([
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgCostCenter, "cost-centers"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgWarehouse, "warehouses"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgTransferDest, "warehouses"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgTransferPriority, "warehouses"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgSeller, "sellers"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgPaymentMethod, "payment-methods"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgBankAccount, "bank-accounts"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgPriceGeneral, "price-lists"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgPriceDiscount, "price-lists"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgPriceWholesale, "price-lists"))
      : Promise.resolve(null),
  ]);
  initModuleControls();
  initHelpPanels();
  openWizardStep();
}

init();
