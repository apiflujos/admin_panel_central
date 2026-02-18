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
const productsFiltersToolbar = document.querySelector(".toolbar.products-filters");
const productsSyncProgress = document.getElementById("products-sync-progress");
const productsSyncProgressBar = document.getElementById("products-sync-progress-bar");
const productsSyncProgressLabel = document.getElementById("products-sync-progress-label");
const ordersProgress = document.getElementById("orders-progress");
const ordersProgressBar = document.getElementById("orders-progress-bar");
const ordersProgressLabel = document.getElementById("orders-progress-label");
const ordersSyncProgress = document.getElementById("orders-sync-progress");
const ordersSyncProgressBar = document.getElementById("orders-sync-progress-bar");
const ordersSyncProgressLabel = document.getElementById("orders-sync-progress-label");
const contactsProgress = document.getElementById("contacts-progress");
const contactsProgressBar = document.getElementById("contacts-progress-bar");
const contactsProgressLabel = document.getElementById("contacts-progress-label");
const contactsSyncProgress = document.getElementById("contacts-sync-progress");
const contactsSyncProgressBar = document.getElementById("contacts-sync-progress-bar");
const contactsSyncProgressLabel = document.getElementById("contacts-sync-progress-label");
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
const storeCreateModal = document.getElementById("store-create-modal");
const storeCreateOpen = document.getElementById("store-create-open");
const storeCreateClose = document.getElementById("store-create-close");
const storeCreateSave = document.getElementById("store-create-save");
const storeCreateName = document.getElementById("store-create-name");
const storesList = document.getElementById("stores-list");
const storesPanel = document.getElementById("stores-panel");
const connectionStoreSelect = document.getElementById("connection-store-select");
const connectionStoreCreate = document.getElementById("connection-store-create");
const connectionStoreCreateTop = document.getElementById("connection-store-create-top");
const connectionStoreSelected = document.getElementById("connection-store-selected");
const connectionStoreSelectedPlatform = document.getElementById("connection-store-selected-platform");
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

const productsPhotosBulkOpen = document.getElementById("products-photos-bulk-open");
const photosModal = document.getElementById("photos-modal");
const photosClose = document.getElementById("photos-close");
const photosTemplate = document.getElementById("photos-template");
const photosFile = document.getElementById("photos-file");
const photosMatchBy = document.getElementById("photos-match-by");
const photosAttachVariant = document.getElementById("photos-attach-variant");
const photosMode = document.getElementById("photos-mode");
const photosPublishEnabled = document.getElementById("photos-publish-enabled");
const photosPublishStatusField = document.getElementById("photos-publish-status-field");
const photosPublishStatus = document.getElementById("photos-publish-status");
const photosRun = document.getElementById("photos-run");
const photosStop = document.getElementById("photos-stop");
const photosClear = document.getElementById("photos-clear");
const photosDownloadErrors = document.getElementById("photos-download-errors");
const photosStatus = document.getElementById("photos-status");
const photosProgress = document.getElementById("photos-progress");
const photosProgressBar = document.getElementById("photos-progress-bar");
const photosProgressLabel = document.getElementById("photos-progress-label");
const photosErrors = document.getElementById("photos-errors");

const logTableBody = document.querySelector("#logs-table tbody");
const logStatus = document.getElementById("log-status");
const logEntity = document.getElementById("log-entity");
const logOrderId = document.getElementById("log-order-id");
const logFilter = document.getElementById("log-filter");
const logRetry = document.getElementById("log-retry");
const connectionsGrid = document.getElementById("connections-grid");
const qaTokenGenerate = document.getElementById("qa-token-generate");
const qaTokenCopy = document.getElementById("qa-token-copy");
const qaTokenValue = document.getElementById("qa-token-value");
const qaTokenHint = document.getElementById("qa-token-hint");
const qaTokenScope = document.getElementById("qa-token-scope");
const qaTokenTtl = document.getElementById("qa-token-ttl");

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
const metricsInsights = document.getElementById("metrics-insights");
const metricsReport = document.getElementById("metrics-report");
const metricsReportDownload = document.getElementById("metrics-report-download");
const weeklyGrowthLabel = document.getElementById("chart-weekly-label");
const navSuperadmin = document.getElementById("nav-superadmin");
const saTab = document.getElementById("sa-tab");
const saTenant = document.getElementById("sa-tenant");
const saPeriod = document.getElementById("sa-period");
const saLoad = document.getElementById("sa-load");
const saReset = document.getElementById("sa-reset");
const saStatus = document.getElementById("sa-status");
const saUsageBody = document.querySelector("#sa-usage-table tbody");
const saPaneTenant = document.getElementById("sa-pane-tenant");
const saPaneServices = document.getElementById("sa-pane-services");
const saPanePlans = document.getElementById("sa-pane-plans");
const saPaneUsers = document.getElementById("sa-pane-users");
const saPlanKey = document.getElementById("sa-plan-key");
const saAssignPlan = document.getElementById("sa-assign-plan");
const saSnapshotTenantId = document.getElementById("sa-snapshot-tenant-id");
const saSnapshotPlanKey = document.getElementById("sa-snapshot-plan-key");
const saSnapshotPlanType = document.getElementById("sa-snapshot-plan-type");
const saSnapshotMonthlyPrice = document.getElementById("sa-snapshot-monthly-price");
const saSnapshotUpdatedAt = document.getElementById("sa-snapshot-updated-at");
const saSnapshotServicesBody = document.querySelector("#sa-snapshot-services-table tbody");
const saModulesBody = document.querySelector("#sa-modules-table tbody");
const saServicesBody = document.querySelector("#sa-services-table tbody");
const saServiceKey = document.getElementById("sa-service-key");
const saServiceName = document.getElementById("sa-service-name");
const saServicePeriod = document.getElementById("sa-service-period");
const saServiceActive = document.getElementById("sa-service-active");
const saServiceSave = document.getElementById("sa-service-save");
const saPlanLimitsKey = document.getElementById("sa-plan-limits-key");
const saPlanLimitsLoad = document.getElementById("sa-plan-limits-load");
const saPlanLimitsBody = document.querySelector("#sa-plan-limits-table tbody");
const saUsersBody = document.querySelector("#sa-users-table tbody");
const saUserNameInput = document.getElementById("sa-user-name");
const saUserEmailInput = document.getElementById("sa-user-email");
const saUserPhoneInput = document.getElementById("sa-user-phone");
const saUserPasswordInput = document.getElementById("sa-user-password");
const saUserCreate = document.getElementById("sa-user-create");
const saUserCancel = document.getElementById("sa-user-cancel");
const saUsersMessage = document.getElementById("sa-users-message");

const marketingStoreSelect = document.getElementById("marketing-store-select");
const marketingFrom = document.getElementById("marketing-from");
const marketingTo = document.getElementById("marketing-to");
const marketingStatus = document.getElementById("marketing-status");
const mkKpiRevenue = document.getElementById("mk-kpi-revenue");
const mkKpiSpend = document.getElementById("mk-kpi-spend");
const mkKpiRoas = document.getElementById("mk-kpi-roas");
const mkKpiAov = document.getElementById("mk-kpi-aov");
const mkFunnelBody = document.querySelector("#mk-funnel-table tbody");
const mkRevenueSeries = document.getElementById("mk-revenue-series");
const mkByChannel = document.getElementById("mk-by-channel");
const mkTopCampaignsBody = document.querySelector("#mk-top-campaigns tbody");
const mkCfgPixelKey = document.getElementById("mk-cfg-pixel-key");
const mkCfgCopyKey = document.getElementById("mk-cfg-copy-key");
const mkCfgRotateKey = document.getElementById("mk-cfg-rotate-key");
const mkCfgStatus = document.getElementById("mk-cfg-status");
const mkCfgScript = document.getElementById("mk-cfg-script");
const mkCfgCopyScript = document.getElementById("mk-cfg-copy-script");
const mkCfgTest = document.getElementById("mk-cfg-test");
const mkCfgWebhookUrl = document.getElementById("mk-cfg-webhook-url");
const mkCfgCopyWebhook = document.getElementById("mk-cfg-copy-webhook");
const mkCfgCreateWebhooks = document.getElementById("mk-cfg-create-webhooks");
const mkCfgDeleteWebhooks = document.getElementById("mk-cfg-delete-webhooks");
const mkCfgWebhooksStatus = document.getElementById("mk-cfg-webhooks-status");
const mkCfgStoreSelect = document.getElementById("mk-cfg-store-select");
const mkCfgConnect = document.getElementById("mk-cfg-connect");
const mkCfgPixelPill = document.getElementById("mk-cfg-pixel-pill");
const mkCfgWebhooksPill = document.getElementById("mk-cfg-webhooks-pill");
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
const topbarBilling = document.getElementById("topbar-billing");
const billingPlanPill = document.getElementById("billing-plan-pill");
const billingMonthMetrics = document.getElementById("billing-month-metrics");
const userMenu = document.getElementById("topbar-user-menu");
const userMenuToggle = document.getElementById("topbar-user-toggle");
const clientLogo = document.getElementById("client-logo");
const sidebarLogout = document.getElementById("sidebar-logout");
const sidebarToggleIcon = document.getElementById("sidebar-toggle-icon");
const heroTitle = document.getElementById("dashboard-hero-title");
const heroSubtitle = document.getElementById("dashboard-hero-subtitle");
const assistantTag = document.getElementById("assistant-tag");

const storeNameInput = document.getElementById("store-name");
const storeActiveField = document.getElementById("store-active-field");
const storeActiveSelect = document.getElementById("store-active-select");
const storeActiveList = document.getElementById("store-active-list");
const storeActiveNameLabel = document.getElementById("store-active-name");
const settingsStoreActiveLabel = document.getElementById("settings-store-active");
const storeDelete = document.getElementById("store-delete");
const ordersStoreSelect = document.getElementById("orders-store-select");
const productsStoreSelect = document.getElementById("products-store-select");
const contactsStoreSelect = document.getElementById("contacts-store-select");
const storeSyncSourceSelect = document.getElementById("store-sync-source");
const storeSyncTargetSelect = document.getElementById("store-sync-target");
const storeSyncSourceProviderSelect = document.getElementById("store-sync-source-provider");
const storeSyncTargetProviderSelect = document.getElementById("store-sync-target-provider");
const storeSyncAlegraAccountSelect = document.getElementById("store-sync-alegra-account");
const storeSyncPriceListSelect = document.getElementById("store-sync-price-list");
const storeSyncStatusSelect = document.getElementById("store-sync-status");
const storeSyncScopeSelect = document.getElementById("store-sync-scope");
const storeSyncPriceFallbackSelect = document.getElementById("store-sync-price-fallback");
const storeSyncTrackInventory = document.getElementById("store-sync-track-inventory");
const storeSyncIncludeInventory = document.getElementById("store-sync-include-inventory");
const storeSyncInventorySource = document.getElementById("store-sync-inventory-source");
const storeSyncOnlyActive = document.getElementById("store-sync-only-active");
const storeSyncIncludeDescriptions = document.getElementById("store-sync-include-descriptions");
const storeSyncIncludeImages = document.getElementById("store-sync-include-images");
const storeSyncIncludeProductType = document.getElementById("store-sync-include-product-type");
const storeSyncIncludeTags = document.getElementById("store-sync-include-tags");
const storeSyncRun = document.getElementById("store-sync-run");
const storeSyncClear = document.getElementById("store-sync-clear");
const storeSyncStatusLabel = document.getElementById("store-sync-status-label");
const storeSyncIncludeInventoryLabel = document.getElementById("store-sync-include-inventory-label");
const shopifyDomain = document.getElementById("shopify-domain");
const shopifyToken = document.getElementById("shopify-token");
const shopifyTokenField = document.getElementById("shopify-token-field");
const shopifyConnectPicker = document.getElementById("shopify-connect-picker");
const shopifyConnectHint = document.getElementById("shopify-connect-hint");
const wooDomain = document.getElementById("woocommerce-domain");
const wooConsumerKey = document.getElementById("woocommerce-key");
const wooConsumerSecret = document.getElementById("woocommerce-secret");
const wizardStart = document.getElementById("wizard-start");
const wizardStop = document.getElementById("wizard-stop");
const wizardSkip = document.getElementById("wizard-skip");
const manualOpen = document.getElementById("manual-open");
const wizardHint = document.getElementById("wizard-hint");
const setupModePicker = document.getElementById("setup-mode-picker");
const settingsSubmenu = document.getElementById("settings-submenu");
const settingsSubnav = document.getElementById("settings-subnav");
const settingsPaneIndicator = document.getElementById("settings-pane-indicator");
const storesDebugBar = document.getElementById("stores-debug");
const settingsPaneConnectionsToggle = document.getElementById("settings-pane-connections");
const settingsPaneStoresToggle = document.getElementById("settings-pane-stores");
const connectionModal = document.getElementById("connection-modal");
const connectionModalBody = document.getElementById("connection-modal-body");
const connectionModalOpen = document.getElementById("open-connection-modal");
const connectionNameSlot = document.getElementById("connection-name-slot");
const connectionFormSlot = document.getElementById("connection-form-slot");
const connectionNameNext = document.getElementById("connection-step-name-next");
const connectionModalStorePill = document.getElementById("connection-modal-store-pill");
const connectionModalPlatformPill = document.getElementById("connection-modal-platform-pill");
const copyConfigField = document.getElementById("copy-config-field");
const copyConfigSelect = document.getElementById("copy-config-select");
const DEFAULT_WIZARD_HINT = wizardHint ? wizardHint.textContent : "";

const alegraAccountSelect = document.getElementById("alegra-account-select");
const commerceAlegraSelect = document.getElementById("commerce-alegra-select");
const commerceAlegraHint = document.getElementById("commerce-alegra-hint");
const alegraEnvSelect = document.getElementById("alegra-env-select");
const alegraEnvField = document.getElementById("alegra-env-field");
const alegraEmail = document.getElementById("alegra-email");
const alegraKey = document.getElementById("alegra-key");
const connectShopify = document.getElementById("connect-shopify");
const connectAlegra = document.getElementById("connect-alegra");
const connectWooCommerce = document.getElementById("connect-woocommerce");
const shopifyConnectionPill = document.getElementById("shopify-connection-pill");
const alegraConnectionPill = document.getElementById("alegra-connection-pill");
const wooConnectionPill = document.getElementById("woocommerce-connection-pill");
const googleAdsCustomerId = document.getElementById("google-ads-customer-id");
const connectGoogleAds = document.getElementById("connect-google-ads");
const googleAdsConnectionPill = document.getElementById("google-ads-connection-pill");
const metaAdsAccountId = document.getElementById("meta-ads-account-id");
const connectMetaAds = document.getElementById("connect-meta-ads");
const metaAdsConnectionPill = document.getElementById("meta-ads-connection-pill");
const tiktokAdsAdvertiserId = document.getElementById("tiktok-ads-advertiser-id");
const connectTikTokAds = document.getElementById("connect-tiktok-ads");
const tiktokAdsConnectionPill = document.getElementById("tiktok-ads-connection-pill");
const adsAppHost = document.getElementById("ads-app-host");
const googleAdsClientId = document.getElementById("google-ads-client-id");
const googleAdsClientSecret = document.getElementById("google-ads-client-secret");
const googleAdsDeveloperToken = document.getElementById("google-ads-developer-token");
const metaAdsAppId = document.getElementById("meta-ads-app-id");
const metaAdsAppSecret = document.getElementById("meta-ads-app-secret");
const tiktokAdsAppId = document.getElementById("tiktok-ads-app-id");
const tiktokAdsAppSecret = document.getElementById("tiktok-ads-app-secret");
const adsAppSaveButtons = Array.from(document.querySelectorAll("[data-ads-save]"));
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
	const cfgObservationsExtra = document.getElementById("cfg-observations-extra");
	const cfgObservationsFields = document.getElementById("cfg-observations-fields");
	const cfgObservationsFieldsSummary = document.getElementById("cfg-observations-fields-summary");
	const cfgObservationsPreview = document.getElementById("cfg-observations-preview");
	const cfgGenerateInvoice = document.getElementById("cfg-generate-invoice");
	const cfgEinvoiceEnabled = document.getElementById("cfg-einvoice-enabled");
	const cfgInvoiceStatus = document.getElementById("cfg-invoice-status");
	const cfgTransferDestMode = document.getElementById("cfg-transfer-dest-mode");
	const cfgTransferDest = document.getElementById("cfg-transfer-dest");
	const cfgTransferDestRequired = document.getElementById("cfg-transfer-dest-required");
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
const syncContactsEnabled = document.getElementById("sync-contacts-enabled");
const syncContactLimit = document.getElementById("sync-contact-limit");
const syncContactsBulkDateStart = document.getElementById("sync-contacts-bulk-date-start");
const syncContactsBulkDateEnd = document.getElementById("sync-contacts-bulk-date-end");
const syncContactsBulkShopify = document.getElementById("sync-contacts-bulk-shopify");
const syncContactsBulkAlegra = document.getElementById("sync-contacts-bulk-alegra");
const syncContactsBulkCreateAlegra = document.getElementById("sync-contacts-bulk-create-alegra");
const syncContactsBulkCreateShopify = document.getElementById("sync-contacts-bulk-create-shopify");
const syncContactsBulkRun = document.getElementById("sync-contacts-bulk-run");
const syncContactsBulkStop = document.getElementById("sync-contacts-bulk-stop");
const syncContactsBulkClear = document.getElementById("sync-contacts-bulk-clear");
const syncContactsStatus = document.getElementById("sync-contacts-status");
const syncContactsCreateAlegra = document.getElementById("sync-contacts-create-alegra");
const syncContactsCreateShopify = document.getElementById("sync-contacts-create-shopify");
const syncOrdersShopify = document.getElementById("sync-orders-shopify");
const syncOrdersAlegra = document.getElementById("sync-orders-alegra");
const syncOrdersShopifyEnabled = document.getElementById("sync-orders-shopify-enabled");
const syncOrdersAlegraEnabled = document.getElementById("sync-orders-alegra-enabled");
const syncOrdersShopifyInvoice = document.getElementById("sync-orders-shopify-invoice");
const syncOrdersAlegraModeField = document.getElementById("sync-orders-alegra-mode-field");

const opsTableBody = document.querySelector("#ops-table tbody");
const invoicesTableBody = document.querySelector("#invoices-table tbody");
const opsViewOrdersBtn = document.getElementById("ops-view-orders");
const opsViewInvoicesBtn = document.getElementById("ops-view-invoices");
const opsTitle = document.getElementById("ops-title");
const opsTag = document.getElementById("ops-tag");
const opsViews = Array.from(document.querySelectorAll(".ops-view[data-ops-view]"));
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
const productsPublishStatusMass = document.getElementById("products-publish-status-mass");
const rulesOnlyActive = document.getElementById("rules-only-active");
const rulesSyncEnabled = document.getElementById("rules-sync-enabled");
const rulesAutoCreateShopify = document.getElementById("rules-auto-create-shopify");
const rulesAutoUpdateShopify = document.getElementById("rules-auto-update-shopify");
const productsDateStart = document.getElementById("products-date-start");
const productsDateEnd = document.getElementById("products-date-end");
const productsSyncLimitInput = document.getElementById("products-sync-limit");
const productsSyncQuery = document.getElementById("products-sync-query");
const productsSyncOnlyActive = document.getElementById("products-sync-only-active");
const productsSyncPublish = document.getElementById("products-sync-publish");
const productsSyncUpdateExisting = document.getElementById("products-sync-update-existing");
const productsSyncOnlyPublished = document.getElementById("products-sync-only-published");
const productsSyncIncludeInventory = document.getElementById("products-sync-include-inventory");
const productsSyncTrackInventory = document.getElementById("products-sync-track-inventory");
const productsSyncFilteredBtn = document.getElementById("products-sync-filtered");
const productsSyncStopBtn = document.getElementById("products-sync-stop");
const ordersSyncDateStart = document.getElementById("orders-sync-date-start");
const ordersSyncDateEnd = document.getElementById("orders-sync-date-end");
const ordersSyncLimitInput = document.getElementById("orders-sync-limit");
const ordersSyncNumber = document.getElementById("orders-sync-number");
const ordersSyncClear = document.getElementById("orders-sync-clear");
const productsSyncClear = document.getElementById("products-sync-clear");
const productsSyncStatus = document.getElementById("products-sync-status");
const ordersSyncStatus = document.getElementById("orders-sync-status");
const ordersListLimit = document.getElementById("orders-limit");
const ordersPageLabel = document.getElementById("orders-page");
const ordersPrevBtn = document.getElementById("orders-prev");
const ordersNextBtn = document.getElementById("orders-next");
const ordersCountLabel = document.getElementById("orders-count");
const ordersPageInput = document.getElementById("orders-page-input");
const ordersPageGo = document.getElementById("orders-page-go");
const ordersSyncBtn = document.getElementById("orders-sync");
const ordersSyncStopBtn = document.getElementById("orders-sync-stop");
const ordersDateFilter = document.getElementById("orders-date-filter");
const ordersDaysSelect = document.getElementById("orders-days");
const ordersSort = document.getElementById("orders-sort");
const invoicesPageLabel = document.getElementById("invoices-page");
const invoicesPrevBtn = document.getElementById("invoices-prev");
const invoicesNextBtn = document.getElementById("invoices-next");
const invoicesCountLabel = document.getElementById("invoices-count");
const invoicesPageInput = document.getElementById("invoices-page-input");
const invoicesPageGo = document.getElementById("invoices-page-go");

const invoicesBackfillDateStart = document.getElementById("invoices-backfill-date-start");
const invoicesBackfillDateEnd = document.getElementById("invoices-backfill-date-end");
const invoicesBackfillLimit = document.getElementById("invoices-backfill-limit");
const invoicesBackfillCreateShopify = document.getElementById("invoices-backfill-create-shopify");
const invoicesBackfillModeField = document.getElementById("invoices-backfill-mode-field");
const invoicesBackfillMode = document.getElementById("invoices-backfill-mode");
const invoicesBackfillRun = document.getElementById("invoices-backfill-run");
const invoicesBackfillStop = document.getElementById("invoices-backfill-stop");
const invoicesBackfillClear = document.getElementById("invoices-backfill-clear");
const invoicesBackfillStatus = document.getElementById("invoices-backfill-status");
const invoicesBackfillProgress = document.getElementById("invoices-backfill-progress");
const invoicesBackfillProgressBar = document.getElementById("invoices-backfill-progress-bar");
const invoicesBackfillProgressLabel = document.getElementById("invoices-backfill-progress-label");

const productsShopifyBulkDateStart = document.getElementById("products-shopify-bulk-date-start");
const productsShopifyBulkDateEnd = document.getElementById("products-shopify-bulk-date-end");
const productsShopifyBulkLimit = document.getElementById("products-shopify-bulk-limit");
const productsShopifyBulkCreate = document.getElementById("products-shopify-bulk-create");
const productsShopifyBulkUpdate = document.getElementById("products-shopify-bulk-update");
const productsShopifyBulkIncludeInventory = document.getElementById("products-shopify-bulk-include-inventory");
const productsShopifyBulkMatch = document.getElementById("products-shopify-bulk-match");
const productsShopifyBulkWarehouse = document.getElementById("products-shopify-bulk-warehouse");
const productsShopifyBulkRun = document.getElementById("products-shopify-bulk-run");
const productsShopifyBulkStop = document.getElementById("products-shopify-bulk-stop");
const productsShopifyBulkClear = document.getElementById("products-shopify-bulk-clear");
const productsShopifyBulkStatus = document.getElementById("products-shopify-bulk-status");
const productsShopifyBulkProgress = document.getElementById("products-shopify-bulk-progress");
const productsShopifyBulkProgressBar = document.getElementById("products-shopify-bulk-progress-bar");
const productsShopifyBulkProgressLabel = document.getElementById("products-shopify-bulk-progress-label");

const cfgProductsShopifyToAlegraEnabled = document.getElementById("cfg-products-shopify-to-alegra-enabled");
const cfgProductsShopifyToAlegraCreate = document.getElementById("cfg-products-shopify-to-alegra-create");
const cfgProductsShopifyToAlegraUpdate = document.getElementById("cfg-products-shopify-to-alegra-update");
const cfgProductsShopifyToAlegraIncludeInventory = document.getElementById("cfg-products-shopify-to-alegra-include-inventory");
const cfgProductsShopifyToAlegraMatch = document.getElementById("cfg-products-shopify-to-alegra-match");
const cfgProductsShopifyToAlegraWarehouse = document.getElementById("cfg-products-shopify-to-alegra-warehouse");

const rulesAutoEnabled = document.getElementById("rules-auto-enabled");
const rulesAutoPublish = document.getElementById("rules-auto-publish");
const rulesAutoStatus = document.getElementById("rules-auto-status");
const rulesAutoImages = document.getElementById("rules-auto-images");
const rulesAutoTrackInventory = document.getElementById("rules-auto-track-inventory");
const cfgWarehouseSync = document.getElementById("cfg-warehouse-sync");
const cfgWarehouseSyncSummary = document.getElementById("cfg-warehouse-sync-summary");
const cfgWarehouseSelectAll = document.getElementById("cfg-warehouse-select-all");
const cfgTransferOriginField = document.getElementById("cfg-transfer-origin-field");
const cfgWarehouseSyncField = document.getElementById("cfg-warehouse-sync-field");
const shopifyWebhooksStatus = document.getElementById("shopify-webhooks-status");

let shopifyAdminBase = "";
let currentUserRole = "agent";
let currentUserIsSuperAdmin = false;
let currentUserId = null;
let editingSaUserId = null;
let tenantModules = {};
let activeStoreDomain = "";
let activeStoreName = "";
let storesCache = [];
let wooStoresCache = [];
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
  createInShopify: true,
  updateInShopify: true,
  onlyActiveItems: false,
  includeImages: true,
  syncEnabled: true,
  trackInventory: true,
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
const SETTINGS_INTENT_KEY = "apiflujos-settings-intent";
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
  "alegra-logistics",
  "alegra-invoice",
];
const DEFAULT_PRODUCT_SETTINGS = {
  publish: {
    status: "draft",
    includeImages: true,
    vendor: "",
    trackInventory: true,
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
      updateExisting: true,
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
let invoicesStart = 0;
let invoicesTotal = null;
let invoicesList = [];
let contactsStart = 0;
let contactsTotal = null;
let contactsList = [];
let activeProductsSyncId = "";
let assistantHasSpoken = false;
let assistantFiles = [];
let activeEinvoiceOrderId = "";
let contactsBulkSyncAbort = null;
let contactsBulkSyncRunning = false;
let ordersBulkSyncAbort = null;
let ordersBulkSyncRunning = false;
let photosBulkAbort = null;
let activePhotosSyncId = "";
let photosParsedRows = [];
let photosErrorLog = [];
let invoicesBackfillAbort = null;
let invoicesBackfillRunning = false;
let productsShopifyBulkAbort = null;
let productsShopifyBulkRunning = false;
let activeProductsShopifyBulkSyncId = "";
let operationsView = "orders";
let csrfToken = "";

function setOrdersBulkSyncRunning(running) {
  const isRunning = Boolean(running);
  ordersBulkSyncRunning = isRunning;
  if (ordersSyncStopBtn) {
    ordersSyncStopBtn.hidden = !isRunning;
    ordersSyncStopBtn.disabled = !isRunning;
  }
}

function setInvoicesBackfillRunning(running) {
  const isRunning = Boolean(running);
  invoicesBackfillRunning = isRunning;
  if (invoicesBackfillStop) {
    invoicesBackfillStop.hidden = !isRunning;
    invoicesBackfillStop.disabled = !isRunning;
  }
}

function setProductsShopifyBulkRunning(running) {
  const isRunning = Boolean(running);
  productsShopifyBulkRunning = isRunning;
  if (productsShopifyBulkRun instanceof HTMLButtonElement) {
    productsShopifyBulkRun.hidden = isRunning;
    productsShopifyBulkRun.disabled = isRunning;
  }
  if (productsShopifyBulkStop instanceof HTMLButtonElement) {
    productsShopifyBulkStop.hidden = !isRunning;
    productsShopifyBulkStop.disabled = !isRunning;
  }
  if (productsShopifyBulkClear instanceof HTMLButtonElement) {
    productsShopifyBulkClear.hidden = isRunning;
    productsShopifyBulkClear.disabled = isRunning;
  }
}

function setInvoicesBackfillStatus(text, state) {
  if (!invoicesBackfillStatus) return;
  invoicesBackfillStatus.textContent = text || "";
  invoicesBackfillStatus.classList.remove("is-error", "is-ok", "is-warn");
  if (state) invoicesBackfillStatus.classList.add(state);
}

function setProductsShopifyBulkStatus(text, state) {
  if (!productsShopifyBulkStatus) return;
  productsShopifyBulkStatus.textContent = text || "";
  productsShopifyBulkStatus.classList.remove("is-error", "is-ok", "is-warn");
  if (state) productsShopifyBulkStatus.classList.add(state);
}

function updateProductsShopifyBulkProgress(percent, label) {
  if (!productsShopifyBulkProgress || !productsShopifyBulkProgressBar || !productsShopifyBulkProgressLabel) return;
  const clamped = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  productsShopifyBulkProgress.classList.add("is-active");
  productsShopifyBulkProgressBar.style.width = `${clamped}%`;
  productsShopifyBulkProgressLabel.textContent = label || `Productos ${Math.round(clamped)}%`;
}

function setOperationsView(next) {
  const view = next === "invoices" ? "invoices" : "orders";
  operationsView = view;
  if (opsViewOrdersBtn) opsViewOrdersBtn.classList.toggle("is-active", view === "orders");
  if (opsViewInvoicesBtn) opsViewInvoicesBtn.classList.toggle("is-active", view === "invoices");
  if (opsTitle) opsTitle.textContent = view === "invoices" ? "Gestion de facturas" : "Gestion de pedidos";
  if (opsTag) opsTag.textContent = view === "invoices" ? "Facturas" : "Pedidos";
  opsViews.forEach((node) => {
    const key = node.getAttribute("data-ops-view");
    node.classList.toggle("is-hidden", key !== view);
    if (node instanceof HTMLElement) node.hidden = key !== view;
  });
}

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
  // UX: durante una sincronizacion masiva, evitamos acciones que cambien filtros/local state.
  if (productsClearBtn) {
    productsClearBtn.hidden = isRunning;
    productsClearBtn.disabled = isRunning;
  }
  if (productsFiltersToolbar instanceof HTMLElement) {
    productsFiltersToolbar.hidden = isRunning;
  }
}

function setContactsBulkSyncRunning(running) {
  contactsBulkSyncRunning = Boolean(running);
  if (syncContactsBulkRun instanceof HTMLButtonElement) {
    syncContactsBulkRun.hidden = contactsBulkSyncRunning;
    syncContactsBulkRun.disabled = contactsBulkSyncRunning;
  }
  if (syncContactsBulkStop instanceof HTMLButtonElement) {
    syncContactsBulkStop.hidden = !contactsBulkSyncRunning;
    syncContactsBulkStop.disabled = !contactsBulkSyncRunning;
  }
  if (syncContactsBulkClear instanceof HTMLButtonElement) {
    syncContactsBulkClear.hidden = contactsBulkSyncRunning;
    syncContactsBulkClear.disabled = contactsBulkSyncRunning;
  }
}

function showSection(target) {
  sections.forEach((section) => {
    section.classList.toggle("is-active", section.id === target);
  });
  if (target === "operations") {
    loadOperationsView().catch(() => null);
  }
  if (target === "superadmin") {
    loadSuperAdmin().catch(() => null);
  }
  if (target === "marketing") {
    loadMarketing().catch(() => null);
  }
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
    ensureSettingsVisibility();
  }
}

function activateNav(target) {
  const pathname = window?.location?.pathname || "";
  const allowSettings =
    document.body.classList.contains("force-settings") || isSettingsPath(pathname);
  if (target === "settings" && !allowSettings) {
    target = "dashboard";
  }
  if (target !== "settings" && isSettingsPath(pathname)) {
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
    }
    if (typeof document !== "undefined") {
      document.body.classList.remove("force-settings");
    }
    try {
      sessionStorage.removeItem(SETTINGS_INTENT_KEY);
    } catch {
      // ignore storage errors
    }
  }
  navItems.forEach((button) => {
    const buttonTarget = button.getAttribute("data-target") || "";
    if (buttonTarget !== target) {
      button.classList.remove("is-active");
      return;
    }
    if (target === "operations") {
      const view = button.getAttribute("data-ops-view") || "orders";
      button.classList.toggle("is-active", view === operationsView);
      return;
    }
    button.classList.add("is-active");
  });
  showSection(target);
  const content = document.querySelector(".content");
  if (content) {
    content.scrollTop = 0;
  }
  if (typeof document !== "undefined") {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
  if (typeof window !== "undefined") {
    window.scrollTo(0, 0);
  }
}

function resolveSettingsPaneKey(_value) {
  return "connections";
}

function getStoredSettingsPane() {
  return "connections";
}

function isSettingsPath(pathname) {
  if (typeof pathname !== "string") return false;
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

function consumeSettingsIntent() {
  try {
    const value = sessionStorage.getItem(SETTINGS_INTENT_KEY);
    if (value) {
      sessionStorage.removeItem(SETTINGS_INTENT_KEY);
      return true;
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

function markSettingsIntent() {
  try {
    sessionStorage.setItem(SETTINGS_INTENT_KEY, "1");
  } catch {
    // ignore storage errors
  }
}

function setupViewportDebug() {
  return;
  const overlay = document.createElement("div");
  overlay.id = "viewport-debug";
  overlay.style.position = "fixed";
  overlay.style.right = "12px";
  overlay.style.bottom = "12px";
  overlay.style.zIndex = "9999";
  overlay.style.background = "rgba(15, 23, 42, 0.9)";
  overlay.style.color = "#fff";
  overlay.style.padding = "8px 10px";
  overlay.style.borderRadius = "10px";
  overlay.style.fontSize = "11px";
  overlay.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace";
  overlay.style.boxShadow = "0 8px 18px rgba(15, 23, 42, 0.25)";
  const update = () => {
    const intent =
      (typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(SETTINGS_INTENT_KEY)) ||
      "";
    const ref = typeof document !== "undefined" ? document.referrer : "";
    const active =
      document.querySelector(".section.is-active")?.id || "none";
    const line1 = `viewport: ${window.innerWidth}x${window.innerHeight} · dpr ${window.devicePixelRatio}`;
    const line2 = `path: ${window.location.pathname} · force: ${document.body.classList.contains("force-settings") ? "1" : "0"}`;
    const line3 = `intent: ${intent ? "1" : "0"} · ref: ${ref ? "1" : "0"}`;
    const line4 = `active: ${active}`;
    overlay.textContent = `${line1}\n${line2}\n${line3}\n${line4}`;
  };
  overlay.style.whiteSpace = "pre";
  update();
  window.addEventListener("resize", update);
  document.body.appendChild(overlay);
}

let connectionWizardStep = "name";
let connectionWizardChoice = "";
let connectionWizardGroup = "commerce";
let pendingConnectionGroup = "";
const STORE_ACTIVE_KEY = "apiflujos-active-store-id";
let storesCatalog = [];
let activeStoreId = "";
let unassignedAlegraAccounts = [];

function getActiveStoreId() {
  if (activeStoreId) return activeStoreId;
  try {
    return String(localStorage.getItem(STORE_ACTIVE_KEY) || "");
  } catch {
    return "";
  }
}

function setActiveStoreId(value) {
  activeStoreId = value ? String(value) : "";
  try {
    if (activeStoreId) {
      localStorage.setItem(STORE_ACTIVE_KEY, activeStoreId);
    } else {
      localStorage.removeItem(STORE_ACTIVE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function getStoreByIdFromCatalog(storeId) {
  const id = Number(storeId);
  if (!Number.isFinite(id)) return null;
  return storesCatalog.find((store) => Number(store.id) === id) || null;
}

function getSelectedStore() {
  if (!(connectionStoreSelect instanceof HTMLSelectElement)) return null;
  return getStoreByIdFromCatalog(connectionStoreSelect.value);
}

function renderStoresList() {
  if (!storesList) return;
  const list = Array.isArray(storesCatalog) ? storesCatalog : [];
  if (!list.length) {
    storesList.innerHTML = `<div class="connection-card empty">Sin tiendas. Crea la primera para conectar plataformas.</div>`;
    if (storesPanel) storesPanel.classList.add("is-hidden");
    return;
  }
  if (storesPanel) storesPanel.classList.remove("is-hidden");
  const current = getActiveStoreId();
  storesList.innerHTML = list
    .map((store) => {
      const isActive = current && Number(current) === Number(store.id);
      const platforms = [];
      if (store?.shopify) {
        const ok =
          Boolean(store.shopify.shopifyConnected ?? store.shopify.status === "Conectado") &&
          !store.shopify.shopifyNeedsReconnect;
        platforms.push({ key: "shopify", label: "Shopify", ok, shopDomain: store.shopify.shopDomain });
      }
      if (store?.woo) {
        platforms.push({
          key: "woocommerce",
          label: "WooCommerce",
          ok: Boolean(store.woo.ok),
          shopDomain: store.woo.shopDomain,
        });
      }
      if (store?.alegra) {
        const ok = !store.alegra.needsReconnect;
        const envLabel = store.alegra.environment === "sandbox" ? "Sandbox" : "Produccion";
        platforms.push({ key: "alegra", label: `Alegra · ${envLabel}`, ok });
      }
      const canAssociateAlegra =
        !store?.alegra &&
        Array.isArray(unassignedAlegraAccounts) &&
        unassignedAlegraAccounts.length > 0;
      const hasPlatforms = platforms.length > 0;
      const actions = platforms
        .filter((tile) => tile.key !== "none")
        .map((tile) => {
          const domainAttr = tile.shopDomain ? `data-shop-domain="${tile.shopDomain}"` : "";
          const needsReconnect = tile.ok === false;
          const reconnectLabel = needsReconnect ? `Reconectar ${tile.label}` : "";
          return `
            ${needsReconnect ? `<button class="primary tiny" type="button" data-store-action="reconnect" data-provider="${tile.key}" data-store-id="${store.id}" ${domainAttr}>${reconnectLabel}</button>` : ""}
            <button class="ghost tiny" type="button" data-store-action="disconnect" data-provider="${tile.key}" data-store-id="${store.id}" ${domainAttr}>
              Desconectar ${tile.label}
            </button>
          `;
        })
        .join("");
      return `
        <div class="connection-card${isActive ? " is-active" : ""}" data-store-card="${store.id}">
          <div class="connection-head">
            <div class="connection-summary-text">
              <h4 class="connection-store-title">${escapeHtml(store.name)}</h4>
            </div>
            <div class="connection-summary-meta">
              ${isActive ? `<span class="status-pill is-ok">Activa</span>` : ""}
            </div>
          </div>
          ${
            hasPlatforms
              ? `<div class="connection-pill-row" aria-label="Plataformas conectadas">
            ${platforms
              .map(
                (tile) => `
              <span class="connection-pill ${tile.ok ? "is-ok" : "is-off"}">
                <span class="connection-dot"></span>
                ${tile.label}
              </span>
            `
              )
              .join("")}
          </div>`
              : `<div class="connection-empty">Sin conexiones aun.</div>`
          }
          <div class="connection-actions">
            ${actions || ""}
            ${
              canAssociateAlegra
                ? `<button class="primary tiny" type="button" data-store-action="associate-alegra" data-store-id="${store.id}">Asociar Alegra</button>`
                : ""
            }
            <button class="ghost danger tiny" type="button" data-store-action="delete" data-store-id="${store.id}">
              Eliminar tienda
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderConnectionStoreSelect() {
  if (!(connectionStoreSelect instanceof HTMLSelectElement)) return;
  const list = Array.isArray(storesCatalog) ? storesCatalog : [];
  if (!list.length) {
    connectionStoreSelect.innerHTML = `<option value="">Sin tiendas</option>`;
    connectionStoreSelect.disabled = true;
    if (connectionStoreSelected) {
      connectionStoreSelected.textContent = "No hay tiendas. Crea la primera para continuar.";
    }
    if (connectionStoreSelectedPlatform) connectionStoreSelectedPlatform.textContent = "";
    if (connectionNameNext instanceof HTMLButtonElement) {
      connectionNameNext.disabled = true;
    }
    return;
  }
  connectionStoreSelect.disabled = false;
  if (connectionNameNext instanceof HTMLButtonElement) {
    connectionNameNext.disabled = false;
  }
  connectionStoreSelect.innerHTML = list
    .map((store) => `<option value="${store.id}">${escapeHtml(store.name)}</option>`)
    .join("");
  const current = getActiveStoreId();
  if (current) {
    connectionStoreSelect.value = current;
  } else if (activeStoreId) {
    connectionStoreSelect.value = activeStoreId;
  } else {
    connectionStoreSelect.selectedIndex = 0;
    setActiveStoreId(connectionStoreSelect.value);
  }
  const selectedStore = getSelectedStore();
  if (storeNameInput) storeNameInput.value = selectedStore ? selectedStore.name : "";
  updateConnectionStoreHints();
  syncCommerceAlegraSelection();
}

async function loadStoresCatalog() {
  try {
    const data = await fetchJson("/api/stores");
    storesCatalog = Array.isArray(data.stores) ? data.stores : [];
    if (!getActiveStoreId() && storesCatalog.length) {
      setActiveStoreId(storesCatalog[0].id);
    }
    renderStoresList();
    renderConnectionStoreSelect();
  } catch {
    storesCatalog = [];
    renderStoresList();
    renderConnectionStoreSelect();
  }
}

function openStoreCreateModal() {
  if (!storeCreateModal) return;
  storeCreateModal.classList.add("is-open");
  storeCreateModal.setAttribute("aria-hidden", "false");
  if (storeCreateName) {
    storeCreateName.value = "";
    storeCreateName.focus();
  }
}

function closeStoreCreateModal() {
  if (!storeCreateModal) return;
  storeCreateModal.classList.remove("is-open");
  storeCreateModal.setAttribute("aria-hidden", "true");
}

function updateConnectionButtonsState() {
  if (!connectionModal || !connectionModal.classList.contains("is-open")) return;
  const method = getShopifyConnectMethod();
  const selectedStoreId =
    connectionStoreSelect instanceof HTMLSelectElement ? connectionStoreSelect.value : "";
  const selectedStore = getStoreByIdFromCatalog(selectedStoreId);
  const nameValue = selectedStore ? selectedStore.name : "";
  if (storeNameInput) storeNameInput.value = nameValue;
  const hasStore = Boolean(selectedStore);
  const commerceAlegraValue =
    commerceAlegraSelect instanceof HTMLSelectElement ? commerceAlegraSelect.value : "";
  const hasCommerceAlegra =
    commerceAlegraSelect instanceof HTMLSelectElement
      ? !commerceAlegraSelect.disabled && Boolean(commerceAlegraValue)
      : true;
  const shopifyDomainValue = normalizeShopDomain(shopifyDomain?.value || "");
  const shopifyTokenValue = shopifyToken ? shopifyToken.value.trim() : "";
  const wooDomainValue = normalizeShopDomain(wooDomain?.value || "");
  const wooKeyValue = wooConsumerKey ? wooConsumerKey.value.trim() : "";
  const wooSecretValue = wooConsumerSecret ? wooConsumerSecret.value.trim() : "";
  const alegraEmailValue = alegraEmail ? alegraEmail.value.trim() : "";
  const alegraKeyValue = alegraKey ? alegraKey.value.trim() : "";
  const alegraAccountValue = alegraAccountSelect ? alegraAccountSelect.value : "new";

  const shopifyReady =
    hasStore &&
    hasCommerceAlegra &&
    Boolean(shopifyDomainValue) &&
    (method !== "token" || Boolean(shopifyTokenValue));
  const wooReady =
    hasStore &&
    hasCommerceAlegra &&
    Boolean(wooDomainValue) &&
    Boolean(wooKeyValue) &&
    Boolean(wooSecretValue);
  const alegraReady =
    hasStore &&
    (alegraAccountValue && alegraAccountValue !== "new")
      ? true
      : Boolean(alegraEmailValue) && Boolean(alegraKeyValue);

  if (connectShopify instanceof HTMLButtonElement) {
    connectShopify.disabled = !shopifyReady;
  }
  if (connectWooCommerce instanceof HTMLButtonElement) {
    connectWooCommerce.disabled = !wooReady;
  }
  if (connectAlegra instanceof HTMLButtonElement) {
    connectAlegra.disabled = !alegraReady;
  }
}

function resetConnectionFormVisibility(scope) {
  if (!scope) return;
  scope.querySelectorAll("[data-connection-kind]").forEach((block) => {
    if (block instanceof HTMLElement) {
      block.classList.remove("is-hidden");
    }
  });
}

function hideAllConnectionForms(scope) {
  if (!scope) return;
  scope.querySelectorAll("[data-connection-kind]").forEach((block) => {
    if (block instanceof HTMLElement) {
      block.classList.add("is-hidden");
    }
  });
  scope.querySelectorAll(".connections-group").forEach((groupPanel) => {
    if (groupPanel instanceof HTMLElement) {
      groupPanel.classList.add("is-hidden");
    }
  });
}

function setConnectionWizardStep(step) {
  if (!connectionModal) return;
  if (step === "form" && !connectionWizardChoice) {
    step = "platform";
  }
  connectionWizardStep = step;
  connectionModal.querySelectorAll("[data-connection-step]").forEach((pane) => {
    const isActive = pane.getAttribute("data-connection-step") === step;
    pane.classList.toggle("is-active", isActive);
  });
  const backBtn = connectionModal.querySelector("[data-connection-modal-back]");
  if (backBtn instanceof HTMLElement) {
    backBtn.style.display = step === "name" ? "none" : "";
  }
  connectionModal.classList.toggle("is-form", step === "form");
  const scope = connectionModalBody || connectionModal;
  if (step !== "form") {
    hideAllConnectionForms(scope);
  }
  if (connectionFormSlot instanceof HTMLElement) {
    connectionFormSlot.style.display = step === "form" ? "" : "none";
  }
  if (step === "form") {
    connectionModal.setAttribute("data-connection-count", "1");
  } else {
    updateConnectionChoiceCount();
  }
  updateConnectionStoreHints();
  updateConnectionButtonsState();
}

function updateConnectionChoiceCount() {
  if (!connectionModal) return;
  const activeGroup = connectionModal.getAttribute("data-connection-group") || "";
  const choices = Array.from(
    connectionModal.querySelectorAll("[data-connection-choice]")
  ).filter((button) => {
    if (!(button instanceof HTMLElement)) return true;
    if (button.classList.contains("is-hidden")) return false;
    if (activeGroup) {
      const groupKey = button.getAttribute("data-connection-group") || "";
      if (groupKey && groupKey !== activeGroup) return false;
    }
    return true;
  });
  const count = Math.max(1, choices.length);
  connectionModal.setAttribute("data-connection-count", String(Math.min(count, 4)));
}

function openConnectionModal(presetGroup) {
  if (!connectionModal) return;
  if (connectionModalBody) {
    resetConnectionFormVisibility(connectionModalBody);
  }
  pendingConnectionGroup = presetGroup ? String(presetGroup) : "";
  const hasPreset = Boolean(pendingConnectionGroup);
  connectionWizardGroup = hasPreset ? pendingConnectionGroup : "";
  connectionWizardChoice = "";
  if (hasPreset) {
    connectionModal.setAttribute("data-connection-group", connectionWizardGroup);
    connectionModal.querySelectorAll("[data-connection-group-choice]").forEach((button) => {
      const isActive = button.getAttribute("data-connection-group-choice") === connectionWizardGroup;
      button.classList.toggle("is-active", isActive);
    });
    connectionModal.querySelectorAll("[data-connection-choice]").forEach((button) => {
      const groupKey = button.getAttribute("data-connection-group") || "";
      const show = !groupKey || groupKey === connectionWizardGroup;
      button.classList.toggle("is-hidden", !show);
    });
  } else {
    connectionModal.removeAttribute("data-connection-group");
    connectionModal.querySelectorAll("[data-connection-group-choice]").forEach((button) => {
      button.classList.remove("is-active");
    });
    connectionModal.querySelectorAll("[data-connection-choice]").forEach((button) => {
      button.classList.remove("is-hidden");
    });
  }
  renderConnectionStoreSelect();
  if (!Array.isArray(storesCatalog) || storesCatalog.length === 0) {
    loadStoresCatalog();
  }
  connectionModal.classList.add("is-open");
  connectionModal.setAttribute("aria-hidden", "false");
  updateConnectionChoiceCount();
  const title = connectionModal.querySelector("#connection-modal-title");
  if (title) title.textContent = "Nueva conexion";
  if (connectionModalPlatformPill) {
    connectionModalPlatformPill.textContent = "Plataforma: -";
    connectionModalPlatformPill.classList.add("is-off");
    connectionModalPlatformPill.classList.remove("is-ok");
  }
  setConnectionWizardStep("name");
  updateConnectionStoreHints();
  if (typeof document !== "undefined") {
    document.body.classList.add("modal-open");
  }
}

function closeConnectionModal() {
  if (!connectionModal) return;
  connectionModal.classList.remove("is-open");
  connectionModal.setAttribute("aria-hidden", "true");
  connectionModal.removeAttribute("data-connection-group");
  connectionModal.removeAttribute("data-connection-count");
  if (connectionModalBody) {
    resetConnectionFormVisibility(connectionModalBody);
  }
  connectionWizardGroup = "commerce";
  connectionWizardChoice = "";
  pendingConnectionGroup = "";
  const title = connectionModal.querySelector("#connection-modal-title");
  if (title) title.textContent = "Nueva conexion";
  if (connectionModalPlatformPill) {
    connectionModalPlatformPill.textContent = "Plataforma: -";
    connectionModalPlatformPill.classList.add("is-off");
    connectionModalPlatformPill.classList.remove("is-ok");
  }
  setConnectionWizardStep("name");
  if (typeof document !== "undefined") {
    document.body.classList.remove("modal-open");
  }
}

function setConnectionGroup(group) {
  if (!connectionModal) return;
  const nextGroup = group || "commerce";
  connectionWizardGroup = nextGroup;
  connectionWizardChoice = "";
  connectionModal.setAttribute("data-connection-group", connectionWizardGroup);
  connectionModal.querySelectorAll("[data-connection-group-choice]").forEach((button) => {
    const isActive = button.getAttribute("data-connection-group-choice") === nextGroup;
    button.classList.toggle("is-active", isActive);
  });
  connectionModal.querySelectorAll("[data-connection-choice]").forEach((button) => {
    const groupKey = button.getAttribute("data-connection-group") || "";
    const show = groupKey === nextGroup;
    button.classList.toggle("is-hidden", !show);
  });
  updateConnectionChoiceCount();
  const scope = connectionModalBody || connectionModal;
  hideAllConnectionForms(scope);
  setConnectionWizardStep("platform");
  updateConnectionStoreHints();
}

function setConnectionChoice(kind) {
  if (!connectionModal) return;
  const choice = kind || "shopify";
  connectionWizardChoice = choice;
  const title = connectionModal.querySelector("#connection-modal-title");
  if (title) {
    title.textContent =
      choice === "woocommerce"
        ? "Conectar WooCommerce"
        : choice === "alegra"
          ? "Conectar Alegra"
          : choice === "google-ads"
            ? "Conectar Google Ads"
            : choice === "meta-ads"
              ? "Conectar Meta Ads"
              : choice === "tiktok-ads"
                ? "Conectar TikTok Ads"
                : choice === "shopify-marketing"
                  ? "Conectar Shopify Marketing"
                  : "Conectar Shopify";
  }
  if (connectionModalPlatformPill) {
    const label =
      choice === "woocommerce"
        ? "Plataforma: WooCommerce"
        : choice === "alegra"
          ? "Plataforma: Alegra"
          : choice === "google-ads"
            ? "Plataforma: Google Ads"
            : choice === "meta-ads"
              ? "Plataforma: Meta Ads"
              : choice === "tiktok-ads"
                ? "Plataforma: TikTok Ads"
                : choice === "shopify-marketing"
                  ? "Plataforma: Shopify Marketing"
                  : "Plataforma: Shopify";
    connectionModalPlatformPill.textContent = label;
    connectionModalPlatformPill.classList.remove("is-off");
    connectionModalPlatformPill.classList.add("is-ok");
  }
  connectionModal.querySelectorAll("[data-connection-choice]").forEach((button) => {
    const isActive = button.getAttribute("data-connection-choice") === choice;
    button.classList.toggle("is-active", isActive);
  });
  const scope = connectionModalBody || connectionModal;
  hideAllConnectionForms(scope);
  let visibleGroup = null;
  scope.querySelectorAll("[data-connection-kind]").forEach((block) => {
    const kinds = (block.getAttribute("data-connection-kind") || "").split(/\s+/).filter(Boolean);
    const shouldShow = kinds.includes(choice);
    if (block instanceof HTMLElement) {
      block.classList.toggle("is-hidden", !shouldShow);
      if (shouldShow) {
        visibleGroup = block.closest(".connections-group");
      }
    }
  });
  scope.querySelectorAll(".connections-group").forEach((group) => {
    group.classList.toggle("is-hidden", group !== visibleGroup);
  });
  connectionModal.setAttribute("data-connection-count", "1");
  updateConnectionButtonsState();
  setConnectionWizardStep("form");
  updateConnectionStoreHints();
}

function updateConnectionStoreHints() {
  const selectedStore = getSelectedStore();
  const label = selectedStore ? `Tienda: ${selectedStore.name}` : "";
  if (connectionStoreSelected) connectionStoreSelected.textContent = label;
  if (connectionStoreSelectedPlatform) connectionStoreSelectedPlatform.textContent = label;
  if (connectionModalStorePill) {
    connectionModalStorePill.textContent = label || "Tienda: -";
    connectionModalStorePill.classList.toggle("is-off", !label);
    connectionModalStorePill.classList.toggle("is-ok", Boolean(label));
  }
}

function getSettingsPaneFromPath() {
  if (typeof window === "undefined") return "";
  const pathname = window.location?.pathname || "";
  if (!isSettingsPath(pathname)) return "";
  return "connections";
}

function pruneSettingsPanesForPath() {
  if (typeof window === "undefined") return;
  if (!isSettingsPath(window.location?.pathname || "")) return;
  const activeKey = getSettingsPaneFromPath() || "connections";
  document.querySelectorAll("[data-settings-pane]").forEach((pane) => {
    const key = pane.getAttribute("data-settings-pane") || "";
    if (key !== activeKey) {
      pane.remove();
    } else {
      pane.classList.add("is-active");
      if (pane instanceof HTMLElement) pane.hidden = false;
    }
  });
}

function updateSettingsPath(paneKey, options = {}) {
  const { replace = false } = options || {};
  if (typeof window === "undefined") return;
  const next = resolveSettingsPaneKey(paneKey);
  const nextUrl = `/settings/${next}`;
  if (replace) {
    window.history.replaceState({ settingsPane: next }, "", nextUrl);
  } else {
    window.history.pushState({ settingsPane: next }, "", nextUrl);
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
  const { persist = true, updateUrl = false } = options || {};
  const next = resolveSettingsPaneKey(paneKey);
  const settingsSection = document.getElementById("settings");
  if (settingsSection && !settingsSection.classList.contains("is-active")) {
    activateNav("settings");
  }
  if (settingsPaneConnectionsToggle instanceof HTMLInputElement && settingsPaneStoresToggle instanceof HTMLInputElement) {
    if (next === "stores") {
      settingsPaneStoresToggle.checked = true;
    } else {
      settingsPaneConnectionsToggle.checked = true;
    }
  }
  document.querySelectorAll("[data-settings-pane]").forEach((pane) => {
    const isActive = pane.getAttribute("data-settings-pane") === next;
    pane.classList.toggle("is-active", isActive);
    if (pane instanceof HTMLElement) {
      pane.hidden = !isActive;
    }
  });
  if (settingsSubmenu) {
    settingsSubmenu.querySelectorAll("[data-settings-pane-link]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.getAttribute("data-settings-pane-link") === next
      );
    });
  }
  if (settingsSubnav) {
    settingsSubnav.querySelectorAll("[data-settings-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-settings-tab") === next);
    });
  }
  const settingsTopnav = document.getElementById("settings-topnav");
  if (settingsTopnav) {
    settingsTopnav.querySelectorAll("[data-settings-pane-link]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.getAttribute("data-settings-pane-link") === next
      );
    });
  }
  if (settingsPaneIndicator) {
    settingsPaneIndicator.textContent = "Conexiones";
    settingsPaneIndicator.classList.remove("is-ok");
  }
  if (updateUrl && isSettingsPath(window.location?.pathname || "")) {
    updateSettingsPath(next);
  }
  if (persist) saveSettingsPane(next);
  updateStoresDebug("setSettingsPane");
}

function syncSettingsPane() {
  const fromPath = getSettingsPaneFromPath();
  const stored = getStoredSettingsPane();
  setSettingsPane(fromPath || stored || "connections", { persist: false });
}

// Ensure initial state for contacts action buttons (if settings pane is visible).
updateContactsActionVisibility();

function updateSettingsSubmenuAvailability() {
  if (!settingsSubmenu) return;
  settingsSubmenu.querySelectorAll("[data-settings-pane-link]").forEach((button) => {
    const key = button.getAttribute("data-settings-pane-link") || "";
    if (key !== "stores") return;
    button.removeAttribute("disabled");
    button.classList.remove("is-disabled");
  });
}

function getSettingsPaneForElement(element) {
  if (!(element instanceof HTMLElement)) return "";
  const pane = element.closest("[data-settings-pane]");
  if (!(pane instanceof HTMLElement)) return "";
  const key = pane.getAttribute("data-settings-pane") || "";
  return key === "connections" ? key : "";
}

function ensureSettingsPaneForElement(element, options = {}) {
  const { persist = false } = options || {};
  const key = getSettingsPaneForElement(element);
  if (!key) return;
  setSettingsPane(key, { persist });
}

function initSettingsSubmenu() {
  if (settingsSubnav) {
    settingsSubnav.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      const button = target.closest("[data-settings-tab]");
      if (!(button instanceof HTMLElement)) return;
      const key = button.getAttribute("data-settings-tab") || "";
      if (key !== "stores" && key !== "connections" && key !== "marketing") return;
      setSettingsPane(key, { updateUrl: isSettingsPath(window.location?.pathname || "") });
      ensureSettingsVisibility();
    });
  }
  if (settingsPaneConnectionsToggle instanceof HTMLInputElement) {
    settingsPaneConnectionsToggle.addEventListener("change", () => {
      if (settingsPaneConnectionsToggle.checked) setSettingsPane("connections");
    });
  }
  if (settingsPaneStoresToggle instanceof HTMLInputElement) {
    settingsPaneStoresToggle.addEventListener("change", () => {
      if (settingsPaneStoresToggle.checked) setSettingsPane("stores");
    });
  }
  const settingsTopnav = document.getElementById("settings-topnav");
  if (settingsTopnav) {
    settingsTopnav.addEventListener("click", (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      const button = target.closest("[data-settings-pane-link]");
      if (!(button instanceof HTMLElement)) return;
      const key = button.getAttribute("data-settings-pane-link") || "";
      if (!key) return;
      if (isSettingsPath(window.location?.pathname || "")) {
        setSettingsPane(key, { updateUrl: true });
      } else {
        window.location.href = `/settings/${resolveSettingsPaneKey(key)}`;
        return;
      }
      ensureSettingsVisibility();
    });
  }
document.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) return;
  const quickGroup = target.closest("[data-connection-group-open]");
  if (quickGroup instanceof HTMLElement) {
    const group = quickGroup.getAttribute("data-connection-group-open") || "commerce";
    openConnectionModal(group);
    return;
  }
  const button = target.closest("[data-settings-tab]");
  if (!(button instanceof HTMLElement)) return;
  const key = button.getAttribute("data-settings-tab") || "";
    if (key !== "stores" && key !== "connections" && key !== "marketing") return;
    setSettingsPane(key, { updateUrl: isSettingsPath(window.location?.pathname || "") });
    ensureSettingsVisibility();
  });
  if (typeof window !== "undefined") {
    window.__setSettingsPane = (key) => setSettingsPane(key);
  }
  if (!settingsSubmenu) {
    syncSettingsPane();
    ensureSettingsVisibility();
    return;
  }
  settingsSubmenu.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const button = target.closest("[data-settings-pane-link]");
    if (!(button instanceof HTMLElement)) return;
    const key = button.getAttribute("data-settings-pane-link") || "";
    if (key !== "stores" && key !== "connections" && key !== "marketing") return;
    if (button.hasAttribute("disabled")) return;
    if (isSettingsPath(window.location?.pathname || "")) {
      activateNav("settings");
      setSettingsPane(key, { updateUrl: true });
    } else {
      window.location.href = `/settings/${resolveSettingsPaneKey(key)}`;
      return;
    }
    ensureSettingsVisibility();
  });
  updateSettingsSubmenuAvailability();
  syncSettingsPane();
  ensureSettingsVisibility();
}

function ensureSettingsVisibility() {
  const settingsSection = document.getElementById("settings");
  if (!settingsSection) return;
  if (!settingsSection.classList.contains("is-active")) return;
  settingsSection.querySelectorAll(".admin-only").forEach((panel) => {
    panel.style.display = "";
  });
  const hasActivePane = Boolean(settingsSection.querySelector(".settings-pane.is-active"));
  if (!hasActivePane) {
    setSettingsPane("connections", { persist: false });
  }
  updateStoresDebug("ensureSettingsVisibility");
}

function updateStoresDebug(source) {
  if (!storesDebugBar) return;
  const pane = document.querySelector('[data-settings-pane="stores"]');
  const paneActive = pane?.classList.contains("is-active") ? "on" : "off";
  const list = document.getElementById("store-active-list");
  const listCount = list?.children?.length || 0;
  const listHeight = list ? Math.round(list.getBoundingClientRect().height) : 0;
  const paneHeight = pane ? Math.round(pane.getBoundingClientRect().height) : 0;
  const switcher = document.getElementById("store-active-field");
  const switcherHeight = switcher ? Math.round(switcher.getBoundingClientRect().height) : 0;
  const group = document.querySelector('.settings-group.store-group[data-group="store"]');
  const groupExists = group ? "yes" : "no";
  const groupCollapsed = group?.classList.contains("is-collapsed") ? "yes" : "no";
  const storeCount = Array.isArray(storesCache) ? storesCache.length : 0;
  const activeDomain = normalizeShopDomain(activeStoreDomain || "");
  const hasConfig = activeStoreConfig ? "yes" : "no";
  const activeLabel = getActiveStoreLabel() || "-";
  storesDebugBar.textContent =
    `Estado Tiendas (${source || "idle"}): pane=${paneActive} paneH=${paneHeight} ` +
    `switcherH=${switcherHeight} list=${listCount} listH=${listHeight} ` +
    `stores=${storeCount} active=${activeLabel} domain=${activeDomain || "-"} ` +
    `config=${hasConfig} group=${groupExists} collapsed=${groupCollapsed}`;
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
    sidebarToggle.setAttribute("aria-label", collapsed ? "Abrir menú" : "Cerrar menú");
    sidebarToggle.setAttribute("title", collapsed ? "Abrir menú" : "Cerrar menú");
  }
  if (sidebarToggleIcon instanceof SVGPathElement) {
    sidebarToggleIcon.setAttribute("d", collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6");
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
    const target = item.getAttribute("data-target") || "";
    const opsView = item.getAttribute("data-ops-view") || "";
    if (target === "operations" && (opsView === "orders" || opsView === "invoices")) {
      setOperationsView(opsView);
      if (opsView === "invoices") invoicesStart = 0;
      else ordersStart = 0;
    }
    if (target === "settings") {
      if (!isSettingsPath(window.location?.pathname || "")) {
        markSettingsIntent();
        window.location.href = "/settings/connections";
        return;
      }
    }
    activateNav(target);
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
          panel.scrollIntoView({ behavior: "auto", block: "start" });
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
  if (navTarget === "settings") {
    markSettingsIntent();
    window.location.href = "/settings/connections";
    return;
  }
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

function openPhotosModal() {
  if (!photosModal) return;
  photosModal.classList.add("is-open");
  photosModal.setAttribute("aria-hidden", "false");
  photosErrorLog = [];
  if (photosErrors) photosErrors.textContent = "Sin errores.";
  if (photosStatus) photosStatus.textContent = "Sin datos";
  updatePhotosPublishUi();
  updatePhotosProgress(0, "Procesando 0%");
  setPhotosRunning(false);
}

function closePhotosModal() {
  if (!photosModal) return;
  photosModal.classList.remove("is-open");
  photosModal.setAttribute("aria-hidden", "true");
}

function downloadTextFile(filename, contents, mime = "text/plain;charset=utf-8") {
  const safeName = filename && String(filename).trim() ? String(filename).trim() : "archivo.txt";
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPhotosTemplateCsv() {
  const lines = [
    "sku,barcode,images,alt",
    'ABC123,,https://cdn.tu-dominio.com/img1.jpg|https://cdn.tu-dominio.com/img2.jpg,""',
    ',7701234567890,https://cdn.tu-dominio.com/img3.jpg,""',
  ];
  return `${lines.join("\r\n")}\r\n`;
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

if (photosClose) {
  photosClose.addEventListener("click", closePhotosModal);
}
if (photosModal) {
  photosModal.addEventListener("click", (event) => {
    if (event.target === photosModal) {
      closePhotosModal();
    }
  });
}

if (photosTemplate) {
  photosTemplate.addEventListener("click", () => {
    try {
      downloadTextFile("plantilla_fotos_shopify.csv", buildPhotosTemplateCsv(), "text/csv;charset=utf-8");
    } catch (error) {
      showToast(error?.message || "No se pudo descargar la plantilla.", "is-error");
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

function setPhotosRunning(running) {
  const isRunning = Boolean(running);
  if (photosRun instanceof HTMLButtonElement) photosRun.disabled = isRunning;
  if (photosStop instanceof HTMLButtonElement) {
    photosStop.hidden = !isRunning;
    photosStop.disabled = false;
  }
  if (photosProgress instanceof HTMLElement) {
    photosProgress.setAttribute("aria-hidden", isRunning ? "false" : "true");
    photosProgress.style.display = isRunning ? "" : "none";
  }
}

function updatePhotosPublishUi() {
  const enabled =
    photosPublishEnabled instanceof HTMLInputElement
      ? Boolean(photosPublishEnabled.checked)
      : false;
  if (photosPublishStatusField instanceof HTMLElement) {
    photosPublishStatusField.hidden = !enabled;
  }
}

function updatePhotosProgress(percent, label) {
  const safePercent = Number.isFinite(Number(percent)) ? Math.max(0, Math.min(100, Number(percent))) : 0;
  if (photosProgressBar instanceof HTMLElement) {
    photosProgressBar.style.width = `${safePercent}%`;
  }
  if (photosProgressLabel instanceof HTMLElement) {
    photosProgressLabel.textContent = label || `Procesando ${Math.round(safePercent)}%`;
  }
}

function parseCsvLine(line, delimiter) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function detectCsvDelimiter(headerLine) {
  const comma = (headerLine.match(/,/g) || []).length;
  const semicolon = (headerLine.match(/;/g) || []).length;
  const tab = (headerLine.match(/\t/g) || []).length;
  if (tab > comma && tab > semicolon) return "\t";
  if (semicolon > comma) return ";";
  return ",";
}

function normalizeUrlList(value) {
  const raw = typeof value === "string" ? value : "";
  const parts = raw
    .split(/[|,\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const out = [];
  for (const part of parts) {
    try {
      const url = new URL(part);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      out.push(url.toString());
    } catch {
      // ignore invalid URLs
    }
  }
  return Array.from(new Set(out));
}

async function parsePhotosFileToRows() {
  if (!(photosFile instanceof HTMLInputElement) || !photosFile.files || !photosFile.files.length) {
    throw new Error("Selecciona un archivo CSV.");
  }
  const file = photosFile.files[0];
  const text = await file.text();
  const lines = text
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => Boolean(line));
  if (!lines.length) {
    throw new Error("El archivo está vacío.");
  }
  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((h) => String(h || "").trim().toLowerCase());
  const idx = (name) => headers.indexOf(name);
  const matchBy = photosMatchBy instanceof HTMLSelectElement ? String(photosMatchBy.value || "sku") : "sku";
  const idCandidates =
    matchBy === "barcode"
      ? ["barcode", "codigo_barras", "codbarras", "ean", "upc", "code", "codigo", "identifier"]
      : ["sku", "reference", "referencia", "ref", "code", "codigo", "identifier"];
  const idIndex = idCandidates.map(idx).find((i) => i >= 0) ?? -1;
  const imagesIndex = ["images", "image_urls", "urls", "url", "image_url"].map(idx).find((i) => i >= 0) ?? -1;
  const imageCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^image(_\d+)?$/.test(h) || /^imageurl(_\d+)?$/.test(h) || /^url(_\d+)?$/.test(h))
    .map(({ i }) => i);
  const altIndex = ["alt", "alt_text", "texto_alt"].map(idx).find((i) => i >= 0) ?? -1;

  if (idIndex < 0) {
    throw new Error(`No encuentro la columna para ${matchBy}. Usa una columna "${matchBy}" o "identifier".`);
  }
  const rows = [];
  const parseErrors = [];
  const maxRows = 500;
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    if (rows.length >= maxRows) break;
    const values = parseCsvLine(lines[lineIndex], delimiter);
    const identifier = String(values[idIndex] || "").trim();
    if (!identifier) continue;
    const urls = [];
    if (imagesIndex >= 0) {
      urls.push(...normalizeUrlList(values[imagesIndex] || ""));
    }
    if (imageCols.length) {
      imageCols.forEach((i) => {
        urls.push(...normalizeUrlList(values[i] || ""));
      });
    }
    const deduped = Array.from(new Set(urls)).filter(Boolean);
    if (!deduped.length) {
      parseErrors.push(`Línea ${lineIndex + 1}: sin URLs para ${identifier}`);
      continue;
    }
    const alt = altIndex >= 0 ? String(values[altIndex] || "").trim() : "";
    rows.push({ identifier, urls: deduped.slice(0, 10), alt: alt || null });
  }
  if (!rows.length) {
    const detail = parseErrors.slice(0, 10).join("\n");
    throw new Error(detail ? `No pude leer filas válidas.\n${detail}` : "No pude leer filas válidas.");
  }
  if (photosErrors) {
    photosErrors.textContent = parseErrors.length ? parseErrors.slice(0, 60).join("\n") : "Sin errores.";
  }
  photosErrorLog = parseErrors.slice(0);
  return rows;
}

async function runPhotosBulkUpload() {
  const activeStore = getActiveStore();
  const storeConnections = getStoreConnections(activeStore);
  if (!activeStore) {
    showToast("Primero crea o selecciona una tienda activa en Nueva conexion.", "is-warn");
    if (photosStatus) photosStatus.textContent = "Sin tienda activa";
    return;
  }
  if (!storeConnections.shopifyConnected) {
    showToast("Conecta Shopify para cargar fotos.", "is-warn");
    if (photosStatus) photosStatus.textContent = "Falta Shopify";
    return;
  }

  setPhotosRunning(true);
  updatePhotosProgress(0, "Procesando 0%");
  if (photosStatus) photosStatus.textContent = "Leyendo archivo...";

  try {
    photosParsedRows = await parsePhotosFileToRows();
    if (photosStatus) photosStatus.textContent = `Archivo listo: ${photosParsedRows.length} filas`;
  } catch (error) {
    setPhotosRunning(false);
    showToast(error?.message || "No se pudo leer el archivo.", "is-error");
    if (photosStatus) photosStatus.textContent = error?.message || "Error leyendo archivo";
    return;
  }

  const matchBy = photosMatchBy instanceof HTMLSelectElement ? String(photosMatchBy.value || "sku") : "sku";
  const attachVariant =
    photosAttachVariant instanceof HTMLInputElement ? photosAttachVariant.checked !== false : true;
  const mode = photosMode instanceof HTMLSelectElement ? String(photosMode.value || "append") : "append";
  const publishEnabled =
    photosPublishEnabled instanceof HTMLInputElement ? photosPublishEnabled.checked === true : false;
  const publishStatus =
    photosPublishStatus instanceof HTMLSelectElement ? String(photosPublishStatus.value || "draft") : "draft";

  if (mode === "replace") {
    const ok = window.confirm(
      "Modo Reemplazar elimina fotos existentes del producto antes de subir las nuevas. ¿Seguro?"
    );
    if (!ok) {
      setPhotosRunning(false);
      if (photosStatus) photosStatus.textContent = "Cancelado por el usuario";
      return;
    }
  }
  if (publishEnabled) {
    const ok = window.confirm(
      `Cambiar estado del producto está activo. ¿Seguro que quieres forzar estado = ${publishStatus}?`
    );
    if (!ok) {
      setPhotosRunning(false);
      if (photosStatus) photosStatus.textContent = "Cancelado por el usuario";
      return;
    }
  }

  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  const controller = new AbortController();
  photosBulkAbort = controller;
  let latest = {
    total: photosParsedRows.length,
    processed: 0,
    matched: 0,
    imagesUploaded: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    if (photosStatus) photosStatus.textContent = "Subiendo fotos...";
    const response = await fetch("/api/sync/product-images?stream=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopDomain,
        matchBy,
        attachVariant,
        mode,
        publishEnabled,
        publishStatus,
        rows: photosParsedRows,
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(text || "No se pudo procesar el cargador de fotos.");
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
          activePhotosSyncId = payload.syncId || "";
          continue;
        }
        if (payload.type === "progress") {
          latest = {
            ...latest,
            total: payload.total ?? latest.total,
            processed: payload.processed ?? latest.processed,
            matched: payload.matched ?? latest.matched,
            imagesUploaded: payload.imagesUploaded ?? latest.imagesUploaded,
            skipped: payload.skipped ?? latest.skipped,
            failed: payload.failed ?? latest.failed,
          };
          const total = Number(latest.total) || 0;
          const processed = Number(latest.processed) || 0;
          const percent = total > 0 ? (processed / total) * 100 : 0;
          updatePhotosProgress(percent, `Procesando ${Math.round(percent)}%`);
          if (photosStatus) {
            photosStatus.textContent = `Procesados ${processed}/${total || "?"} · Encontrados ${latest.matched} · Imágenes ${latest.imagesUploaded} · Saltados ${latest.skipped} · Fallidos ${latest.failed}`;
          }
          continue;
        }
        if (payload.type === "row_error") {
          const message = payload.message || "Error";
          photosErrorLog.push(message);
          if (photosErrors) {
            const existing = String(photosErrors.textContent || "").trim();
            const next = existing && existing !== "Sin errores." ? `${existing}\n${message}` : message;
            photosErrors.textContent = next.split("\n").slice(-80).join("\n");
          }
          continue;
        }
        if (payload.type === "done") {
          if (photosStatus) {
            photosStatus.textContent =
              payload.message ||
              `Listo · Procesados ${latest.processed}/${latest.total} · Encontrados ${latest.matched} · Imágenes ${latest.imagesUploaded} · Fallidos ${latest.failed}`;
          }
          updatePhotosProgress(100, "Completado 100%");
          continue;
        }
        if (payload.type === "stopped") {
          if (photosStatus) {
            photosStatus.textContent = "Detenido";
          }
          continue;
        }
      }
    }
  } catch (error) {
    const message = error?.message || "No se pudo ejecutar el cargador de fotos.";
    if (photosStatus) photosStatus.textContent = message;
    showToast(message, "is-error");
  } finally {
    photosBulkAbort = null;
    setPhotosRunning(false);
  }
}

async function fetchJson(url, options) {
  const method = String(options?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const headers = new Headers(options?.headers || {});
    if (csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
    options = { ...(options || {}), headers };
  }
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    const message = error?.message || "fetch failed";
    throw new Error(message);
  }
  if (response.status === 401) {
    window.location.href = "/login.html";
    throw new Error("unauthorized");
  }
  if (!response.ok) {
    const text = await response.text();
    let message = text || "Error de red";
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        const asAny = parsed;
        message =
          (typeof asAny.error === "string" && asAny.error) ||
          (typeof asAny.message === "string" && asAny.message) ||
          message;
      }
    } catch {
      // ignore json parse errors
    }
    throw new Error(message || "Error de red");
  }
  return response.json();
}

async function ensureCsrfToken() {
  try {
    const data = await fetchJson("/api/auth/csrf");
    csrfToken = String(data?.token || "");
  } catch {
    csrfToken = "";
  }
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
  // Si el toggle está deshabilitado, su efecto es OFF (aunque conserve el check).
  if (toggle.disabled) return false;
  return Boolean(toggle.checked);
}

function formatControlLabelText(label) {
  if (!(label instanceof HTMLElement)) return "";
  const parts = [];
  label.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || "");
      return;
    }
    if (node instanceof HTMLElement && !node.classList.contains("tip")) {
      parts.push(node.textContent || "");
    }
  });
  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getControlLabelById(id) {
  if (!id) return "";
  const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
  return formatControlLabelText(label);
}

function buildDependencyDisabledReason(element) {
  if (!(element instanceof HTMLElement)) return "";
  const custom = element.getAttribute("data-disabled-message");
  if (custom && custom.trim()) return custom.trim();
  const ids = parseDependsOn(element.getAttribute("data-depends-on") || "");
  const firstOffId = ids.find((id) => !isToggleOnById(id)) || ids[0] || "";
  const label = firstOffId ? getControlLabelById(firstOffId) : "";
  if (label) return `Activa “${label}” para habilitar esta función.`;
  return "Activa la opción requerida para habilitar esta función.";
}

function setDependentEnabled(element, enabled) {
  const shouldDisable = !enabled;
  const nodes = [];
  const controllerIds =
    element instanceof HTMLElement
      ? parseDependsOn(element.getAttribute("data-depends-on") || "")
      : [];
  const isStandaloneContainer =
    element instanceof HTMLElement &&
    element.matches(".mode-grid, .mode-toggle-grid, .settings-grid, .toolbar, details.multi-select");
  const container =
    element instanceof HTMLElement && !isStandaloneContainer
      ? element.closest(".mode-field, .mode-toggle, .field, .mode-section, .module") || element
      : element instanceof HTMLElement
        ? element
        : null;
  const visualTarget = element instanceof HTMLElement ? element : (container instanceof HTMLElement ? container : null);
  const wasDisabled = visualTarget instanceof HTMLElement ? visualTarget.classList.contains("is-dep-disabled") : false;

  if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement || element instanceof HTMLButtonElement) {
    nodes.push(element);
  } else if (element instanceof HTMLElement) {
    element
      .querySelectorAll("input, select, textarea, button")
      .forEach((node) => nodes.push(node));
  }

  nodes.forEach((node) => {
    if (node instanceof HTMLElement && node.getAttribute("data-dep-controller") === "1") return;
    // Nunca deshabilitar los toggles que actuan como prerequisito del mismo contenedor.
    // Esto evita el bug UX: "apago y ya no puedo volver a prender" cuando el controlador vive dentro del bloque dependiente.
    if (node instanceof HTMLElement && node.id && controllerIds.includes(node.id)) return;
    node.disabled = shouldDisable;
  });

  if (visualTarget instanceof HTMLElement) {
    visualTarget.classList.toggle("is-dep-disabled", shouldDisable);
    if (shouldDisable) {
      visualTarget.setAttribute("data-disabled-reason", buildDependencyDisabledReason(element));
    } else {
      visualTarget.removeAttribute("data-disabled-reason");
    }
  }

  if (element instanceof HTMLElement) {
    element.querySelectorAll("details").forEach((details) => {
      if (shouldDisable) details.open = false;
      const summary = details.querySelector("summary");
      if (summary instanceof HTMLElement) {
        summary.setAttribute("aria-disabled", shouldDisable ? "true" : "false");
        summary.tabIndex = shouldDisable ? -1 : 0;
      }
    });
  }

  const isDisabledNow = visualTarget instanceof HTMLElement ? visualTarget.classList.contains("is-dep-disabled") : false;
  return wasDisabled !== isDisabledNow;
}

function updateMultiSelectDropdownDirection(details) {
  if (!(details instanceof HTMLDetailsElement)) return;
  if (!details.classList.contains("multi-select")) return;
  if (!details.open) {
    details.removeAttribute("data-open-up");
    return;
  }
  const dropdown = details.querySelector(".checkbox-grid");
  if (!(dropdown instanceof HTMLElement)) return;
  const detailsRect = details.getBoundingClientRect();
  const dropdownRect = dropdown.getBoundingClientRect();
  const spaceBelow = window.innerHeight - detailsRect.bottom;
  const spaceAbove = detailsRect.top;
  const needsUp = spaceBelow < dropdownRect.height + 12 && spaceAbove > spaceBelow;
  details.setAttribute("data-open-up", needsUp ? "1" : "0");
  if (!needsUp) {
    details.removeAttribute("data-open-up");
  }
}

function setupMultiSelectDropdowns() {
  document.querySelectorAll("details.multi-select").forEach((node) => {
    if (!(node instanceof HTMLDetailsElement)) return;
    node.addEventListener("toggle", () => {
      if (!node.open) {
        node.removeAttribute("data-open-up");
        return;
      }
      requestAnimationFrame(() => {
        updateMultiSelectDropdownDirection(node);
        node.scrollIntoView({ block: "nearest" });
      });
    });
  });
  window.addEventListener(
    "resize",
    () => {
      document.querySelectorAll("details.multi-select[open]").forEach((node) => {
        updateMultiSelectDropdownDirection(node);
      });
    },
    { passive: true },
  );
}

function openTransferOriginPicker() {
  if (!(cfgTransferOriginField instanceof HTMLElement)) return;
  const details = cfgTransferOriginField.querySelector("details.multi-select");
  if (!(details instanceof HTMLDetailsElement)) return;
  details.open = true;
  requestAnimationFrame(() => {
    updateMultiSelectDropdownDirection(details);
    const summary = details.querySelector("summary");
    if (summary instanceof HTMLElement) {
      summary.focus();
    }
  });
}

function applyToggleDependencies() {
  const dependents = Array.from(document.querySelectorAll("[data-depends-on]")).filter(
    (element) => element instanceof HTMLElement,
  );

  // Puede haber dependencias en cadena (A depende de X y B depende de A).
  // Aplicamos varias pasadas para que el apagado se propague en el mismo "change".
  for (let pass = 0; pass < 6; pass += 1) {
    let changed = false;
    dependents.forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      const ids = parseDependsOn(element.getAttribute("data-depends-on") || "");
      if (!ids.length) return;
      const enabled = ids.every((id) => isToggleOnById(id));
      changed = setDependentEnabled(element, enabled) || changed;
    });
    if (!changed) break;
  }
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

function initDependencyDisabledToasts() {
  let lastToastAt = 0;
  let lastMessage = "";
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      if (target.closest(".tip, .tip-popover, .toast, .help-panel, .help-launch")) return;
      if (target.closest('[data-dep-controller="1"]')) return;

      const disabledContainer = target.closest(".is-dep-disabled[data-disabled-reason]");
      if (!(disabledContainer instanceof HTMLElement)) return;
      const message = (disabledContainer.getAttribute("data-disabled-reason") || "").trim();
      if (!message) return;

      const now = Date.now();
      if (message === lastMessage && now - lastToastAt < 900) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      lastToastAt = now;
      lastMessage = message;

      event.preventDefault();
      event.stopPropagation();
      showToast(message, "is-warn", { timeoutMs: 4500 });
    },
    true,
  );
}

function initTips() {
  let tipPopoverEl = null;
  let tipPopoverTextEl = null;
  let tipPopoverCloseEl = null;
  let activeTipEl = null;
  let tipRepositionHandler = null;

  function formatTipMessage(raw) {
    const base = String(raw || "");
    const withNewlines = base.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
    const lines = withNewlines
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return lines.join("\n").trim();
  }

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
    tipPopoverTextEl.textContent = formatTipMessage(message) || "Sin ayuda.";

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
    updateConnectionButtonsState();
  });
  if (shopifyToken) {
    shopifyToken.addEventListener("input", () => {
      if (shopifyToken.value.trim() && getShopifyConnectMethod() !== "token") {
        setShopifyConnectMethod("token");
        updateConnectionButtonsState();
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

function resolveUserRole(role, isSuperAdminFlag) {
  if (isSuperAdminFlag) return "super_admin";
  if (role === "admin") return "admin";
  return "agent";
}

function applyRoleAccess(role, isSuperAdminFlag) {
  currentUserRole = resolveUserRole(role, isSuperAdminFlag);
  currentUserIsSuperAdmin = Boolean(isSuperAdminFlag);
  const isAdmin = currentUserRole === "admin" || currentUserIsSuperAdmin;
  const settingsNav = document.querySelector('.nav-item[data-target="settings"]');
  const logsNav = document.querySelector('.nav-item[data-target="logs"]');
  const adminOnlyPanels = document.querySelectorAll(".admin-only");
  if (settingsNav) settingsNav.style.display = isAdmin ? "" : "none";
  adminOnlyPanels.forEach((panel) => {
    const inSettings = panel.closest("#settings");
    panel.style.display = isAdmin || inSettings ? "" : "none";
  });

  const logsSection = document.getElementById("logs");
  if (logsNav) logsNav.style.display = currentUserIsSuperAdmin ? "" : "none";
  if (logsSection) logsSection.style.display = currentUserIsSuperAdmin ? "" : "none";

  if (navSuperadmin instanceof HTMLElement) {
    navSuperadmin.style.display = currentUserIsSuperAdmin ? "" : "none";
  }
  loadBillingTopbar().catch(() => null);
  updateSettingsSubmenuAvailability();
  applyUserRoleControls();
}

function applyUserRoleControls() {
  if (!(userRoleInput instanceof HTMLSelectElement)) return;
  if (!currentUserIsSuperAdmin) {
    userRoleInput.value = "agent";
    userRoleInput.disabled = true;
    userRoleInput.title = "Solo super admin puede asignar roles.";
  } else {
    userRoleInput.disabled = false;
    userRoleInput.title = "";
  }
}

function setTenantModules(items) {
  const next = {};
  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (!item || !item.key) return;
      next[String(item.key)] = Boolean(item.enabled);
    });
  }
  tenantModules = next;
}

function isModuleEnabled(moduleKey) {
  if (!moduleKey) return true;
  if (!(moduleKey in tenantModules)) return true;
  return Boolean(tenantModules[moduleKey]);
}

function setModuleBlockDisabled(block, disabled, message) {
  if (!(block instanceof HTMLElement)) return;
  block.classList.toggle("is-disabled", disabled);
  const hintClass = "module-disabled-hint";
  const existing = block.querySelector(`.${hintClass}`);
  if (disabled) {
    const hint =
      existing ||
      Object.assign(document.createElement("p"), {
        className: `field-hint ${hintClass}`,
      });
    hint.textContent = message || "Desactivado por ApiFlujos.";
    if (!existing) {
      block.appendChild(hint);
    }
  } else if (existing) {
    existing.remove();
  }
  block.querySelectorAll("input, select, textarea, button").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (disabled) {
      if (!el.hasAttribute("data-module-disabled")) {
        el.setAttribute("data-module-disabled", "1");
        if ("disabled" in el) {
          el.disabled = true;
        }
      }
    } else if (el.getAttribute("data-module-disabled") === "1") {
      el.removeAttribute("data-module-disabled");
      if ("disabled" in el) {
        el.disabled = false;
      }
    }
  });
}

function applyConnectionModule(moduleKey, button, label) {
  if (!(button instanceof HTMLElement)) return;
  const enabled = isModuleEnabled(moduleKey);
  const block = button.closest(".connection-block");
  if (block) {
    setModuleBlockDisabled(block, !enabled, `${label} desactivado por ApiFlujos.`);
    return;
  }
  if (!enabled) {
    if (!button.hasAttribute("data-module-disabled")) {
      button.setAttribute("data-module-disabled", "1");
      if ("disabled" in button) {
        button.disabled = true;
      }
    }
    button.title = `${label} desactivado por ApiFlujos.`;
  } else if (button.getAttribute("data-module-disabled") === "1") {
    button.removeAttribute("data-module-disabled");
    if ("disabled" in button) {
      button.disabled = false;
    }
    button.title = "";
  }
}

function applyAiModule() {
  const enabled = isModuleEnabled("ia");
  const nodes = [aiKey, aiSave].filter((node) => node instanceof HTMLElement);
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (!enabled) {
      if (!node.hasAttribute("data-module-disabled")) {
        node.setAttribute("data-module-disabled", "1");
        if ("disabled" in node) {
          node.disabled = true;
        }
      }
    } else if (node.getAttribute("data-module-disabled") === "1") {
      node.removeAttribute("data-module-disabled");
      if ("disabled" in node) {
        node.disabled = false;
      }
    }
  });
}

function applyTenantModules() {
  applyConnectionModule("shopify", connectShopify, "Shopify");
  applyConnectionModule("woocommerce", connectWooCommerce, "WooCommerce");
  applyConnectionModule("alegra", connectAlegra, "Alegra");
  applyConnectionModule("google_ads", connectGoogleAds, "Google Ads");
  applyConnectionModule("meta_ads", connectMetaAds, "Meta Ads");
  applyConnectionModule("tiktok_ads", connectTikTokAds, "TikTok Ads");
  applyAiModule();
}

async function loadTenantModules() {
  try {
    const data = await fetchJson("/api/modules");
    setTenantModules(data.items || []);
    applyTenantModules();
  } catch {
    // ignore if not allowed
  }
}

async function loadCurrentUser() {
  try {
    const data = await fetchJson("/api/profile");
    const user = data.user || {};
    currentUserId = user.id || null;
    currentUserIsSuperAdmin = Boolean(user.isSuperAdmin);
    const resolvedRole = resolveUserRole(user.role, user.isSuperAdmin);
    const roleLabel = resolvedRole === "super_admin" ? "Super Admin" : (resolvedRole === "admin" ? "Admin" : "Agente");
    if (userName) userName.textContent = user.name || user.email || "Usuario";
    if (userRole) userRole.textContent = roleLabel;
    if (userAvatar) {
      userAvatar.src = user.photoBase64 || "/assets/avatar.png";
    }
    if (profileName) profileName.value = user.name || "";
    if (profileEmail) profileEmail.value = user.email || "";
    if (profilePhone) profilePhone.value = user.phone || "";
    applyRoleAccess(user.role, user.isSuperAdmin);
  } catch {
    try {
      const auth = await fetchJson("/api/auth/me");
      const user = auth.user || {};
      currentUserId = user.id || null;
      currentUserIsSuperAdmin = Boolean(user.isSuperAdmin);
      const resolvedRole = resolveUserRole(user.role, user.isSuperAdmin);
      const roleLabel = resolvedRole === "super_admin" ? "Super Admin" : (resolvedRole === "admin" ? "Admin" : "Agente");
      if (userName) userName.textContent = user.name || user.email || "Usuario";
      if (userRole) userRole.textContent = roleLabel;
      if (userAvatar) {
        userAvatar.src = user.photoBase64 || "/assets/avatar.png";
      }
      if (profileName) profileName.value = user.name || "";
      if (profileEmail) profileEmail.value = user.email || "";
      if (profilePhone) profilePhone.value = user.phone || "";
      applyRoleAccess(user.role, user.isSuperAdmin);
    } catch {
      applyRoleAccess("agent", false);
    }
  }
}

function openPanelInSection(sectionId, panelId) {
  sections.forEach((section) => {
    section.classList.toggle("is-active", section.id === sectionId);
  });
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.scrollIntoView({ behavior: "auto", block: "start" });
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
    if (clientLogo) {
      if (data.logoBase64) {
        clientLogo.src = data.logoBase64;
        clientLogo.style.display = "";
        clientLogo.closest(".topbar-brand")?.classList.add("has-client-logo");
      } else {
        clientLogo.src = "";
        clientLogo.style.display = "none";
        clientLogo.closest(".topbar-brand")?.classList.remove("has-client-logo");
      }
    }
    if (companyName) companyName.value = data.name || "";
    if (companyPhone) companyPhone.value = data.phone || "";
    if (companyAddress) companyAddress.value = data.address || "";
  } catch {
    // ignore load errors
  }
}

async function loadBranding() {
  try {
    const response = await fetch("/brand.json", { cache: "no-cache" });
    if (!response.ok) return;
    const brand = await response.json();
    const appTitle = String(brand.appTitle || "").trim();
    const clientName = String(brand.clientName || "").trim();
    if (appTitle) {
      document.title = clientName ? `${appTitle} · ${clientName}` : appTitle;
    }
    if (heroTitle && brand.heroTitle) {
      heroTitle.textContent = String(brand.heroTitle);
    } else if (heroTitle && clientName) {
      heroTitle.textContent = `Panorama operativo · ${clientName}`;
    }
    if (heroSubtitle && brand.heroSubtitle) {
      heroSubtitle.textContent = String(brand.heroSubtitle);
    }
    if (assistantTag && brand.assistantTag) {
      assistantTag.textContent = String(brand.assistantTag);
    }
    if (assistantInput && brand.assistantPlaceholder) {
      assistantInput.placeholder = String(brand.assistantPlaceholder);
    }
  } catch {
    // ignore branding errors
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
    if (clientLogo) {
      if (data.logoBase64) {
        clientLogo.src = data.logoBase64;
        clientLogo.style.display = "";
        clientLogo.closest(".topbar-brand")?.classList.add("has-client-logo");
      } else {
        clientLogo.src = "";
        clientLogo.style.display = "none";
        clientLogo.closest(".topbar-brand")?.classList.remove("has-client-logo");
      }
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
          <button class="ghost" data-user-delete="${user.id}">Eliminar</button>
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
      password: userPasswordInput ? userPasswordInput.value : "",
    };
    if (currentUserIsSuperAdmin && userRoleInput) {
      payload.role = userRoleInput.value;
    }
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
  if (logEntity instanceof HTMLSelectElement && logEntity.value) {
    params.set("entity", logEntity.value);
  }
  if (logOrderId.value) {
    params.set("orderId", logOrderId.value);
  }
  try {
    const data = await fetchJson(`/api/logs?${params.toString()}`);
    if (data?.error) {
      renderLogs([]);
      renderErrors([]);
      logTableBody.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(data.error)}</td></tr>`;
      queueStatus.textContent = data.error;
      return;
    }
    renderLogs(data.items || []);
  } catch (error) {
    const message = error?.message || "No se pudieron cargar los logs.";
    logTableBody.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(message)}</td></tr>`;
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
  if (productsSyncProgress && productsSyncProgressBar && productsSyncProgressLabel) {
    productsSyncProgress.classList.add("is-active");
    productsSyncProgressBar.style.width = `${normalized}%`;
    productsSyncProgressLabel.textContent = labelText;
  }
}

function finishProductsProgress(labelText) {
  const finalText = labelText || "Productos 100%";
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

function updateContactsProgress(percent, labelText) {
  const normalized = Math.min(100, Math.max(0, percent));
  if (contactsProgress && contactsProgressBar && contactsProgressLabel) {
    contactsProgress.classList.add("is-active");
    contactsProgressBar.style.width = `${normalized}%`;
    contactsProgressLabel.textContent = labelText;
  }
  if (contactsSyncProgress && contactsSyncProgressBar && contactsSyncProgressLabel) {
    contactsSyncProgress.classList.add("is-active");
    contactsSyncProgressBar.style.width = `${normalized}%`;
    contactsSyncProgressLabel.textContent = labelText;
  }
}

function finishContactsProgress(labelText) {
  const finalText = labelText || "Contactos 100%";
  if (contactsProgress && contactsProgressBar && contactsProgressLabel) {
    contactsProgressBar.style.width = "100%";
    contactsProgressLabel.textContent = finalText;
    setTimeout(() => {
      contactsProgress.classList.remove("is-active");
      contactsProgressBar.style.width = "0%";
    }, 800);
  }
  if (contactsSyncProgress && contactsSyncProgressBar && contactsSyncProgressLabel) {
    contactsSyncProgressBar.style.width = "100%";
    contactsSyncProgressLabel.textContent = finalText;
    setTimeout(() => {
      contactsSyncProgress.classList.remove("is-active");
      contactsSyncProgressBar.style.width = "0%";
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
  // UX: algunos modulos dejan secciones "libres" (por ejemplo, acciones masivas).
  // En esos casos no mostramos "Bloqueado" como si todo estuviera bloqueado.
  const hasReadonlyFree = Boolean(panel.querySelector('[data-readonly-free="1"]'));
  panel.classList.toggle("is-partial-readonly", Boolean(readonly) && hasReadonlyFree);
  const controls = panel.querySelectorAll("input, select, textarea");
  controls.forEach((control) => {
    if (control.closest(".panel-actions") || control.closest(".module-footer")) return;
    if (control.closest("[data-readonly-free=\"1\"]")) return;
    // Los toggles/controladores de dependencias deben poder cambiarse aun en modo readonly.
    // Ej: toggles padre en encabezados (Activar automático / Procesar pedidos / etc.).
    if (control instanceof HTMLElement && control.getAttribute("data-dep-controller") === "1") {
      control.disabled = false;
      return;
    }
    if (readonly) {
      control.disabled = true;
    } else {
      control.disabled = false;
    }
  });
  panel.querySelectorAll("details").forEach((details) => {
    if (!readonly) return;
    if (details.closest("[data-readonly-free=\"1\"]")) return;
    // UX: mantener el estado visual; solo bloqueamos interacciones por CSS.
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
	  clearFieldError(cfgObservationsExtra);
	  clearFieldWarning(cfgResolution);
	  clearFieldWarning(cfgWarehouse);
	  clearFieldWarning(cfgPaymentMethod);
	  clearFieldWarning(cfgBankAccount);
	  clearFieldWarning(cfgApplyPayment);
	  clearFieldWarning(cfgEinvoiceEnabled);
	  setModuleWarning("alegra-invoice", "");
	}

	function clearTransferErrors() {
	  clearFieldError(cfgTransferDestMode);
	  clearFieldWarning(cfgTransferDestMode);
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
  const pathname = window?.location?.pathname || "";
  const allowSettingsFocus =
    document.body.classList.contains("force-settings") || isSettingsPath(pathname);
  if (!allowSettingsFocus) {
    return;
  }
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
  field.scrollIntoView({ behavior: "auto", block: "center" });
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
  if (connectionStoreSelect) clearFieldError(connectionStoreSelect);
  if (shopifyDomain) clearFieldError(shopifyDomain);
  if (alegraEmail) clearFieldError(alegraEmail);
  if (alegraKey) clearFieldError(alegraKey);
  if (shopifyToken) clearFieldError(shopifyToken);

  const domainInput = normalizeShopDomain(shopifyDomain?.value || "");
  const activeDomain = normalizeShopDomain(activeStoreDomain || "");
  const resolvedDomain = domainInput || activeDomain;
  const hasActiveContext = Boolean(activeDomain);
  const selectedStoreId =
    connectionStoreSelect instanceof HTMLSelectElement ? connectionStoreSelect.value : "";
  const selectedStore = getStoreByIdFromCatalog(selectedStoreId);
  const resolvedName = selectedStore ? selectedStore.name : "";
  const hasShopifyContext = Boolean(resolvedDomain);

  if (!resolvedName) {
    errors.push({ field: connectionStoreSelect, message: "Selecciona una tienda." });
  }
  if (kind !== "alegra" || hasShopifyContext) {
    if (!resolvedDomain) {
      errors.push({ field: shopifyDomain, message: "Dominio Shopify requerido." });
    }
  }
  if (kind === "shopify" && getShopifyConnectMethod() === "token") {
    if (!shopifyToken || !shopifyToken.value.trim()) {
      errors.push({ field: shopifyToken, message: "Clave de acceso de Shopify requerida." });
    }
  }
  if (kind === "alegra") {
    if (alegraAccountSelect && alegraAccountSelect.value !== "new") {
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
  const einvoiceOn =
    cfgEinvoiceEnabled instanceof HTMLInputElement ? Boolean(cfgEinvoiceEnabled.checked) : false;
  const ordersShopifyEnabled =
    syncOrdersShopifyEnabled instanceof HTMLInputElement
      ? Boolean(syncOrdersShopifyEnabled.checked)
      : true;
	  const orderMode =
	    ordersShopifyEnabled && syncOrdersShopify ? syncOrdersShopify.value : "off";
	  const invoiceRequired = orderMode === "invoice";
	  const errors = [];
	  const recommendations = [];
		  if (cfgApplyPayment && cfgApplyPayment.checked) {
		    if (!cfgPaymentMethod || !String(cfgPaymentMethod.value || "").trim()) {
		      if (invoiceRequired) {
		        errors.push({
		          field: cfgPaymentMethod,
		          message: "Método de pago requerido (o apaga “Aplicar pago”).",
		        });
		      } else {
		        recommendations.push("Método de pago");
		      }
		    }
		    if (!cfgBankAccount || !String(cfgBankAccount.value || "").trim()) {
		      if (invoiceRequired) {
		        errors.push({
		          field: cfgBankAccount,
		          message: "Cuenta bancaria requerida (o apaga “Aplicar pago”).",
		        });
		      } else {
		        recommendations.push("Cuenta bancaria");
		      }
		    }
		  }

  if (einvoiceOn) {
    if (!cfgResolution || !String(cfgResolution.value || "").trim()) {
      if (invoiceRequired) {
        errors.push({ field: cfgResolution, message: "Resolución DIAN requerida." });
      } else {
        recommendations.push("Resolución DIAN");
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
  if (recommendations.length) {
    if (einvoiceOn && (!cfgResolution || !String(cfgResolution.value || "").trim())) {
      markFieldWarning(cfgResolution, "Recomendado: Resolución DIAN.");
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
	  const destinationMode = getTransferDestinationMode();
	  const destinationRequired = isTransferDestinationRequired();
	  const strategy = cfgTransferStrategy ? cfgTransferStrategy.value || "manual" : "manual";
	  const selectedOrigins = getSelectedTransferOriginIds();
	  if (destinationRequired) {
	    if (!cfgTransferDest || !String(cfgTransferDest.value || "").trim()) {
	      errors.push({
	        field: destinationMode === "auto" ? cfgTransferDestMode : cfgTransferDest,
	        message:
	          destinationMode === "auto"
	            ? "Define el destino automático (usa Bodega prioritaria o cambia a Fija)."
	            : "Bodega destino requerida.",
	      });
	    }
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
  const ordersShopifyEnabled =
    syncOrdersShopifyEnabled instanceof HTMLInputElement
      ? Boolean(syncOrdersShopifyEnabled.checked)
      : true;
  const orderMode =
    ordersShopifyEnabled && syncOrdersShopify ? syncOrdersShopify.value : "off";
  if (orderMode === "invoice") {
    validateInvoiceModule();
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

  const invoicePanel = ordersBody.querySelector('.module[data-module="alegra-invoice"]');
  const logisticsPanel = ordersBody.querySelector('.module[data-module="alegra-logistics"]');
  if (syncOrdersPanel) ordersBody.appendChild(syncOrdersPanel);
  if (logisticsPanel) ordersBody.appendChild(logisticsPanel);
  if (invoicePanel) ordersBody.appendChild(invoicePanel);
}

function openDefaultGroups() {
  const openKeys = new Set([
    "marketing",
    "ads",
    "store-sync",
    "store",
    "products",
    "orders",
    "contacts",
    "operations",
    "admin",
    "commerce",
    "accounting",
  ]);
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
    "sync-contacts": "contacts",
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
  const ordersShopifyEnabled =
    syncOrdersShopifyEnabled instanceof HTMLInputElement
      ? Boolean(syncOrdersShopifyEnabled.checked)
      : true;
  const orderMode =
    ordersShopifyEnabled && syncOrdersShopify ? syncOrdersShopify.value : "off";
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
  const ordersShopifyEnabled =
    syncOrdersShopifyEnabled instanceof HTMLInputElement
      ? Boolean(syncOrdersShopifyEnabled.checked)
      : true;
  const orderMode =
    ordersShopifyEnabled && syncOrdersShopify ? syncOrdersShopify.value : "off";
  if (moduleKey === "sync-orders") {
    const needsAutomation = Boolean(syncOrdersShopifyEnabled?.checked);
    if (needsAutomation && !shopifyWebhooksStatus?.classList.contains("is-ok")) {
      return { complete: false, focusTarget: syncOrdersShopifyEnabled || shopifyWebhooksStatus };
    }
    return { complete: true, focusTarget: null };
  }
  if (moduleKey === "alegra-invoice") {
    if (orderMode !== "invoice") return { complete: true, focusTarget: null };
    const einvoiceOn =
      cfgEinvoiceEnabled instanceof HTMLInputElement ? Boolean(cfgEinvoiceEnabled.checked) : false;
    if (einvoiceOn && (!cfgResolution || !String(cfgResolution.value || "").trim())) {
      return { complete: false, focusTarget: cfgResolution };
    }
    if (cfgApplyPayment && cfgApplyPayment.checked) {
      if (!cfgPaymentMethod || !String(cfgPaymentMethod.value || "").trim()) {
        return { complete: false, focusTarget: cfgPaymentMethod };
      }
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
        return { index, moduleKey, focusTarget: syncOrdersShopifyEnabled || shopifyWebhooksStatus };
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
  // Sin botones Editar/Guardar: si se habilita por prerequisitos, debe quedar editable.
  const explicitReadonly = panel.getAttribute("data-module-readonly") === "true";
  if (!enabled) setModuleReadonly(panel, true);
  else if (!explicitReadonly) setModuleReadonly(panel, false);
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
  const activeId = getActiveStoreId();
  if (activeId && Array.isArray(storesCatalog)) {
    const byId = storesCatalog.find((store) => Number(store.id) === Number(activeId));
    if (byId) return byId;
  }
  const domain = normalizeShopDomain(activeStoreDomain || "");
  if (!domain) return null;
  return (
    storesCache.find(
      (store) => normalizeShopDomain(store.shopDomain || "") === domain
    ) || null
  );
}

function getStoreConnections(store) {
  if (store?.shopify || store?.alegra || store?.woo) {
    const shopifyOk =
      Boolean(store?.shopify?.shopifyConnected ?? store?.shopify?.status === "Conectado") &&
      !store?.shopify?.shopifyNeedsReconnect;
    const alegraOk = Boolean(store?.alegra) && !store?.alegra?.needsReconnect;
    const wooOk =
      Boolean(store?.woo?.ok) ||
      (Array.isArray(wooStoresCache) &&
        wooStoresCache.some((wooStore) => String(wooStore.storeId || wooStore.store_id || "") === String(store?.id || "")));
    return { shopifyConnected: shopifyOk, alegraConnected: alegraOk, wooConnected: wooOk };
  }
  return {
    shopifyConnected: Boolean(store?.shopifyConnected ?? store?.status === "Conectado"),
    alegraConnected: Boolean(store?.alegraConnected ?? store?.alegraAccountId),
    wooConnected:
      Array.isArray(wooStoresCache) &&
      wooStoresCache.some((wooStore) => String(wooStore.storeId || wooStore.store_id || "") === String(store?.id || "")),
  };
}

function resolvePrereqState(requirements, context) {
  const { hasStore, shopifyConnected, alegraConnected, wooConnected } = context;
  const commerceConnected = Boolean(shopifyConnected || wooConnected);
  if (requirements.store && !hasStore) {
    return { enabled: false, message: "Primero crea una tienda en Nueva conexion." };
  }
  if (requirements.shopify && requirements.alegra) {
    if (!commerceConnected && !alegraConnected) {
    return { enabled: false, message: "Conecta una plataforma de e‑commerce y una contable para activar este modulo." };
    }
    if (!commerceConnected) {
      return { enabled: false, message: "Conecta una plataforma de e‑commerce para activar este modulo." };
    }
    if (!alegraConnected) {
      return { enabled: false, message: "Conecta una plataforma contable para activar este modulo." };
    }
  } else if (requirements.shopify && !commerceConnected) {
    return { enabled: false, message: "Conecta una plataforma de e‑commerce para activar este modulo." };
  } else if (requirements.alegra && !alegraConnected) {
    return { enabled: false, message: "Conecta una plataforma contable para activar este modulo." };
  }
  return { enabled: true, message: "" };
}

function resolveCommerceOrAlegraState(context) {
  const { hasStore, shopifyConnected, alegraConnected, wooConnected } = context;
  const commerceConnected = Boolean(shopifyConnected || wooConnected);
  if (!hasStore) {
    return { enabled: false, message: "Primero crea una tienda en Nueva conexion." };
  }
  if (!commerceConnected && !alegraConnected) {
    return { enabled: false, message: "Conecta Shopify/WooCommerce o Alegra para activar este modulo." };
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

function setModuleVisible(moduleKey, visible) {
  const panel = getModulePanel(moduleKey);
  if (!panel) return;
  panel.classList.toggle("is-hidden", !visible);
}

function setGroupVisible(groupKey, visible) {
  const group = document.querySelector(`.settings-group.provider-group[data-group="${groupKey}"]`);
  if (!group) return;
  group.classList.toggle("is-hidden", !visible);
}

function setConnectionContextClasses({ shopifyConnected, alegraConnected, wooConnected }) {
  const commerceOk = Boolean(shopifyConnected || wooConnected);
  document.body.classList.toggle("has-commerce", commerceOk);
  document.body.classList.toggle("no-commerce", !commerceOk);
  document.body.classList.toggle("has-alegra", Boolean(alegraConnected));
  document.body.classList.toggle("no-alegra", !alegraConnected);
}

function updateConnectionModuleCards(context) {
  const commerceCard = document.querySelector('[data-connection-group-open="commerce"]');
  if (commerceCard) {
    const title = commerceCard.querySelector(".module-card-title");
    if (title) title.textContent = "E‑commerce";
    const subtitle = commerceCard.querySelector(".module-card-subtitle");
    if (subtitle) {
      subtitle.textContent = "Shopify · WooCommerce";
    }
  }
  const accountingCard = document.querySelector('[data-connection-group-open="accounting"]');
  if (accountingCard) {
    const title = accountingCard.querySelector(".module-card-title");
    if (title) title.textContent = "Contabilidad";
    const subtitle = accountingCard.querySelector(".module-card-subtitle");
    if (subtitle) {
      subtitle.textContent = "Alegra";
    }
  }
  const adsCard = document.querySelector('[data-connection-group-open="ads"]');
  if (adsCard) {
    const title = adsCard.querySelector(".module-card-title");
    if (title) title.textContent = "Ads";
    const subtitle = adsCard.querySelector(".module-card-subtitle");
    if (subtitle) subtitle.textContent = "Google · Meta · TikTok";
  }
}

function setModuleTitle(moduleKey, text) {
  const title = document.querySelector(`[data-module-toggle="${moduleKey}"]`);
  if (title) title.textContent = text;
}

function setModuleBridgeTag(moduleKey, text) {
  const panel = getModulePanel(moduleKey);
  if (!panel) return;
  const tag = panel.querySelector(".panel-tag.tag-bridge");
  if (tag) tag.textContent = text;
}

function applyEcommerceLogo(label) {
  const logos = document.querySelectorAll('.provider-logo.is-shopify');
  if (!logos.length) return;
  const useWoo = label.startsWith("WooCommerce");
  logos.forEach((logo) => {
    if (!(logo instanceof HTMLImageElement)) return;
    if (useWoo) {
      logo.setAttribute("src", "/brands/woocommerce.png?v=20260201s");
      logo.setAttribute("alt", "WooCommerce");
    } else {
      logo.setAttribute("src", "/brands/shopify.png?v=20260201s");
      logo.setAttribute("alt", "Shopify");
    }
  });
}

function updateDynamicGroupTitles(context) {
  const commerceLabel = getCommerceLabel(context);
  const accountingLabel = getAccountingLabel(context);
  applyEcommerceLogo(commerceLabel);
  document.querySelectorAll(".group-text-dual").forEach((node) => {
    const group = node.closest(".settings-group");
    const key = group?.getAttribute("data-group") || "";
    if (key === "products") {
      node.textContent = `Productos e inventario (${accountingLabel} → ${commerceLabel})`;
    } else if (key === "contacts") {
      node.textContent = `Contactos (${commerceLabel} ↔ ${accountingLabel})`;
    } else if (key === "orders") {
      node.textContent = `Pedidos (${commerceLabel} → ${accountingLabel}) y facturas (${accountingLabel} → ${commerceLabel})`;
    }
  });
  document.querySelectorAll(".group-text-alegra-only").forEach((node) => {
    const group = node.closest(".settings-group");
    const key = group?.getAttribute("data-group") || "";
    if (key === "products") {
      node.textContent = `Productos e inventario (${accountingLabel})`;
    } else if (key === "contacts") {
      node.textContent = `Contactos (${accountingLabel})`;
    } else if (key === "orders") {
      node.textContent = `Facturación (${accountingLabel})`;
    }
  });
}

function updateDynamicModuleTitles(context) {
  const commerceLabel = getCommerceLabel(context);
  const accountingLabel = getAccountingLabel(context);
  setModuleTitle("shopify-rules", `Sincronizar productos (${accountingLabel} → ${commerceLabel})`);
  setModuleBridgeTag("shopify-rules", `${accountingLabel} → ${commerceLabel}`);
  setModuleTitle("shopify-products-to-alegra", `Sincronizar productos (${commerceLabel} → ${accountingLabel})`);
  setModuleBridgeTag("shopify-products-to-alegra", `${commerceLabel} → ${accountingLabel}`);
  setModuleTitle("alegra-inventory", `Sincronizar inventario (${accountingLabel} → ${commerceLabel})`);
  setModuleBridgeTag("alegra-inventory", `${accountingLabel} → ${commerceLabel}`);
  setModuleTitle("sync-contacts", `Sincronizar contactos (${commerceLabel} ↔ ${accountingLabel})`);
  setModuleBridgeTag("sync-contacts", `${commerceLabel} ↔ ${accountingLabel}`);
  setModuleTitle(
    "sync-orders",
    `Pedidos (${commerceLabel} → ${accountingLabel}) y facturas (${accountingLabel} → ${commerceLabel})`
  );
  setModuleBridgeTag("sync-orders", `${commerceLabel} ↔ ${accountingLabel}`);
  setModuleTitle("alegra-logistics", `Logística (${accountingLabel}) para facturar pedidos`);
  setModuleTitle("alegra-invoice", `Facturación en ${accountingLabel} (para pedidos)`);
  applyDynamicLabelTemplates({ commerceLabel, accountingLabel });
  replacePlatformLabelsInSettings({ commerceLabel, accountingLabel });
  updateStoreSyncInventoryLabels({ commerceLabel, accountingLabel });
  updateProductsTableHeaders({ commerceLabel, accountingLabel });
}

function applyDynamicLabelTemplates({ commerceLabel, accountingLabel }) {
  document.querySelectorAll("[data-label-template]").forEach((node) => {
    const template = node.getAttribute("data-label-template") || "";
    if (!template) return;
    node.textContent = template
      .replaceAll("{commerce}", commerceLabel)
      .replaceAll("{accounting}", accountingLabel);
  });
  document.querySelectorAll("[data-title-template]").forEach((node) => {
    const template = node.getAttribute("data-title-template") || "";
    if (!template) return;
    node.textContent = template
      .replaceAll("{commerce}", commerceLabel)
      .replaceAll("{accounting}", accountingLabel);
  });
}

function getStoreSyncInventorySource() {
  if (!(storeSyncInventorySource instanceof HTMLSelectElement)) return "accounting";
  return storeSyncInventorySource.value === "commerce" ? "commerce" : "accounting";
}

function updateStoreSyncInventoryLabels({ commerceLabel, accountingLabel }) {
  const source = getStoreSyncInventorySource();
  if (storeSyncInventorySource instanceof HTMLSelectElement) {
    const accountingOption = storeSyncInventorySource.querySelector('option[value="accounting"]');
    if (accountingOption) {
      accountingOption.textContent = accountingLabel;
    }
    const commerceOption = storeSyncInventorySource.querySelector('option[value="commerce"]');
    if (commerceOption) {
      commerceOption.textContent = `${commerceLabel} (origen)`;
    }
  }
  if (storeSyncIncludeInventoryLabel) {
    const sourceLabel = source === "commerce" ? commerceLabel : accountingLabel;
    storeSyncIncludeInventoryLabel.textContent = `Publicar existencias (${sourceLabel})`;
  }
}

function updateProductsTableHeaders({ commerceLabel, accountingLabel }) {
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  setText("products-th-accounting-id", `ID ${accountingLabel}`);
  setText("products-th-commerce-id", `ID ${commerceLabel}`);
  setText("products-th-accounting-status", `Estado ${accountingLabel}`);
  setText("products-th-commerce-status", `Estado ${commerceLabel}`);
  setText("products-th-accounting-track", `Seguimiento ${accountingLabel}`);
  setText("products-th-commerce-track", `Seguimiento ${commerceLabel}`);
  setText("products-th-accounting-oversell", `Sobreventa ${accountingLabel}`);
  setText("products-th-commerce-oversell", `Sobreventa ${commerceLabel}`);
}

function replacePlatformLabelsInSettings({ commerceLabel, accountingLabel }) {
  const settings = document.getElementById("settings");
  if (!settings) return;
  const walker = document.createTreeWalker(settings, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node || !node.nodeValue) continue;
    if (!node.__apiflujosPlatformTemplate) {
      node.__apiflujosPlatformTemplate = node.nodeValue;
    }
    const template = node.__apiflujosPlatformTemplate;
    const next = template
      .replaceAll("E‑commerce", commerceLabel)
      .replaceAll("Contable", accountingLabel);
    if (next !== node.nodeValue) {
      node.nodeValue = next;
    }
  }
}

function updateSettingsStoreHeading(context) {
  const heading = document.getElementById("settings-stores");
  if (!heading) return;
  const titleText = heading.querySelector(".settings-title-text") || heading;
  const commerceLabel = getCommerceLabel(context);
  const accountingLabel = getAccountingLabel(context);
  const hasCommerce = commerceLabel !== "E‑commerce";
  const hasAccounting = accountingLabel !== "Contable";
  if (hasCommerce && hasAccounting) {
    titleText.textContent = `Configuraciones por tienda · ${commerceLabel} + ${accountingLabel}`;
    return;
  }
  if (hasCommerce) {
    titleText.textContent = `Configuraciones por tienda · ${commerceLabel}`;
    return;
  }
  if (hasAccounting) {
    titleText.textContent = `Configuraciones por tienda · ${accountingLabel}`;
    return;
  }
  titleText.textContent = "Configuraciones por tienda";
}

function updateStoreSyncTitle() {
  const title = document.querySelector('[data-module-toggle="store-sync-products"]');
  if (!title) return;
  const shopifyCount = Array.isArray(storesCache) ? storesCache.length : 0;
  const wooCount = Array.isArray(wooStoresCache) ? wooStoresCache.length : 0;
  const resolveProvider = (current) => {
    if (current === "woocommerce" && wooCount === 0 && shopifyCount > 0) return "shopify";
    if (current === "shopify" && shopifyCount === 0 && wooCount > 0) return "woocommerce";
    if (current === "shopify" && shopifyCount === 0 && wooCount === 0) return "shopify";
    return current || "shopify";
  };
  const source = resolveProvider(
    storeSyncSourceProviderSelect instanceof HTMLSelectElement
      ? storeSyncSourceProviderSelect.value
      : ""
  );
  const target = resolveProvider(
    storeSyncTargetProviderSelect instanceof HTMLSelectElement
      ? storeSyncTargetProviderSelect.value
      : ""
  );
  if (storeSyncSourceProviderSelect instanceof HTMLSelectElement) {
    storeSyncSourceProviderSelect.value = source;
  }
  if (storeSyncTargetProviderSelect instanceof HTMLSelectElement) {
    storeSyncTargetProviderSelect.value = target;
  }
  const labelMap = {
    shopify: "Shopify",
    woocommerce: "WooCommerce",
  };
  const sourceLabel = labelMap[source] || "E‑commerce";
  const targetLabel = labelMap[target] || "E‑commerce";
  title.textContent = `Sincronizador tienda a tienda (${sourceLabel} ↔ ${targetLabel})`;
  updateStoreSyncLogos(source, target);
}

function applyStoreSyncInventoryGuard() {
  if (!(storeSyncIncludeInventory instanceof HTMLInputElement)) return;
  if (!(storeSyncTrackInventory instanceof HTMLInputElement)) return;
  if (storeSyncIncludeInventory.checked && !storeSyncTrackInventory.checked) {
    storeSyncTrackInventory.checked = true;
  }
  if (!storeSyncTrackInventory.checked) {
    storeSyncIncludeInventory.checked = false;
  }
  const storeConnections = getStoreConnections(getActiveStore());
  updateStoreSyncInventoryLabels({
    commerceLabel: getCommerceLabel(storeConnections),
    accountingLabel: getAccountingLabel(storeConnections),
  });
}

function updateStoreSyncLogos(source, target) {
  const resolveLogo = (provider) => {
    if (provider === "woocommerce") {
      return { src: "/brands/woocommerce.png?v=20260201s", alt: "WooCommerce" };
    }
    return { src: "/brands/shopify.png?v=20260201s", alt: "Shopify" };
  };
  const sourceLogo = document.querySelector(".store-sync-logo-source");
  const targetLogo = document.querySelector(".store-sync-logo-target");
  const sourceMeta = resolveLogo(source);
  const targetMeta = resolveLogo(target);
  if (sourceLogo instanceof HTMLImageElement) {
    sourceLogo.setAttribute("src", sourceMeta.src);
    sourceLogo.setAttribute("alt", sourceMeta.alt);
  }
  if (targetLogo instanceof HTMLImageElement) {
    targetLogo.setAttribute("src", targetMeta.src);
    targetLogo.setAttribute("alt", targetMeta.alt);
  }
}

function updateConnectionScopedVisibility(storeConnections) {
  const shopifyOk = Boolean(storeConnections.shopifyConnected);
  const alegraOk = Boolean(storeConnections.alegraConnected);
  const wooOk = Boolean(storeConnections.wooConnected);
  const commerceOk = shopifyOk || wooOk;
  const hasAny = shopifyOk || alegraOk || wooOk;

  setConnectionContextClasses({
    shopifyConnected: shopifyOk,
    alegraConnected: alegraOk,
    wooConnected: wooOk,
  });
  updateDynamicGroupTitles({
    shopifyConnected: shopifyOk,
    alegraConnected: alegraOk,
    wooConnected: wooOk,
  });
  updateDynamicModuleTitles({
    shopifyConnected: shopifyOk,
    alegraConnected: alegraOk,
    wooConnected: wooOk,
  });
  updateSettingsStoreHeading({
    shopifyConnected: shopifyOk,
    alegraConnected: alegraOk,
    wooConnected: wooOk,
  });
  updateConnectionModuleCards({
    shopifyConnected: shopifyOk,
    alegraConnected: alegraOk,
    wooConnected: wooOk,
  });

  if (!hasAny) {
    [
      "shopify-rules",
      "shopify-products-to-alegra",
      "sync-contacts",
      "sync-orders",
      "alegra-inventory",
      "alegra-invoice",
      "alegra-logistics",
      "store-sync-products",
    ].forEach((key) => setModuleVisible(key, false));
    setGroupVisible("products", false);
    setGroupVisible("contacts", false);
    setGroupVisible("orders", false);
    setGroupVisible("store-sync", false);
    return;
  }

  // Modulos base: visibles solo si hay ecommerce + plataforma contable.
  const bridgeOk = commerceOk && alegraOk;
  setModuleVisible("shopify-rules", bridgeOk);
  setModuleVisible("shopify-products-to-alegra", bridgeOk);
  setModuleVisible("sync-contacts", bridgeOk);
  setModuleVisible("sync-orders", bridgeOk);
  setModuleVisible("store-sync-products", commerceOk);

  // Modulos Alegra (solo si hay puente completo).
  setModuleVisible("alegra-inventory", bridgeOk);
  setModuleVisible("alegra-invoice", bridgeOk);
  setModuleVisible("alegra-logistics", bridgeOk);

  setGroupVisible("products", bridgeOk);
  setGroupVisible("contacts", bridgeOk);
  setGroupVisible("orders", bridgeOk);
  setGroupVisible("store-sync", commerceOk);
}

function updatePrerequisites() {
  let store = getActiveStore();
  if (!store && Array.isArray(storesCatalog) && storesCatalog.length) {
    const fallback = storesCatalog[0];
    setActiveStoreId(fallback?.id || "");
    activeStoreName = fallback?.name || fallback?.storeName || "";
    activeStoreDomain = getStoreShopDomainFromCatalog(fallback);
    updateStoreModuleTitles();
    store = getActiveStore();
  }
  const hasStore = Boolean(store);
  const storeConnections = getStoreConnections(store);
  const ordersShopifyEnabled =
    syncOrdersShopifyEnabled instanceof HTMLInputElement
      ? Boolean(syncOrdersShopifyEnabled.checked)
      : true;
  const orderMode =
    ordersShopifyEnabled && syncOrdersShopify ? syncOrdersShopify.value : "off";
  const storeContext = {
    hasStore,
    shopifyConnected: storeConnections.shopifyConnected,
    alegraConnected: storeConnections.alegraConnected,
    wooConnected: storeConnections.wooConnected,
  };
  const globalContext = {
    hasStore: true,
    shopifyConnected: shopifyHasToken,
    alegraConnected: alegraHasToken,
  };

  applyPrereqState("shopify-rules", resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext));
  applyPrereqState("shopify-products-to-alegra", resolvePrereqState({ store: true, shopify: true }, storeContext));
  applyPrereqState("sync-contacts", resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext));
  applyPrereqState("sync-orders", resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext));

  // Inventario requiere Alegra (y e‑commerce para publicar).
  applyPrereqState("alegra-inventory", resolvePrereqState({ store: true, shopify: true, alegra: true }, storeContext));

  // Facturacion/Logistica requieren Alegra, pero se pueden dejar listas antes de conectar e‑commerce.
  applyPrereqState("alegra-invoice", resolvePrereqState({ store: true, alegra: true }, storeContext));
  applyPrereqState("alegra-logistics", resolvePrereqState({ store: true, alegra: true }, storeContext));

  updateConnectionScopedVisibility(storeConnections);
}

function updateInvoicesBackfillUi() {
  const createShopify =
    invoicesBackfillCreateShopify instanceof HTMLInputElement
      ? Boolean(invoicesBackfillCreateShopify.checked)
      : false;
  if (invoicesBackfillModeField instanceof HTMLElement) {
    invoicesBackfillModeField.hidden = !createShopify;
  }
  if (invoicesBackfillRun instanceof HTMLButtonElement) {
    invoicesBackfillRun.textContent = createShopify ? "Sincronizar facturas" : "Cargar facturas";
  }
}

function updateAlegraOrdersAutoUi() {
  const enabled =
    syncOrdersAlegraEnabled instanceof HTMLInputElement
      ? Boolean(syncOrdersAlegraEnabled.checked)
      : false;
  if (syncOrdersAlegraModeField instanceof HTMLElement) {
    syncOrdersAlegraModeField.hidden = !enabled;
  }
}

function updateOrderSyncDependencies() {
  updatePrerequisites();
  updateStoreSyncTitle();
  updateInvoicesBackfillUi();
  updateAlegraOrdersAutoUi();
}

function applyOrderToggle(select, toggle, fallbackValue) {
  if (!select || !toggle) return;
  if (!toggle.checked) {
    if (select.value && select.value !== "off") {
      select.dataset.lastValue = select.value;
    }
    select.disabled = true;
  } else {
    select.disabled = false;
    if (select.value === "off") {
      const next = select.dataset.lastValue || fallbackValue;
      select.value = next;
    }
  }
}

function isInvoiceSetupComplete() {
  const einvoiceOn =
    cfgEinvoiceEnabled instanceof HTMLInputElement ? Boolean(cfgEinvoiceEnabled.checked) : false;
  const resolutionOk = Boolean(cfgResolution && String(cfgResolution.value || "").trim());
  if (einvoiceOn && !resolutionOk) return false;
  if (cfgApplyPayment instanceof HTMLInputElement && cfgApplyPayment.checked) {
    const paymentMethodOk = Boolean(cfgPaymentMethod && String(cfgPaymentMethod.value || "").trim());
    if (!paymentMethodOk) return false;
    const bankOk = Boolean(cfgBankAccount && String(cfgBankAccount.value || "").trim());
	    if (!bankOk) return false;
	  }
	  return true;
	}

function focusInvoiceSetupFirstMissing() {
  const einvoiceOn =
    cfgEinvoiceEnabled instanceof HTMLInputElement ? Boolean(cfgEinvoiceEnabled.checked) : false;
  const resolutionOk = Boolean(cfgResolution && String(cfgResolution.value || "").trim());
  if (einvoiceOn && !resolutionOk && cfgResolution) {
    focusFieldWithContext(cfgResolution);
    return;
  }
	  if (cfgApplyPayment instanceof HTMLInputElement && cfgApplyPayment.checked) {
	    const paymentMethodOk = Boolean(cfgPaymentMethod && String(cfgPaymentMethod.value || "").trim());
	    if (!paymentMethodOk && cfgPaymentMethod) {
	      focusFieldWithContext(cfgPaymentMethod);
	      return;
	    }
	    const bankOk = Boolean(cfgBankAccount && String(cfgBankAccount.value || "").trim());
	    if (!bankOk && cfgBankAccount) {
	      focusFieldWithContext(cfgBankAccount);
	    }
	  }
	}

	function isTransferSetupComplete() {
	  if (!(cfgTransferEnabled instanceof HTMLInputElement) || !cfgTransferEnabled.checked) {
	    return false;
	  }
	  const destinationMode = getTransferDestinationMode();
	  const destinationRequired = isTransferDestinationRequired();
	  const destinationOk = !destinationRequired
	    ? true
	    : Boolean(cfgTransferDest && String(cfgTransferDest.value || "").trim());
	  if (!destinationOk) return false;
	  const strategy = cfgTransferStrategy ? cfgTransferStrategy.value || "manual" : "manual";
	  const fallback = cfgTransferFallback ? cfgTransferFallback.value || "" : "";
	  const requiresOrigins = strategy === "manual" || fallback === "manual";
	  if (!requiresOrigins) return true;
  const originSelectAll = cfgTransferOrigin
    ? cfgTransferOrigin.querySelector('input[data-select-all="transfer-origin"]')
    : null;
  if (originSelectAll instanceof HTMLInputElement && originSelectAll.checked) return true;
  return getSelectedTransferOriginIds().length > 0;
}

	function focusTransferSetupFirstMissing() {
	  if (cfgTransferEnabled instanceof HTMLInputElement && !cfgTransferEnabled.checked) {
	    focusFieldWithContext(cfgTransferEnabled);
	    return;
	  }
	  const destinationMode = getTransferDestinationMode();
	  const destinationRequired = isTransferDestinationRequired();
	  if (destinationRequired) {
	    if (cfgTransferDest && !String(cfgTransferDest.value || "").trim()) {
	      focusFieldWithContext(destinationMode === "auto" ? cfgTransferDestMode : cfgTransferDest);
	      return;
	    }
	  }
	  const strategy = cfgTransferStrategy ? cfgTransferStrategy.value || "manual" : "manual";
	  const fallback = cfgTransferFallback ? cfgTransferFallback.value || "" : "";
	  const requiresOrigins = strategy === "manual" || fallback === "manual";
	  if (!requiresOrigins) return;
  const originSelectAll = cfgTransferOrigin
    ? cfgTransferOrigin.querySelector('input[data-select-all="transfer-origin"]')
    : null;
  const originsOk =
    (originSelectAll instanceof HTMLInputElement && originSelectAll.checked) ||
    getSelectedTransferOriginIds().length > 0;
  if (originsOk) return;
  const summary = cfgTransferOriginField ? cfgTransferOriginField.querySelector("summary") : null;
  focusFieldWithContext(summary || cfgTransferOriginField || cfgTransferOrigin);
}

	function warnIfShopifyOrdersInvoiceNotReady() {
	  if (!(syncOrdersShopify instanceof HTMLSelectElement)) return true;
	  if (syncOrdersShopify.value !== "invoice") return true;
	  if (!isTransferSetupComplete()) {
	    showToast(
	      "Antes de crear factura, configura Logistica e inventario (Traslados + Destino + Bodegas origen).",
	      "is-warn",
	    );
	    focusTransferSetupFirstMissing();
	    return false;
	  }
	  if (isInvoiceSetupComplete()) return true;
	  showToast(
	    "Para crear facturas en Alegra, completa Facturacion (Resolucion + pagos si aplica).",
	    "is-warn",
	  );
	  focusInvoiceSetupFirstMissing();
	  return false;
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
  setSetupMode("manual", { persist: false });
  clearWizardState();
  closeCoach({ persistDismiss: false });
  const panel = getModulePanel("connections");
  const activePane =
    document.querySelector("[data-settings-pane].is-active")?.getAttribute("data-settings-pane") || "";
  const shouldOpen = activePane === "connections";
  setConnectionsSetupOpen(shouldOpen);
}

async function openWizardStep() {
  const pathname = window?.location?.pathname || "";
  if (!document.body.classList.contains("force-settings") && !isSettingsPath(pathname)) {
    return;
  }
  if (!storesCache.length) {
    clearWizardState();
    updateWizardUI();
    return;
  }
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
  panel.scrollIntoView({ behavior: "auto", block: "start" });

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
        "Activa la sincronizacion automatica de pedidos (Shopify → Alegra) y elige la accion (Solo registrar / Crear factura).\nVerifica el estado de Webhooks Shopify.\nLuego guarda para continuar.",
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

async function handleModuleSave(moduleKey, options = {}) {
  if (!moduleKey) return;
  const { silentValidation = false, showStatus = true } = options || {};
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
      "shopify-products-to-alegra": async () => {
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
      if (silentValidation) return;
      throw new Error("Completa los campos obligatorios.");
    }
    await action();
	    if (
	      showStatus &&
	      (moduleKey === "alegra-invoice" ||
	        moduleKey === "alegra-inventory" ||
	        moduleKey === "alegra-logistics" ||
	        moduleKey === "shopify-rules" ||
          moduleKey === "shopify-products-to-alegra" ||
	        moduleKey === "sync-contacts" ||
	        moduleKey === "sync-orders")
	    ) {
      if (hadWarning) setStoreConfigStatus("Guardado con recomendaciones pendientes.", "is-warn");
      else setStoreConfigStatus("Configuracion guardada.", "is-ok");
    }
    setModuleSaved(panel, true);
    advanceWizardStep(moduleKey);
  } catch (error) {
	    if (
	      showStatus &&
	      (moduleKey === "alegra-invoice" ||
	        moduleKey === "alegra-inventory" ||
	        moduleKey === "alegra-logistics" ||
	        moduleKey === "shopify-rules" ||
          moduleKey === "shopify-products-to-alegra" ||
	        moduleKey === "sync-contacts" ||
	        moduleKey === "sync-orders")
	    ) {
	      setStoreConfigStatus(error?.message || "No se pudo guardar.", "is-error");
	    }
    throw error;
  }
}

	function initModuleControls() {
	  const autosaveKeys = new Set([
	    "shopify-rules",
      "shopify-products-to-alegra",
	    "alegra-inventory",
	    "sync-contacts",
	    "sync-orders",
	    "alegra-logistics",
	    "alegra-invoice",
	  ]);
  const autosaveTimers = new Map();
  const autosaveInFlight = new Set();

  const shouldAutosaveTarget = (moduleKey, target) => {
    if (!autosaveKeys.has(moduleKey)) return false;
    if (!(target instanceof HTMLElement)) return false;
    const id = target.id || "";

	    if (moduleKey === "shopify-rules") {
	      return Boolean(id && id.startsWith("rules-"));
	    }
      if (moduleKey === "shopify-products-to-alegra") {
        return Boolean(id && id.startsWith("cfg-products-shopify-to-alegra-"));
      }
	    if (moduleKey === "alegra-inventory") {
	      if (target.closest("#cfg-inventory-warehouses")) return true;
	      if (id === "rules-sync-enabled") return true;
	      if (id && id.startsWith("inventory-")) return true;
	      return false;
	    }
    if (moduleKey === "sync-contacts") {
      if (!id || !id.startsWith("sync-contacts-")) return false;
      return !id.startsWith("sync-contacts-bulk-");
    }
    if (moduleKey === "sync-orders") {
      return Boolean(id && id.startsWith("sync-orders-"));
    }
    if (moduleKey === "alegra-logistics" || moduleKey === "alegra-invoice") {
      if (moduleKey === "alegra-logistics" && target.closest("#cfg-transfer-origin")) return true;
      return Boolean(id && id.startsWith("cfg-"));
    }
    return false;
  };

  const scheduleAutosave = (moduleKey, options = {}) => {
    if (!autosaveKeys.has(moduleKey)) return;
    const panel = getModulePanel(moduleKey);
    if (!panel || panel.classList.contains("is-disabled")) return;
    const delayMs = Number.isFinite(options.delayMs) ? Math.max(150, options.delayMs) : 650;

    const previous = autosaveTimers.get(moduleKey);
    if (previous) clearTimeout(previous);

    const timer = setTimeout(async () => {
      autosaveTimers.delete(moduleKey);
      if (autosaveInFlight.has(moduleKey)) return;
      autosaveInFlight.add(moduleKey);
      try {
        await handleModuleSave(moduleKey, { silentValidation: true, showStatus: false });
      } catch (error) {
        showToast(error?.message || "No se pudo guardar.", "is-error");
      } finally {
        autosaveInFlight.delete(moduleKey);
      }
    }, delayMs);
    autosaveTimers.set(moduleKey, timer);
  };

  document.querySelectorAll(".module[data-module]").forEach((panel) => {
    const readonly = panel.getAttribute("data-module-readonly") === "true";
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
  });
  document.addEventListener("input", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    const panel = target.closest(".module[data-module]");
    if (!panel) return;
    setModuleSaved(panel, false);
    const key = panel.getAttribute("data-module") || "";
    if (shouldAutosaveTarget(key, target)) scheduleAutosave(key, { delayMs: 800 });
  });
  document.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const panel = target.closest(".module[data-module]");
    if (!panel) return;
    setModuleSaved(panel, false);
    const key = panel.getAttribute("data-module") || "";
    if (shouldAutosaveTarget(key, target)) scheduleAutosave(key, { delayMs: 300 });
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
    const connectionsPane = toggle.closest('[data-settings-pane="connections"]');
    if (connectionsPane) return;
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

function getTrackInventoryValue() {
  if (productsSyncTrackInventory instanceof HTMLInputElement) {
    return productsSyncTrackInventory.checked;
  }
  if (rulesAutoTrackInventory instanceof HTMLInputElement) {
    return rulesAutoTrackInventory.checked;
  }
  return true;
}

function setTrackInventoryValue(nextValue) {
  if (productsSyncTrackInventory instanceof HTMLInputElement) {
    productsSyncTrackInventory.checked = Boolean(nextValue);
  }
  if (rulesAutoTrackInventory instanceof HTMLInputElement) {
    rulesAutoTrackInventory.checked = Boolean(nextValue);
  }
}

function isAnyInventoryTrackingEnabled() {
  const productTracking = getTrackInventoryValue();
  const storeTracking =
    storeSyncTrackInventory instanceof HTMLInputElement
      ? storeSyncTrackInventory.checked
      : false;
  return Boolean(productTracking || storeTracking);
}

function applyInventoryTrackingGuard() {
  if (!(rulesSyncEnabled instanceof HTMLInputElement)) return;
  const inventoryEnabled = rulesSyncEnabled.checked;
  if (!inventoryEnabled) {
    setTrackInventoryValue(false);
  }
  const trackingOn = isAnyInventoryTrackingEnabled();
  if (trackingOn) {
    if (!rulesSyncEnabled.checked) {
      rulesSyncEnabled.checked = true;
    }
    rulesSyncEnabled.disabled = true;
    setTrackInventoryValue(true);
  } else {
    rulesSyncEnabled.disabled = false;
  }
}

function applyProductSettings() {
  if (productsPublishStatusMass) productsPublishStatusMass.value = productSettings.publish.status;
  if (rulesAutoStatus) rulesAutoStatus.value = productSettings.publish.status;
  if (rulesAutoImages) rulesAutoImages.checked = productSettings.publish.includeImages;
  if (productsDateStart) productsDateStart.value = productSettings.sync.dateStart;
  if (productsDateEnd) productsDateEnd.value = productSettings.sync.dateEnd;
  if (productsSyncLimitInput) productsSyncLimitInput.value = productSettings.sync.limit || "";
  if (productsSyncQuery) productsSyncQuery.value = productSettings.sync.query || "";
  if (productsSyncOnlyActive) {
    productsSyncOnlyActive.checked = productSettings.sync.onlyActive !== false;
  }
  if (productsSyncPublish) productsSyncPublish.checked = productSettings.sync.publishOnSync !== false;
  if (productsSyncUpdateExisting) {
    productsSyncUpdateExisting.checked = productSettings.sync.updateExisting !== false;
  }
  if (productsSyncOnlyPublished) {
    productsSyncOnlyPublished.checked = productSettings.sync.onlyPublishedInShopify !== false;
  }
  if (productsSyncIncludeInventory) {
    productsSyncIncludeInventory.checked = productSettings.sync.includeInventory !== false;
  }
  const trackInventoryValue =
    typeof storeRuleOverrides?.trackInventory === "boolean"
      ? storeRuleOverrides.trackInventory
      : productSettings.publish.trackInventory !== false;
  setTrackInventoryValue(trackInventoryValue);
  if (productSettings.publish) {
    productSettings.publish.trackInventory = trackInventoryValue;
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
  if (ordersSyncDateStart) ordersSyncDateStart.value = productSettings.orders.dateStart;
  if (ordersSyncDateEnd) ordersSyncDateEnd.value = productSettings.orders.dateEnd;
  if (ordersSyncLimitInput) ordersSyncLimitInput.value = productSettings.orders.limit;
  if (ordersSyncNumber) ordersSyncNumber.value = productSettings.orders.orderNumber || "";
  if (opsSearch) opsSearch.value = productSettings.orders.search || "";
  if (ordersDateFilter) ordersDateFilter.value = productSettings.filters.ordersDate || "";
  if (ordersDaysSelect) ordersDaysSelect.value = productSettings.filters.ordersDays || "30";
  if (ordersSort) ordersSort.value = productSettings.filters.ordersSort || "date_desc";
  applyInventoryTrackingGuard();
}

function refreshProductSettingsFromInputs() {
  productSettings = {
    publish: {
      status: rulesAutoStatus ? rulesAutoStatus.value : "draft",
      includeImages: rulesAutoImages ? rulesAutoImages.checked : true,
      trackInventory: getTrackInventoryValue(),
    },
    sync: {
      dateStart: productsDateStart ? productsDateStart.value : "",
      dateEnd: productsDateEnd ? productsDateEnd.value : "",
      limit: productsSyncLimitInput ? productsSyncLimitInput.value : "",
      query: productsSyncQuery ? productsSyncQuery.value.trim() : "",
      warehouseIds: getSelectedSyncWarehouseIds(),
      onlyActive: productsSyncOnlyActive ? productsSyncOnlyActive.checked : true,
      publishOnSync: productsSyncPublish ? productsSyncPublish.checked : true,
      updateExisting: productsSyncUpdateExisting ? productsSyncUpdateExisting.checked : true,
      onlyPublishedInShopify: productsSyncOnlyPublished
        ? productsSyncOnlyPublished.checked
        : true,
      includeInventory: productsSyncIncludeInventory
        ? productsSyncIncludeInventory.checked
        : true,
    },
    orders: {
      dateStart: ordersSyncDateStart ? ordersSyncDateStart.value : "",
      dateEnd: ordersSyncDateEnd ? ordersSyncDateEnd.value : "",
      limit: ordersSyncLimitInput ? ordersSyncLimitInput.value : "",
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

async function loadSettings(options = {}) {
  const preserveUi = options.preserveUi === true;
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
  if (data.adsApps) {
    if (adsAppHost) {
      adsAppHost.placeholder = data.adsApps.appHost || "https://tu-app.onrender.com";
      adsAppHost.value = data.adsApps.appHost || "";
    }
    if (googleAdsClientId) {
      googleAdsClientId.placeholder = data.adsApps.googleAds?.hasClientId ? "Guardado" : "xxxx.apps.googleusercontent.com";
      googleAdsClientId.value = "";
    }
    if (googleAdsClientSecret) {
      googleAdsClientSecret.placeholder = data.adsApps.googleAds?.hasClientSecret ? "Guardado" : "********";
      googleAdsClientSecret.value = "";
    }
    if (googleAdsDeveloperToken) {
      googleAdsDeveloperToken.placeholder = data.adsApps.googleAds?.hasDeveloperToken ? "Guardado" : "********";
      googleAdsDeveloperToken.value = "";
    }
    if (metaAdsAppId) {
      metaAdsAppId.placeholder = data.adsApps.metaAds?.hasAppId ? "Guardado" : "1234567890";
      metaAdsAppId.value = "";
    }
    if (metaAdsAppSecret) {
      metaAdsAppSecret.placeholder = data.adsApps.metaAds?.hasAppSecret ? "Guardado" : "********";
      metaAdsAppSecret.value = "";
    }
    if (tiktokAdsAppId) {
      tiktokAdsAppId.placeholder = data.adsApps.tiktokAds?.hasAppId ? "Guardado" : "1234567890";
      tiktokAdsAppId.value = "";
    }
    if (tiktokAdsAppSecret) {
      tiktokAdsAppSecret.placeholder = data.adsApps.tiktokAds?.hasAppSecret ? "Guardado" : "********";
      tiktokAdsAppSecret.value = "";
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
	    if (cfgEinvoiceEnabled) {
	      cfgEinvoiceEnabled.checked = Boolean(data.invoice.einvoiceEnabled);
	    }
	    if (cfgInvoiceStatus instanceof HTMLSelectElement && !cfgInvoiceStatus.value) {
	      cfgInvoiceStatus.value = "draft";
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
        trackInventory: data.rules.trackInventory !== false,
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
  await loadConnections({ preserveUi });
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

  const current = normalizeStoreId(copyConfigSelect.value || "");
  copyConfigField.style.display = "";
  copyConfigSelect.innerHTML = "";

  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Iniciar en blanco (sin copiar)";
  copyConfigSelect.appendChild(emptyOption);

  list.forEach((store) => {
    const storeId = normalizeStoreId(store?.id || store?.storeId);
    if (!storeId) return;
    const option = document.createElement("option");
    option.value = storeId;
    option.textContent = store?.storeName || store?.shopDomain || storeId;
    copyConfigSelect.appendChild(option);
  });

  const exists = list.some((store) => normalizeStoreId(store?.id || store?.storeId) === current);
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

function savePendingConfigCopy(fromId, toId) {
  try {
    localStorage.setItem(COPY_CONFIG_FROM_KEY, fromId);
    localStorage.setItem(COPY_CONFIG_TO_KEY, toId);
    localStorage.setItem(COPY_CONFIG_AT_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
}

function getPendingConfigCopy() {
  try {
    const from = normalizeStoreId(localStorage.getItem(COPY_CONFIG_FROM_KEY) || "");
    const to = normalizeStoreId(localStorage.getItem(COPY_CONFIG_TO_KEY) || "");
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

function getStoreLabelById(storeId) {
  const normalized = normalizeStoreId(storeId || "");
  const match = storesCache.find(
    (store) => normalizeStoreId(store?.id || store?.storeId) === normalized
  );
  return match?.storeName || match?.shopDomain || normalized;
}

let pendingCopyInProgress = false;
async function maybeApplyPendingStoreConfigCopy() {
  if (pendingCopyInProgress) return;
  const pending = getPendingConfigCopy();
  if (!pending) return;
  const fromId = pending.from;
  const toId = pending.to;
  if (!fromId || !toId || fromId === toId) {
    clearPendingConfigCopy();
    return;
  }
  const toExists = storesCache.some(
    (store) => normalizeStoreId(store?.id || store?.storeId) === toId
  );
  if (!toExists) return;

  pendingCopyInProgress = true;
  try {
    const data = await fetchJson("/api/store-configs");
    const items = Array.isArray(data.items) ? data.items : [];
    const source =
      items.find((item) => normalizeStoreId(item.storeId || "") === fromId) || null;
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
    await fetchJson(`/api/store-configs/${encodeURIComponent(toId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    showToast(
      `Configuracion copiada: ${getStoreLabelById(fromId)} → ${getStoreLabelById(toId)}`,
      "is-ok"
    );
    clearPendingConfigCopy();
  } catch (error) {
    showToast(error?.message || "No se pudo copiar la configuracion.", "is-error");
  } finally {
    pendingCopyInProgress = false;
  }
}

async function loadConnections(options = {}) {
  try {
    const [data, wooData] = await Promise.all([
      fetchJson("/api/connections"),
      fetchJson("/api/woocommerce/connections").catch(() => ({ stores: [] })),
    ]);
    maybeShowCryptoWarning(data);
    if (Array.isArray(data.storesCatalog)) {
      storesCatalog = data.storesCatalog;
      renderStoresList();
      renderConnectionStoreSelect();
    } else {
      await loadStoresCatalog();
    }
    renderConnections({ ...data, wooStores: wooData?.stores || [] });
    const alegraAccounts = Array.isArray(data.alegraAccounts) ? data.alegraAccounts : [];
    unassignedAlegraAccounts = alegraAccounts.filter((account) => !account.storeId);
    renderAlegraAccountOptions(alegraAccounts);
    renderStoreSyncAlegraAccounts(data.alegraAccounts || []);
    const stores = Array.isArray(data.stores) ? data.stores : [];
    storesCache = stores;
    wooStoresCache = Array.isArray(wooData?.stores) ? wooData.stores : [];
    updateSettingsSubmenuAvailability();
    renderCopyConfigOptions(stores);
    renderStoreActiveSelect(storesCatalog, options);
    renderMarketingConfigStoreSelects(stores);
    if (mkCfgPixelKey) {
      loadMarketingConfig();
    }
    updatePrerequisites();
    updateStoreSyncTitle();
    updateGoogleAdsStatus(data);
    updateMetaAdsStatus(data);
    updateTikTokAdsStatus(data);
    clearAdsConnectInputs();
    initSetupMode(stores.length);
    updateWizardStartAvailability();
    const connectionsSummary = getModulePanel("connections-summary");
    if (connectionsSummary) {
      const hasAny =
        (storesCatalog && storesCatalog.length) ||
        stores.length ||
        wooStoresCache.length ||
        (data.alegraAccounts || []).length;
      connectionsSummary.style.display = hasAny ? "" : "none";
    }
    syncSettingsPane();
    await maybeApplyPendingStoreConfigCopy();
    maybeJumpToConnectionsSummary();
  } catch {
    renderConnections({ stores: [], wooStores: [] });
    storesCatalog = [];
    renderStoresList();
    renderConnectionStoreSelect();
    renderAlegraAccountOptions([]);
    renderCopyConfigOptions([]);
    updateGoogleAdsStatus({ googleAds: { connected: false, needsReconnect: false } });
    updateMetaAdsStatus({ metaAds: { connected: false, needsReconnect: false } });
    updateTikTokAdsStatus({ tiktokAds: { connected: false, needsReconnect: false } });
    clearAdsConnectInputs();
    activeStoreDomain = "";
    activeStoreName = "";
    storesCache = [];
    wooStoresCache = [];
    updateSettingsSubmenuAvailability();
    renderStoreActiveSelect([], options);
    updatePrerequisites();
    initSetupMode(0);
    updateWizardStartAvailability();
    const connectionsSummary = getModulePanel("connections-summary");
    if (connectionsSummary) {
      connectionsSummary.style.display = "none";
    }
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
  if (storeActiveNameLabel) {
    storeActiveNameLabel.textContent = getActiveStoreLabel() || "-";
  }
  if (settingsStoreActiveLabel) {
    const label = getActiveStoreLabel();
    settingsStoreActiveLabel.textContent = label ? `Tienda activa: ${label}` : "";
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

function getWooConnectionByDomain(domain) {
  const normalized = normalizeShopDomain(domain || "");
  if (!normalized) return null;
  return (
    wooStoresCache.find((store) => normalizeShopDomain(store?.shopDomain || "") === normalized) ||
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

  const wooDomainValue = normalizeShopDomain(wooDomain?.value || "");
  const wooStore = wooDomainValue ? getWooConnectionByDomain(wooDomainValue) : null;
  const wooOk = Boolean(wooStore?.hasConsumerKey && wooStore?.hasConsumerSecret);
  const wooLabel = wooOk ? "Conectado" : "Pendiente";
  applyConnectionPill(wooConnectionPill, wooOk, wooLabel);
}

function updateGoogleAdsStatus(payload) {
  if (!googleAdsConnectionPill && !googleAdsCustomerId) return;
  const google = payload?.googleAds || {};
  const connected = Boolean(google.connected);
  const needsReconnect = Boolean(google.needsReconnect);
  const label = needsReconnect ? "Reconectar" : (connected ? "Conectado" : "Sin conectar");
  applyConnectionPill(googleAdsConnectionPill, connected && !needsReconnect, label);
  if (googleAdsCustomerId && google.customerId && !googleAdsCustomerId.value) {
    googleAdsCustomerId.value = google.customerId;
  }
}

function updateMetaAdsStatus(payload) {
  if (!metaAdsConnectionPill && !metaAdsAccountId) return;
  const meta = payload?.metaAds || {};
  const connected = Boolean(meta.connected);
  const needsReconnect = Boolean(meta.needsReconnect);
  const label = needsReconnect ? "Reconectar" : (connected ? "Conectado" : "Sin conectar");
  applyConnectionPill(metaAdsConnectionPill, connected && !needsReconnect, label);
  if (metaAdsAccountId && meta.adAccountId && !metaAdsAccountId.value) {
    metaAdsAccountId.value = meta.adAccountId;
  }
}

function updateTikTokAdsStatus(payload) {
  if (!tiktokAdsConnectionPill && !tiktokAdsAdvertiserId) return;
  const tt = payload?.tiktokAds || {};
  const connected = Boolean(tt.connected);
  const needsReconnect = Boolean(tt.needsReconnect);
  const label = needsReconnect ? "Reconectar" : (connected ? "Conectado" : "Sin conectar");
  applyConnectionPill(tiktokAdsConnectionPill, connected && !needsReconnect, label);
  if (tiktokAdsAdvertiserId && tt.advertiserId && !tiktokAdsAdvertiserId.value) {
    tiktokAdsAdvertiserId.value = tt.advertiserId;
  }
}

function clearAdsConnectInputs() {
  if (googleAdsCustomerId) googleAdsCustomerId.value = "";
  if (metaAdsAccountId) metaAdsAccountId.value = "";
  if (tiktokAdsAdvertiserId) tiktokAdsAdvertiserId.value = "";
}

function maybeJumpToConnectionsSummary() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("connections") !== "1") return;
  setSettingsPane("connections", { persist: false });
  const summary = document.querySelector('[data-module="connections-summary"]');
  if (summary && summary.scrollIntoView) {
    summary.scrollIntoView({ behavior: "auto", block: "start" });
  }
  params.delete("connections");
  const next = params.toString();
  const nextUrl = next ? `${window.location.pathname}?${next}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
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

function renderStoreActiveSelect(stores, options = {}) {
  if (!storeActiveSelect || !storeActiveField) return;
  if (!stores.length) {
    storeActiveField.style.display = "none";
    storeActiveSelect.innerHTML = "";
    renderStoreActiveList([]);
    renderStoreSyncSelects();
    if (storeActiveNameLabel) {
      storeActiveNameLabel.textContent = "-";
    }
    if (settingsStoreActiveLabel) settingsStoreActiveLabel.textContent = "";
    const switcherPanel = document.getElementById("stores-switcher-panel");
    if (switcherPanel) switcherPanel.classList.add("is-hidden");
    shopifyAdminBase = "";
    updateConnectionPills();
    return;
  }
  storeActiveField.style.display = "";
  const switcherPanel = document.getElementById("stores-switcher-panel");
  if (switcherPanel) switcherPanel.classList.remove("is-hidden");
  storeActiveSelect.disabled = stores.length <= 1;
  storeActiveSelect.innerHTML = stores
    .map(
      (store) => {
        const storeId = String(store.id || "");
        const storeName = store.name || store.storeName || "Tienda";
        const shopDomain = getStoreShopDomainFromCatalog(store);
        const domainAttr = shopDomain ? `data-shop-domain="${escapeHtml(shopDomain)}"` : "";
        return `<option value="${escapeHtml(storeId)}" ${domainAttr}>${escapeHtml(storeName)}</option>`;
      }
    )
    .join("");
  const stored = (() => {
    try {
      return localStorage.getItem(STORE_ACTIVE_KEY) || "";
    } catch {
      return "";
    }
  })();
  const nextId =
    stores.find((store) => String(store.id || "") === String(stored))?.id ||
    stores[0]?.id ||
    "";
  setActiveStoreId(nextId);
  const activeStore = stores.find((store) => String(store.id || "") === String(nextId)) || null;
  activeStoreName = activeStore?.name || activeStore?.storeName || "";
  activeStoreDomain = getStoreShopDomainFromCatalog(activeStore);
  storeActiveSelect.value = String(nextId || "");
  shopifyAdminBase = activeStoreDomain ? `https://${activeStoreDomain}/admin` : "";
  if (storeNameInput) {
    storeNameInput.placeholder = getActiveStoreLabel() || "Tienda de ejemplo";
  }
  updateStoreModuleTitles();
  renderStoreActiveList(stores);
  renderStoreContextSelects(stores);
  renderStoreSyncSelects();
  renderMarketingConfigStoreSelects(stores);
  setShopifyWebhooksStatus("Sin configurar");
  const activePane =
    document.querySelector("[data-settings-pane].is-active")?.getAttribute("data-settings-pane") || "";
  const keepConnectionsOpen =
    activePane === "connections" || getModulePanel("connections")?.getAttribute("data-setup-open") === "1";
  const preserveUi = options && options.preserveUi === true;
  if (!preserveUi) {
    collapseAllGroupsAndModules();
    openDefaultGroups();
    if (keepConnectionsOpen) {
      const panel = getModulePanel("connections");
      if (panel) setModuleCollapsed(panel, false);
      const summary = getModulePanel("connections-summary");
      if (summary) setModuleCollapsed(summary, false);
      setConnectionsSetupOpen(true);
    }
  }
  loadLegacyStoreConfig().catch(() => null);
  openWizardStep();
  updateConnectionPills();
  updateStoresDebug("renderStoreActiveSelect");
}

function renderStoreContextSelects(stores) {
  const selects = [ordersStoreSelect, productsStoreSelect, contactsStoreSelect, marketingStoreSelect].filter(Boolean);
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

function getMarketingConfigShopDomain() {
  if (mkCfgStoreSelect instanceof HTMLSelectElement && mkCfgStoreSelect.value) {
    return normalizeShopDomain(mkCfgStoreSelect.value);
  }
  return normalizeShopDomain(activeStoreDomain || "");
}

const MARKETING_READY_KEY = "apiflujos-marketing-ready:";
let marketingAutoConnectInFlight = false;

function getMarketingReadyKey(shopDomain) {
  return `${MARKETING_READY_KEY}${shopDomain || ""}`;
}

function setMarketingReady(shopDomain, ready) {
  if (!shopDomain) return;
  try {
    localStorage.setItem(getMarketingReadyKey(shopDomain), ready ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

function getMarketingReadyState(shopDomain) {
  if (!shopDomain) return "";
  try {
    const stored = localStorage.getItem(getMarketingReadyKey(shopDomain));
    return stored === "1" ? "ready" : stored === "0" ? "not-ready" : "";
  } catch {
    return "";
  }
}

function setMarketingPill(pill, ok, label) {
  if (!pill) return;
  pill.textContent = label;
  pill.classList.toggle("is-ok", ok);
  pill.classList.toggle("is-off", !ok);
}

function updateMarketingUiState({ pixelOk, webhooksOk }) {
  setMarketingPill(mkCfgPixelPill, pixelOk, pixelOk ? "Pixel: OK" : "Pixel: Pendiente");
  setMarketingPill(mkCfgWebhooksPill, webhooksOk, webhooksOk ? "Webhooks: OK" : "Webhooks: Pendiente");
  if (mkCfgConnect) {
    mkCfgConnect.textContent = pixelOk && webhooksOk ? "Marketing conectado" : "Conectar marketing";
    mkCfgConnect.disabled = pixelOk && webhooksOk;
  }
}

function setMarketingConfigStatus(message, className) {
  if (!mkCfgStatus) return;
  mkCfgStatus.textContent = message || "Sin datos";
  mkCfgStatus.classList.remove("is-ok", "is-warn", "is-error");
  if (className) mkCfgStatus.classList.add(className);
}

function setMarketingWebhooksStatus(message, className) {
  if (!mkCfgWebhooksStatus) return;
  mkCfgWebhooksStatus.textContent = message || "Sin datos";
  mkCfgWebhooksStatus.classList.remove("is-ok", "is-warn", "is-error");
  if (className) mkCfgWebhooksStatus.classList.add(className);
}

async function loadMarketingConfig() {
  const shopDomain = getMarketingConfigShopDomain();
  if (!shopDomain) {
    setMarketingConfigStatus("Selecciona una tienda.", "is-warn");
    return;
  }
  try {
    setMarketingConfigStatus("Cargando...", "");
    const data = await fetchJson(`/api/marketing/pixel/config?shopDomain=${encodeURIComponent(shopDomain)}`);
    const pixelKey = data.pixelKey || "";
    if (mkCfgPixelKey) mkCfgPixelKey.value = pixelKey;
    if (mkCfgScript) mkCfgScript.value = data.pixelScriptTag || data.pixelScriptUrl || "";
    if (mkCfgWebhookUrl) mkCfgWebhookUrl.value = data.webhookUrl || "";
    setMarketingConfigStatus("Listo.", "is-ok");
    const webhooksOk = await loadMarketingWebhooksStatus();
    const pixelOk = Boolean(pixelKey);
    updateMarketingUiState({ pixelOk, webhooksOk });
    setMarketingReady(shopDomain, pixelOk && webhooksOk);
    if (!(pixelOk && webhooksOk) && !marketingAutoConnectInFlight) {
      marketingAutoConnectInFlight = true;
      await connectMarketingSetup();
      marketingAutoConnectInFlight = false;
    }
  } catch (error) {
    setMarketingConfigStatus(error?.message || "No se pudo cargar.", "is-error");
  }
}

async function loadMarketingWebhooksStatus() {
  const shopDomain = getMarketingConfigShopDomain();
  if (!shopDomain) {
    setMarketingWebhooksStatus("Selecciona una tienda.", "is-warn");
    return false;
  }
  try {
    const data = await fetchJson(`/api/marketing/webhooks/status?shopDomain=${encodeURIComponent(shopDomain)}`);
    if (data?.ok) {
      setMarketingWebhooksStatus(`OK · ${data.connected}/${data.total} conectados`, "is-ok");
      updateMarketingUiState({ pixelOk: true, webhooksOk: true });
      return true;
    } else {
      const missing = Array.isArray(data?.missing) ? data.missing.length : 0;
      setMarketingWebhooksStatus(`Faltan ${missing} webhooks`, "is-warn");
      updateMarketingUiState({ pixelOk: true, webhooksOk: false });
      return false;
    }
  } catch (error) {
    setMarketingWebhooksStatus(error?.message || "No se pudo consultar.", "is-error");
    updateMarketingUiState({ pixelOk: true, webhooksOk: false });
    return false;
  }
}

async function rotateMarketingPixelKey() {
  const shopDomain = getMarketingConfigShopDomain();
  if (!shopDomain) {
    setMarketingConfigStatus("Selecciona una tienda.", "is-warn");
    return;
  }
  try {
    setMarketingConfigStatus("Rotando...", "");
    const result = await fetchJson("/api/marketing/pixel/key/rotate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain }),
    });
    if (mkCfgPixelKey) mkCfgPixelKey.value = result.pixelKey || "";
    if (mkCfgScript) mkCfgScript.value = result.pixelScriptTag || result.pixelScriptUrl || "";
    if (mkCfgWebhookUrl) mkCfgWebhookUrl.value = result.webhookUrl || "";
    const webhooksOk = await loadMarketingWebhooksStatus();
    setMarketingReady(shopDomain, Boolean(result.pixelKey) && webhooksOk);
    setMarketingConfigStatus("Key rotada.", "is-ok");
  } catch (error) {
    setMarketingConfigStatus(error?.message || "No se pudo rotar.", "is-error");
  }
}

async function testMarketingPixel() {
  const shopDomain = getMarketingConfigShopDomain();
  const key = mkCfgPixelKey ? String(mkCfgPixelKey.value || "").trim() : "";
  if (!shopDomain || !key) {
    setMarketingConfigStatus("Selecciona tienda y genera Pixel Key.", "is-warn");
    return;
  }
  try {
    setMarketingConfigStatus("Enviando prueba...", "");
    await fetchJson(`/api/marketing/collect?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "session",
        shopDomain,
        landingSite: window.location.href,
        referrer: document.referrer || "",
        occurredAt: new Date().toISOString(),
      }),
    });
    setMarketingConfigStatus("Evento de prueba enviado.", "is-ok");
  } catch (error) {
    setMarketingConfigStatus(error?.message || "No se pudo probar.", "is-error");
  }
}

async function createMarketingWebhooks() {
  const shopDomain = getMarketingConfigShopDomain();
  if (!shopDomain) {
    setMarketingWebhooksStatus("Selecciona una tienda.", "is-warn");
    return;
  }
  try {
    setMarketingWebhooksStatus("Creando webhooks...", "");
    await fetchJson("/api/marketing/webhooks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain }),
    });
    const webhooksOk = await loadMarketingWebhooksStatus();
    const pixelKey = mkCfgPixelKey ? String(mkCfgPixelKey.value || "").trim() : "";
    setMarketingReady(shopDomain, Boolean(pixelKey) && webhooksOk);
  } catch (error) {
    setMarketingWebhooksStatus(error?.message || "No se pudo crear.", "is-error");
  }
}

async function deleteMarketingWebhooks() {
  const shopDomain = getMarketingConfigShopDomain();
  if (!shopDomain) {
    setMarketingWebhooksStatus("Selecciona una tienda.", "is-warn");
    return;
  }
  try {
    setMarketingWebhooksStatus("Eliminando webhooks...", "");
    await fetchJson("/api/marketing/webhooks/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain }),
    });
    await loadMarketingWebhooksStatus();
  } catch (error) {
    setMarketingWebhooksStatus(error?.message || "No se pudo eliminar.", "is-error");
  }
}

async function connectMarketingSetup() {
  const shopDomain = getMarketingConfigShopDomain();
  if (!shopDomain) {
    setMarketingConfigStatus("Selecciona una tienda.", "is-warn");
    return;
  }
  try {
    setMarketingConfigStatus("Conectando marketing...", "");
    const currentKey = mkCfgPixelKey ? String(mkCfgPixelKey.value || "").trim() : "";
    if (!currentKey) {
      await rotateMarketingPixelKey();
    }
    await createMarketingWebhooks();
    await loadMarketingConfig();
    setMarketingConfigStatus("Marketing conectado.", "is-ok");
  } catch (error) {
    setMarketingConfigStatus(error?.message || "No se pudo conectar marketing.", "is-error");
  }
}
function getStoresByProvider(provider) {
  if (provider === "woocommerce") return Array.isArray(wooStoresCache) ? wooStoresCache : [];
  return Array.isArray(storesCache) ? storesCache : [];
}

function renderStoreSyncSelects() {
  if (!storeSyncSourceSelect || !storeSyncTargetSelect) return;
  const shopifyCount = Array.isArray(storesCache) ? storesCache.length : 0;
  const wooCount = Array.isArray(wooStoresCache) ? wooStoresCache.length : 0;
  const resolveProvider = (current) => {
    if (current === "woocommerce" && wooCount === 0 && shopifyCount > 0) return "shopify";
    if (current === "shopify" && shopifyCount === 0 && wooCount > 0) return "woocommerce";
    if (current === "shopify" && shopifyCount === 0 && wooCount === 0) return "shopify";
    return current || "shopify";
  };
  const sourceProvider = resolveProvider(storeSyncSourceProviderSelect?.value || "shopify");
  const targetProvider = resolveProvider(storeSyncTargetProviderSelect?.value || "shopify");
  if (storeSyncSourceProviderSelect instanceof HTMLSelectElement) {
    storeSyncSourceProviderSelect.value = sourceProvider;
  }
  if (storeSyncTargetProviderSelect instanceof HTMLSelectElement) {
    storeSyncTargetProviderSelect.value = targetProvider;
  }
  const sourceList = getStoresByProvider(sourceProvider);
  const targetList = getStoresByProvider(targetProvider);
  const sourceOptions = sourceList.length
    ? sourceList
        .map((store) => `<option value="${store.shopDomain}">${store.storeName || store.shopDomain}</option>`)
        .join("")
    : `<option value="">Sin tiendas</option>`;
  const targetOptions = targetList.length
    ? targetList
        .map((store) => `<option value="${store.shopDomain}">${store.storeName || store.shopDomain}</option>`)
        .join("")
    : `<option value="">Sin tiendas</option>`;
  storeSyncSourceSelect.innerHTML = sourceOptions;
  storeSyncTargetSelect.innerHTML = targetOptions;
  storeSyncSourceSelect.disabled = sourceList.length <= 0;
  storeSyncTargetSelect.disabled = targetList.length <= 0;
  const defaultSource =
    sourceProvider === "shopify"
      ? activeStoreDomain || sourceList[0]?.shopDomain || ""
      : sourceList[0]?.shopDomain || "";
  if (defaultSource) storeSyncSourceSelect.value = defaultSource;
  if (!storeSyncTargetSelect.value || storeSyncTargetSelect.value === defaultSource) {
    const fallback = targetList.find((store) => store.shopDomain !== defaultSource)?.shopDomain || targetList[0]?.shopDomain || "";
    if (fallback) storeSyncTargetSelect.value = fallback;
  }
  ensureStoreSyncDistinct();
  updateStoreSyncTitle();
}

function ensureStoreSyncDistinct() {
  if (!storeSyncSourceSelect || !storeSyncTargetSelect) return;
  const sourceProvider = storeSyncSourceProviderSelect?.value || "shopify";
  const targetProvider = storeSyncTargetProviderSelect?.value || "shopify";
  const source = storeSyncSourceSelect.value;
  const target = storeSyncTargetSelect.value;
  if (!source || !target) return;
  if (sourceProvider !== targetProvider) return;
  if (source !== target) return;
  const options = Array.from(storeSyncTargetSelect.options || []);
  const fallback = options.find((option) => option.value && option.value !== source);
  if (fallback) {
    storeSyncTargetSelect.value = fallback.value;
  }
}

function renderStoreSyncAlegraAccounts(accounts) {
  if (!storeSyncAlegraAccountSelect) return;
  const list = Array.isArray(accounts) ? accounts : [];
  const options = [
    `<option value="">Seleccionar...</option>`,
    ...list.map((account) => {
      const label = `${account.email} (${account.environment || "prod"})${
        account.needsReconnect ? " · reconectar" : ""
      }`;
      return `<option value="${account.id}" data-needs-reconnect="${account.needsReconnect ? "1" : "0"}">${label}</option>`;
    }),
  ];
  storeSyncAlegraAccountSelect.innerHTML = options.join("");
  if (storeSyncPriceListSelect instanceof HTMLSelectElement) {
    storeSyncPriceListSelect.innerHTML = "";
    const option = document.createElement("option");
    option.disabled = true;
    option.selected = true;
    option.textContent = "Selecciona cuenta Alegra";
    storeSyncPriceListSelect.appendChild(option);
  }
}

function renderMarketingConfigStoreSelects(stores) {
  if (!(mkCfgStoreSelect instanceof HTMLSelectElement)) return;
  const list = Array.isArray(stores) ? stores : [];
  if (!list.length) {
    mkCfgStoreSelect.innerHTML = `<option value="">Sin tiendas</option>`;
    mkCfgStoreSelect.disabled = true;
    return;
  }
  const options = list
    .map((store) => `<option value="${store.shopDomain}">${store.storeName || store.shopDomain}</option>`)
    .join("");
  mkCfgStoreSelect.innerHTML = options;
  mkCfgStoreSelect.disabled = list.length <= 1;
  const defaultDomain = activeStoreDomain || list[0]?.shopDomain || "";
  if (defaultDomain) mkCfgStoreSelect.value = defaultDomain;
}

async function loadStoreSyncPriceLists(accountId) {
  if (!(storeSyncPriceListSelect instanceof HTMLSelectElement)) return;
  const params = new URLSearchParams();
  if (accountId) params.set("accountId", String(accountId));
  const query = params.toString() ? `?${params.toString()}` : "";
  try {
    const data = await fetchJson(`/api/alegra/price-lists${query}`);
    const items = Array.isArray(data.items) ? data.items : [];
    storeSyncPriceListSelect.innerHTML = "";
    const allowEmpty = storeSyncPriceListSelect.dataset.allowEmpty === "true";
    if (allowEmpty) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = storeSyncPriceListSelect.dataset.emptyLabel || "Seleccionar...";
      storeSyncPriceListSelect.appendChild(option);
    }
    if (!items.length) {
      const option = document.createElement("option");
      option.disabled = true;
      option.selected = !allowEmpty;
      option.textContent = "Sin datos";
      storeSyncPriceListSelect.appendChild(option);
      return;
    }
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = String(item.id || item._id || "");
      option.textContent = item.name || `ID ${option.value}`;
      storeSyncPriceListSelect.appendChild(option);
    });
  } catch (error) {
    storeSyncPriceListSelect.innerHTML = "";
    const option = document.createElement("option");
    option.disabled = true;
    option.selected = true;
    option.textContent = "Error al cargar";
    storeSyncPriceListSelect.appendChild(option);
  }
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
  renderCommerceAlegraOptions(accounts);
}

function renderCommerceAlegraOptions(accounts) {
  if (!commerceAlegraSelect) return;
  const previous = commerceAlegraSelect.value || "";
  const items = Array.isArray(accounts) ? accounts : [];
  if (!items.length) {
    commerceAlegraSelect.innerHTML = `<option value="">Conecta una cuenta Alegra primero</option>`;
    commerceAlegraSelect.disabled = true;
    if (commerceAlegraHint) {
      commerceAlegraHint.textContent = "Necesitas una cuenta contable para asociar esta tienda.";
    }
    updateConnectionButtonsState();
    return;
  }
  const options = [
    `<option value="">Seleccionar plataforma contable</option>`,
    ...items.map(
      (account) =>
        `<option value="${account.id}">${account.email} (${account.environment || "prod"})</option>`
    ),
  ];
  commerceAlegraSelect.innerHTML = options.join("");
  commerceAlegraSelect.disabled = false;
  if (commerceAlegraHint) {
    commerceAlegraHint.textContent = "Selecciona la cuenta contable asociada a esta tienda.";
  }
  if (items.some((account) => String(account.id) === previous)) {
    commerceAlegraSelect.value = previous;
  } else if (items.length === 1) {
    commerceAlegraSelect.value = String(items[0].id);
  } else {
    commerceAlegraSelect.value = "";
  }
  syncCommerceAlegraSelection();
  updateConnectionButtonsState();
}

function syncCommerceAlegraSelection() {
  if (!(commerceAlegraSelect instanceof HTMLSelectElement)) return;
  const selectedStore = getSelectedStore();
  const alegraId = selectedStore?.alegra?.id;
  if (!alegraId) return;
  const value = String(alegraId);
  const hasOption = Array.from(commerceAlegraSelect.options).some((opt) => opt.value === value);
  if (hasOption) {
    commerceAlegraSelect.value = value;
  }
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

function normalizeStoreId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    if (char === "'") return "&#39;";
    return char;
  });
}

function getStoreShopDomainFromCatalog(store) {
  if (!store) return "";
  return (
    store.shopify?.shopDomain ||
    store.shopDomain ||
    ""
  );
}

function renderStoreActiveList(stores) {
  if (!(storeActiveList instanceof HTMLElement)) return;
  const list = Array.isArray(stores) ? stores : [];
  const activeId = String(getActiveStoreId() || "");
  storeActiveList.innerHTML = list
    .map((store) => {
      const storeId = String(store.id || "");
      const domain = getStoreShopDomainFromCatalog(store);
      const title = store.name || store.storeName || domain || "Tienda";
      const subtitle = store.name && domain ? domain : "";
      const isActive = storeId && storeId === activeId;
      const shopifyOk = Boolean(store?.shopify?.shopifyConnected ?? store?.shopifyConnected);
      const alegraOk = Boolean(store?.alegra && !store?.alegra?.needsReconnect) || Boolean(store?.alegraConnected);
      const wooOk = Boolean(store?.woo?.ok);
      return `
        <button class="ghost store-item ${isActive ? "is-active" : ""}" type="button" data-store-id="${escapeHtml(storeId)}">
          <span class="store-item-title">${escapeHtml(title)}</span>
          ${subtitle ? `<span class="store-item-sub">${escapeHtml(subtitle)}</span>` : ""}
          <span class="store-item-meta" aria-hidden="true">
            <span class="store-item-pill ${shopifyOk ? "is-ok" : "is-off"}">Shopify</span>
            <span class="store-item-pill ${alegraOk ? "is-ok" : "is-off"}">Alegra</span>
            <span class="store-item-pill ${wooOk ? "is-ok" : "is-off"}">Woo</span>
          </span>
        </button>
      `;
    })
    .join("");
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
    const oauthBtn = shopifyConnectPicker.querySelector('[data-shopify-connect="oauth"]');
    const tokenBtn = shopifyConnectPicker.querySelector('[data-shopify-connect="token"]');
    if (oauthBtn instanceof HTMLElement) {
      oauthBtn.style.display = "";
    }
    if (tokenBtn instanceof HTMLElement) {
      tokenBtn.style.display = "";
    }
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
    shopifyToken.disabled = false;
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
  wizardStart.disabled = !hasActiveStore && !hasDomain;
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
	  if (cfgEinvoiceEnabled) cfgEinvoiceEnabled.checked = Boolean(settings.einvoiceEnabled);
	  if (cfgInvoiceStatus instanceof HTMLSelectElement) {
	    const raw = String(settings.invoiceStatus || "draft").trim().toLowerCase();
	    cfgInvoiceStatus.value = raw === "active" ? "active" : "draft";
	  }
	  if (cfgApplyPayment) cfgApplyPayment.checked = Boolean(settings.applyPayment);
	  if (cfgObservations) cfgObservations.value = settings.observationsTemplate || "";
	  applyObservationSettings(settings);
	  if (cfgResolution) cfgResolution.dataset.selected = settings.resolutionId || "";
	  if (cfgCostCenter) cfgCostCenter.dataset.selected = settings.costCenterId || "";
	  if (cfgWarehouse) cfgWarehouse.dataset.selected = settings.warehouseId || "";
	  if (cfgSeller) cfgSeller.dataset.selected = settings.sellerId || "";
	  if (cfgPaymentMethod) cfgPaymentMethod.dataset.selected = settings.paymentMethod || "";
	  if (cfgBankAccount) cfgBankAccount.dataset.selected = settings.bankAccountId || "";
	}

	function applyObservationSettings(settings) {
	  if (!(cfgObservations instanceof HTMLInputElement)) return;
	  const template = String(settings?.observationsTemplate || "").trim();
	  const rawFields = settings?.observationsFields;
	  const fields = Array.isArray(rawFields) ? rawFields.map((item) => String(item)) : [];
	  const extra = typeof settings?.observationsExtra === "string" ? settings.observationsExtra : "";

	  if (cfgObservationsExtra instanceof HTMLInputElement) {
	    cfgObservationsExtra.value = extra;
	  }

	  const optionsRoot = cfgObservationsFields
	    ? cfgObservationsFields.querySelector("#cfg-observations-fields-options")
	    : null;
	  const inputs = optionsRoot
	    ? Array.from(optionsRoot.querySelectorAll("input[type=\"checkbox\"][data-observation-key]"))
	    : [];

	  if (inputs.length) {
	    if (fields.length) {
	      inputs.forEach((input) => {
	        const key = input.getAttribute("data-observation-key") || "";
	        input.checked = Boolean(key && fields.includes(key));
	      });
	    } else if (template) {
	      // Fallback: intenta mapear el template a checks + extra.
	      const knownLines = new Map(
	        inputs.map((input) => [
	          input.getAttribute("data-observation-line") || "",
	          input.getAttribute("data-observation-key") || "",
	        ]),
	      );
	      const remaining = [];
	      template.split("\n").forEach((line) => {
	        const trimmed = line.trim();
	        if (!trimmed) return;
	        const key = knownLines.get(trimmed);
	        if (key) {
	          const match = inputs.find((input) => input.getAttribute("data-observation-key") === key);
	          if (match) match.checked = true;
	        } else {
	          remaining.push(trimmed);
	        }
	      });
	      if (cfgObservationsExtra instanceof HTMLInputElement && remaining.length) {
	        cfgObservationsExtra.value = remaining.join("\n");
	      }
	    } else {
	      inputs.forEach((input) => {
	        input.checked = false;
	      });
	    }
	  }

	  updateObservationsTemplateFromUi();
	}

	function getSelectedObservationKeys() {
	  const optionsRoot = cfgObservationsFields
	    ? cfgObservationsFields.querySelector("#cfg-observations-fields-options")
	    : null;
	  if (!optionsRoot) return [];
	  return Array.from(optionsRoot.querySelectorAll("input[type=\"checkbox\"][data-observation-key]"))
	    .filter((input) => input.checked)
	    .map((input) => String(input.getAttribute("data-observation-key") || ""))
	    .filter(Boolean);
	}

	function updateObservationsSummary() {
	  if (!(cfgObservationsFieldsSummary instanceof HTMLElement)) return;
	  const keys = getSelectedObservationKeys();
	  cfgObservationsFieldsSummary.textContent = keys.length ? `${keys.length} seleccionados` : "Ninguno";
	}

	function updateObservationsTemplateFromUi() {
	  if (!(cfgObservations instanceof HTMLInputElement)) return;
	  const lines = [];
	  const optionsRoot = cfgObservationsFields
	    ? cfgObservationsFields.querySelector("#cfg-observations-fields-options")
	    : null;
	  if (optionsRoot) {
	    optionsRoot
	      .querySelectorAll("input[type=\"checkbox\"][data-observation-line]")
	      .forEach((input) => {
	        if (!(input instanceof HTMLInputElement)) return;
	        if (!input.checked) return;
	        const line = String(input.getAttribute("data-observation-line") || "").trim();
	        if (line) lines.push(line);
	      });
	  }
	  const extra =
	    cfgObservationsExtra instanceof HTMLInputElement ? cfgObservationsExtra.value.trim() : "";
	  if (extra) {
	    lines.push(extra);
	  }
	  const template = lines.join("\n").trim();
	  cfgObservations.value = template;
	  updateObservationsSummary();
	  if (cfgObservationsPreview instanceof HTMLElement) {
	    cfgObservationsPreview.textContent = template || "-";
	  }
	}

function applyRuleSettings(settings, options = {}) {
  if (!settings) return;
  const includeCron = options.includeCron !== false;
  if (rulesAutoEnabled) {
    rulesAutoEnabled.checked = settings.webhookItemsEnabled !== false;
  }
  if (rulesAutoCreateShopify instanceof HTMLInputElement) {
    rulesAutoCreateShopify.checked = settings.createInShopify !== false;
  }
  if (rulesAutoUpdateShopify instanceof HTMLInputElement) {
    rulesAutoUpdateShopify.checked = settings.updateInShopify !== false;
  }
  if (productsSyncUpdateExisting instanceof HTMLInputElement) {
    productsSyncUpdateExisting.checked = settings.updateInShopify !== false;
  }
  if (rulesAutoPublish) rulesAutoPublish.checked = Boolean(settings.autoPublishOnWebhook);
  if (rulesAutoImages) {
    rulesAutoImages.checked = settings.includeImages !== false;
  }
  if (rulesAutoStatus) {
    rulesAutoStatus.value = settings.autoPublishStatus === "active" ? "active" : "draft";
  }
  const trackInventoryValue = settings.trackInventory !== false;
  setTrackInventoryValue(trackInventoryValue);
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
    createInShopify: settings.createInShopify !== false,
    updateInShopify: settings.updateInShopify !== false,
    onlyActiveItems: Boolean(settings.onlyActiveItems),
    includeImages: settings.includeImages !== false,
    trackInventory: settings.trackInventory !== false,
    syncEnabled: settings.syncEnabled !== false,
    webhookItemsEnabled: settings.webhookItemsEnabled !== false,
    warehouseIds: Array.isArray(settings.warehouseIds) ? settings.warehouseIds : [],
  };
  if (productsPublishStatusMass) {
    productsPublishStatusMass.value = rulesAutoStatus?.value || "draft";
  }
  applyInventoryTrackingGuard();
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
	  if (cfgTransferDestMode) {
	    const raw = String(transfers.destinationMode || "fixed").trim().toLowerCase();
	    cfgTransferDestMode.value = raw === "auto" || raw === "rule" ? raw : "fixed";
	  }
	  if (cfgTransferDest) {
	    const value = String(transfers.destinationWarehouseId || "");
	    cfgTransferDest.dataset.selected = value;
	    if (cfgTransferDest.options.length) cfgTransferDest.value = value;
	  }
	  if (cfgTransferDestRequired) {
	    cfgTransferDestRequired.checked = transfers.destinationRequired !== false;
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
	  updateTransferDestinationState();
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
  const productSync =
    sync.products && typeof sync.products === "object" ? sync.products : {};
  const matchPriority = Array.isArray(contactSync.matchPriority)
    ? contactSync.matchPriority.map((item) => String(item).toLowerCase())
    : typeof contactSync.matchPriority === "string"
      ? contactSync.matchPriority.split("_")
      : ["document", "phone", "email"];
  const priorityKey = matchPriority.join("_");
  const defaultShopifyMode = "db_only";
  if (syncContactsEnabled instanceof HTMLInputElement) {
    const enabledRaw = contactSync.enabled;
    const enabled =
      typeof enabledRaw === "boolean"
        ? enabledRaw
        : contactSync.fromShopify !== false || contactSync.fromAlegra !== false;
    syncContactsEnabled.checked = Boolean(enabled);
  }
  if (syncContactsShopify) {
    syncContactsShopify.checked = contactSync.fromShopify !== false;
  }
  if (syncContactsAlegra) {
    syncContactsAlegra.checked = contactSync.fromAlegra !== false;
  }
  if (syncContactsCreateAlegra) {
    syncContactsCreateAlegra.checked = contactSync.createInAlegra !== false;
  }
  if (syncContactsCreateShopify) {
    syncContactsCreateShopify.checked = contactSync.createInShopify !== false;
  }
  if (syncContactsPriority) {
    syncContactsPriority.value = priorityKey;
  }
  if (syncOrdersShopify) {
    const raw = String(orderSync.shopifyToAlegra || defaultShopifyMode);
    const normalized = raw === "contact_only" ? "db_only" : raw;
    syncOrdersShopify.value = normalized;
    if (!syncOrdersShopify.value) syncOrdersShopify.value = defaultShopifyMode;
  }
  if (syncOrdersShopifyInvoice instanceof HTMLInputElement && syncOrdersShopify) {
    syncOrdersShopifyInvoice.checked = syncOrdersShopify.value === "invoice";
  }
  if (syncOrdersShopify?.value === "invoice" && cfgGenerateInvoice instanceof HTMLInputElement) {
    cfgGenerateInvoice.checked = true;
  }
  if (syncOrdersAlegra) {
    const raw = String(orderSync.alegraToShopify || "off");
    syncOrdersAlegra.value = raw;
    if (!syncOrdersAlegra.value) syncOrdersAlegra.value = "off";
  }
  if (syncOrdersShopifyEnabled) {
    const enabledRaw = orderSync.shopifyEnabled;
    const enabled =
      typeof enabledRaw === "boolean"
        ? enabledRaw
        : syncOrdersShopify
          ? syncOrdersShopify.value !== "off"
          : true;
    syncOrdersShopifyEnabled.checked = Boolean(enabled);
    applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, defaultShopifyMode);
  }
	if (syncOrdersAlegraEnabled) {
	  const enabledRaw = orderSync.alegraEnabled;
	  const enabled =
	    typeof enabledRaw === "boolean"
	      ? enabledRaw
        : syncOrdersAlegra
          ? syncOrdersAlegra.value !== "off"
          : true;
    syncOrdersAlegraEnabled.checked = Boolean(enabled);
    applyOrderToggle(syncOrdersAlegra, syncOrdersAlegraEnabled, "draft");
	  }
  if (cfgProductsShopifyToAlegraEnabled instanceof HTMLInputElement) {
    cfgProductsShopifyToAlegraEnabled.checked = Boolean(productSync.shopifyEnabled);
  }
  if (cfgProductsShopifyToAlegraCreate instanceof HTMLInputElement) {
    cfgProductsShopifyToAlegraCreate.checked = Boolean(productSync.createInAlegra);
  }
  if (cfgProductsShopifyToAlegraUpdate instanceof HTMLInputElement) {
    const raw = productSync.updateInAlegra;
    cfgProductsShopifyToAlegraUpdate.checked = typeof raw === "boolean" ? raw : true;
  }
  if (cfgProductsShopifyToAlegraIncludeInventory instanceof HTMLInputElement) {
    cfgProductsShopifyToAlegraIncludeInventory.checked = Boolean(productSync.includeInventory);
  }
  if (cfgProductsShopifyToAlegraMatch instanceof HTMLSelectElement) {
    const value = String(productSync.matchPriority || "sku_barcode");
    cfgProductsShopifyToAlegraMatch.value = value === "barcode_sku" ? "barcode_sku" : "sku_barcode";
  }
  if (cfgProductsShopifyToAlegraWarehouse instanceof HTMLSelectElement) {
    const value = String(productSync.warehouseId || "").trim();
    cfgProductsShopifyToAlegraWarehouse.dataset.selected = value;
    if (cfgProductsShopifyToAlegraWarehouse.options.length) {
      cfgProductsShopifyToAlegraWarehouse.value = value;
    }
  }
	renderTransferOriginFilters();
	updateTransferOriginState();
	updateOrderSyncDependencies();
}

	function clearLegacyStoreConfig() {
	  transferOriginIds = [];
	  if (cfgTransferEnabled) cfgTransferEnabled.checked = true;
	  if (cfgTransferDestMode) cfgTransferDestMode.value = "fixed";
	  if (cfgTransferDest) cfgTransferDest.dataset.selected = "";
	  if (cfgTransferDestRequired) cfgTransferDestRequired.checked = true;
	  if (cfgTransferStrategy) cfgTransferStrategy.value = "manual";
	  if (cfgTransferFallback) cfgTransferFallback.value = "";
	  if (cfgTransferTieBreak) cfgTransferTieBreak.value = "";
	  if (cfgTransferPriority) cfgTransferPriority.dataset.selected = "";
	  if (cfgTransferMinStock) cfgTransferMinStock.value = "";
	  if (cfgTransferSplit) cfgTransferSplit.checked = false;
	  updateTransferDestinationState();
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
  if (syncContactsEnabled instanceof HTMLInputElement) syncContactsEnabled.checked = true;
  if (syncContactsShopify) syncContactsShopify.checked = true;
  if (syncContactsAlegra) syncContactsAlegra.checked = true;
  if (syncContactsCreateAlegra) syncContactsCreateAlegra.checked = true;
  if (syncContactsCreateShopify) syncContactsCreateShopify.checked = true;
  if (syncContactsPriority) syncContactsPriority.value = "document_phone_email";
  if (syncOrdersShopify) {
    syncOrdersShopify.value = "db_only";
  }
  if (syncOrdersShopifyInvoice instanceof HTMLInputElement) {
    syncOrdersShopifyInvoice.checked = false;
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
  if (rulesAutoCreateShopify instanceof HTMLInputElement) rulesAutoCreateShopify.checked = true;
  if (rulesAutoUpdateShopify instanceof HTMLInputElement) rulesAutoUpdateShopify.checked = true;
  if (cfgProductsShopifyToAlegraEnabled instanceof HTMLInputElement) {
    cfgProductsShopifyToAlegraEnabled.checked = false;
  }
  if (cfgProductsShopifyToAlegraCreate instanceof HTMLInputElement) {
    cfgProductsShopifyToAlegraCreate.checked = false;
  }
  if (cfgProductsShopifyToAlegraUpdate instanceof HTMLInputElement) {
    cfgProductsShopifyToAlegraUpdate.checked = true;
  }
  if (cfgProductsShopifyToAlegraIncludeInventory instanceof HTMLInputElement) {
    cfgProductsShopifyToAlegraIncludeInventory.checked = false;
  }
  if (cfgProductsShopifyToAlegraMatch instanceof HTMLSelectElement) {
    cfgProductsShopifyToAlegraMatch.value = "sku_barcode";
  }
  if (cfgProductsShopifyToAlegraWarehouse instanceof HTMLSelectElement) {
    cfgProductsShopifyToAlegraWarehouse.dataset.selected = "";
    if (cfgProductsShopifyToAlegraWarehouse.options.length) cfgProductsShopifyToAlegraWarehouse.value = "";
  }
  renderTransferOriginFilters();
  updateTransferOriginState();
  updateOrderSyncDependencies();
}

async function loadLegacyStoreConfig() {
  const storeId = normalizeStoreId(getActiveStoreId() || storeActiveSelect?.value || "");
  if (!storeId) {
    activeStoreConfig = null;
    clearLegacyStoreConfig();
    updatePrerequisites();
    return;
  }
  try {
    const data = await fetchJson("/api/store-configs");
    const items = Array.isArray(data.items) ? data.items : [];
    const match =
      items.find((item) => normalizeStoreId(item.storeId || "") === storeId) ||
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
    applyProductSettings();
    updateStoresDebug("loadLegacyStoreConfig");
  }
}

function renderConnections(settings) {
  if (!connectionsGrid) return;
  connectionsGrid.innerHTML = "";
  const stores = Array.isArray(settings.stores) ? settings.stores : [];
  const wooStores = Array.isArray(settings.wooStores) ? settings.wooStores : [];
  const alegraAccounts = Array.isArray(settings.alegraAccounts) ? settings.alegraAccounts : [];
  const googleAds = settings?.googleAds || {};
  const storesCatalogData = Array.isArray(settings.storesCatalog) ? settings.storesCatalog : [];
  const activeDomain = normalizeShopDomain(activeStoreDomain || storeActiveSelect?.value || "");
  if (storesCatalogData.length) {
    connectionsGrid.innerHTML = storesCatalogData
      .map((store) => {
        const storeLabel = escapeHtml(store.name || "Tienda");
        const shopify = store.shopify;
        const alegra = store.alegra;
        const woo = store.woo;
        const platforms = [];
        if (shopify) {
          const ok = Boolean(shopify.shopifyConnected ?? shopify.status === "Conectado") && !shopify.shopifyNeedsReconnect;
          platforms.push({ key: "shopify", label: "Shopify", ok, fail: !ok });
        }
        if (woo) {
          platforms.push({ key: "woocommerce", label: "WooCommerce", ok: Boolean(woo.ok), fail: !woo.ok });
        }
        if (alegra) {
          const ok = !alegra.needsReconnect;
          const envLabel = alegra.environment === "sandbox" ? "Sandbox" : "Produccion";
          platforms.push({ key: "alegra", label: `Alegra · ${envLabel}`, ok, fail: !ok });
        }
        return `
          <div class="connection-card">
            <div class="connection-head">
              <div class="connection-summary-text">
                <h4 class="connection-store-title">${storeLabel}</h4>
              </div>
            </div>
            <div class="connection-pill-row" aria-label="Plataformas conectadas">
              ${(platforms.length ? platforms : [{ key: "none", label: "Sin conexiones", ok: false }])
                .map(
                  (tile) => `
                <span class="connection-pill ${tile.ok ? "is-ok" : "is-off"}">
                  <span class="connection-dot"></span>
                  ${tile.label}
                </span>
              `
                )
                .join("")}
            </div>
          </div>
        `;
      })
      .join("");
    return;
  }

  const list = [
    ...stores.map((store) => ({ ...store, provider: "shopify" })),
    ...wooStores.map((store) => ({ ...store, provider: "woocommerce" })),
    ...alegraAccounts.map((account) => ({ ...account, provider: "alegra" })),
  ]
    .slice()
    .sort((a, b) => {
      const aIsActive =
        a?.provider === "shopify" && normalizeShopDomain(a?.shopDomain || "") === activeDomain;
      const bIsActive =
        b?.provider === "shopify" && normalizeShopDomain(b?.shopDomain || "") === activeDomain;
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
      const isActive = store?.provider === "shopify" && domain && domain === activeDomain;
      const storeLabel =
        store?.provider === "alegra"
          ? `Alegra · ${escapeHtml(store.email || "Cuenta")}`
          : escapeHtml(store.storeName || store.shopDomain || "Tienda");
      let platforms = [];
      if (store?.provider === "woocommerce") {
        const wooConnected = Boolean(store.hasConsumerKey && store.hasConsumerSecret);
        platforms = [{ key: "woocommerce", label: "WooCommerce", ok: wooConnected, fail: !wooConnected }];
      } else if (store?.provider === "alegra") {
        const alegraOk = !store.needsReconnect;
        const envLabel = store.environment === "sandbox" ? "Sandbox" : "Produccion";
        platforms = [
          { key: "alegra", label: `Alegra · ${envLabel}`, ok: alegraOk, fail: !alegraOk },
        ];
      } else {
        const shopifyNeedsReconnect = Boolean(store.shopifyNeedsReconnect);
        const alegraNeedsReconnect = Boolean(store.alegraNeedsReconnect);
        const shopifyConnected =
          Boolean(store.shopifyConnected ?? store.status === "Conectado") && !shopifyNeedsReconnect;
        const alegraConnected =
          Boolean(store.alegraConnected ?? store.alegraAccountId) && !alegraNeedsReconnect;
        const marketingState = getMarketingReadyState(domain);
        const marketingReady = marketingState === "ready";
        const marketingKnown = marketingState !== "";
        platforms = [
          { key: "shopify", label: "Shopify", ok: shopifyConnected, fail: shopifyNeedsReconnect },
          { key: "alegra", label: "Alegra", ok: alegraConnected, fail: alegraNeedsReconnect },
          { key: "marketing", label: "Marketing", ok: marketingReady, fail: marketingKnown && !marketingReady },
          { key: "google", label: "Google Ads", ok: Boolean(googleAds.connected), fail: Boolean(googleAds.needsReconnect) },
          { key: "meta", label: "Meta Ads", ok: Boolean(settings?.metaAds?.connected), fail: Boolean(settings?.metaAds?.needsReconnect) },
          { key: "tiktok", label: "TikTok Ads", ok: Boolean(settings?.tiktokAds?.connected), fail: Boolean(settings?.tiktokAds?.needsReconnect) },
        ].filter((item) => item.ok || item.fail);
      }
      return `
        <div class="connection-card${isActive ? " is-active" : ""}">
          <div class="connection-head">
            <div class="connection-summary-text">
              <h4 class="connection-store-title">${storeLabel}</h4>
            </div>
            <div class="connection-summary-meta">
              ${isActive ? `<span class="status-pill is-ok">Activa</span>` : ""}
            </div>
          </div>
          <div class="connection-pill-row" aria-label="Plataformas conectadas">
            ${platforms
              .map(
                (tile) => `
              <span class="connection-pill ${tile.ok ? "is-ok" : "is-off"}">
                <span class="connection-dot"></span>
                ${tile.label}
              </span>
            `
              )
              .join("")}
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
  const resolveAlegraOverSell = (inventory) => {
    if (!inventory || typeof inventory !== "object") return false;
    const negativeSale = inventory.negativeSale;
    const allowNegative = inventory.allowNegative;
    return Boolean(
      typeof negativeSale === "boolean" ? negativeSale : typeof allowNegative === "boolean" ? allowNegative : false
    );
  };
  const resolveAlegraTrackable = (inventory) => Boolean(inventory && typeof inventory === "object");
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
      alegraOverSell: false,
      alegraTrackable: false,
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
  const alegraOverSell = resolveAlegraOverSell(item.inventory);
  const alegraTrackable = resolveAlegraTrackable(item.inventory);
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
    const variantOverSell = resolveAlegraOverSell(variant?.inventory);
    const variantTrackable = resolveAlegraTrackable(variant?.inventory);
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
      alegraOverSell: variantOverSell,
      alegraTrackable: variantTrackable,
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
    alegraOverSell,
    alegraTrackable,
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
  applyToggleDependencies();
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
  applyToggleDependencies();
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
	  updateTransferDestinationState();
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

	function getTransferDestinationMode() {
	  if (!(cfgTransferDestMode instanceof HTMLSelectElement)) return "fixed";
	  const raw = String(cfgTransferDestMode.value || "").trim().toLowerCase();
	  if (raw === "auto" || raw === "rule") return raw;
	  return "fixed";
	}

	function isTransferDestinationRequired() {
	  if (cfgTransferDestRequired instanceof HTMLInputElement) {
	    return cfgTransferDestRequired.checked !== false;
	  }
	  return true;
	}

		function updateTransferDestinationState() {
		  if (!(cfgTransferDest instanceof HTMLSelectElement)) return;
		  const mode = getTransferDestinationMode();
		  const transferEnabled =
		    cfgTransferEnabled instanceof HTMLInputElement ? cfgTransferEnabled.checked !== false : true;

		  const field = cfgTransferDest.closest(".mode-field") || cfgTransferDest;
		  const pickFirstOptionValue = () => {
		    const options = Array.from(cfgTransferDest.options || []);
		    const found = options.find((option) => option && option.value && !option.disabled);
		    return found ? String(found.value) : "";
		  };

		  if (!transferEnabled) {
		    cfgTransferDest.disabled = true;
		    if (field instanceof HTMLElement && field.getAttribute("data-mode-disabled") === "1") {
		      field.classList.remove("is-dep-disabled");
		      field.removeAttribute("data-disabled-reason");
		      field.removeAttribute("data-mode-disabled");
		    }
		    return;
		  }

		  if (mode === "auto") {
		    const priorityValue =
		      cfgTransferPriority instanceof HTMLSelectElement
		        ? String(cfgTransferPriority.value || "").trim()
		        : "";
		    const remembered = String(cfgTransferDest.dataset.selected || "").trim();
		    const resolved = priorityValue || remembered || pickFirstOptionValue();
		    if (resolved) {
		      cfgTransferDest.value = resolved;
		      cfgTransferDest.dataset.selected = resolved;
		    }
		    cfgTransferDest.disabled = true;
		  } else {
		    cfgTransferDest.disabled = false;
		  }
		  if (field instanceof HTMLElement) {
		    if (mode === "auto") {
		      field.classList.add("is-dep-disabled");
		      field.setAttribute(
		        "data-disabled-reason",
		        "Automática: usamos la Bodega prioritaria (o la primera disponible) como destino.",
		      );
		      field.setAttribute("data-mode-disabled", "1");
		    } else if (field.getAttribute("data-mode-disabled") === "1") {
		      field.classList.remove("is-dep-disabled");
		      field.removeAttribute("data-disabled-reason");
		      field.removeAttribute("data-mode-disabled");
		    }
		  }
		  updateInvoiceWarehouseFromTransfer();
		}

		function updateInvoiceWarehouseFromTransfer() {
		  if (!(cfgWarehouse instanceof HTMLSelectElement)) return;
		  const createInvoice =
		    syncOrdersShopifyInvoice instanceof HTMLInputElement
		      ? Boolean(syncOrdersShopifyInvoice.checked)
		      : syncOrdersShopify instanceof HTMLSelectElement
		        ? syncOrdersShopify.value === "invoice"
		        : false;
		  const transferEnabled =
		    cfgTransferEnabled instanceof HTMLInputElement ? cfgTransferEnabled.checked !== false : true;
		  const destinationId =
		    cfgTransferDest instanceof HTMLSelectElement
		      ? String(cfgTransferDest.value || "").trim()
		      : "";
		  const field = cfgWarehouse.closest(".mode-field") || cfgWarehouse;
		  const shouldLock = createInvoice && transferEnabled && Boolean(destinationId);

		  if (shouldLock) {
		    cfgWarehouse.dataset.selected = destinationId;
		    if (cfgWarehouse.options.length) {
		      cfgWarehouse.value = destinationId;
		    }
		    cfgWarehouse.disabled = true;
		    if (field instanceof HTMLElement) {
		      field.classList.add("is-dep-disabled");
		      field.setAttribute(
		        "data-disabled-reason",
		        "La factura usa la bodega destino definida en Logistica e inventario.",
		      );
		      field.setAttribute("data-transfer-locked", "1");
		    }
		    return;
		  }

		  if (field instanceof HTMLElement && field.getAttribute("data-transfer-locked") === "1") {
		    field.classList.remove("is-dep-disabled");
		    field.removeAttribute("data-disabled-reason");
		    field.removeAttribute("data-transfer-locked");
		  }
		  cfgWarehouse.disabled = false;
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
    productsTableBody.innerHTML = `<tr><td colspan="13" class="empty">Cargando productos...</td></tr>`;
    return;
  }
  if (!productsRows.length) {
    productsTableBody.innerHTML = `<tr><td colspan="13" class="empty">Sin productos para mostrar.</td></tr>`;
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
      const shopifyTracked = resolvedLookup?.tracked === true;
      const shopifyPolicy = resolvedLookup?.inventoryPolicy || "";
      const shopifyOverSell = shopifyPolicy === "CONTINUE";
      const hasSku = Boolean(product.sku && product.sku !== "Sin referencia");
      const isPublished = Boolean(resolvedLookup?.published);
      const statusLabel = isPublished ? "Publicado" : product.sku ? "Pendiente" : "Sin SKU";
      const statusClass = isPublished ? "status-chip is-success" : "status-chip is-warning";
      const alegraStatus = normalizeStatus(product.status) === "inactive" ? "Inactivo" : "Activo";
      const alegraStatusClass =
        normalizeStatus(product.status) === "inactive" ? "status-chip is-error" : "status-chip is-success";
      const allowToggle = row.type === "variant" || (row.type === "parent" && !row.hasChildren);
      const alegraIdValue = product.id ? String(product.id) : "";
      const alegraOverSell = Boolean(product.alegraOverSell);
      const alegraTrackable = product.alegraTrackable !== false && Boolean(alegraIdValue);
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
          <td class="product-toggle-cell">
            ${
              allowToggle
                ? `<label class="toggle-field" title="Seguimiento de inventarios en Contable (Alegra)">
                    <input type="checkbox" class="toggle toggle-mini product-track-toggle" data-track-target="alegra" data-alegra-id="${alegraIdValue}" ${alegraTrackable ? "checked" : ""} ${alegraIdValue ? "" : "disabled"} />
                  </label>`
                : "—"
            }
          </td>
          <td class="product-toggle-cell">
            ${
              allowToggle
                ? `<label class="toggle-field" title="Seguimiento de inventarios en E‑commerce (Shopify)">
                    <input type="checkbox" class="toggle toggle-mini product-track-toggle" data-track-target="shopify" data-sku="${hasSku ? product.sku : ""}" ${shopifyTracked ? "checked" : ""} ${hasSku ? "" : "disabled"} />
                  </label>`
                : "—"
            }
          </td>
          <td class="product-toggle-cell">
            ${
              allowToggle
                ? `<label class="toggle-field" title="Sobreventa en Contable (Alegra)">
                    <input type="checkbox" class="toggle toggle-mini product-oversell-toggle" data-oversell-target="alegra" data-alegra-id="${alegraIdValue}" ${alegraOverSell ? "checked" : ""} ${alegraTrackable ? "" : "disabled"} />
                  </label>`
                : "—"
            }
          </td>
          <td class="product-toggle-cell">
            ${
              allowToggle
                ? `<label class="toggle-field" title="Sobreventa en E‑commerce (Shopify)">
                    <input type="checkbox" class="toggle toggle-mini product-oversell-toggle" data-oversell-target="shopify" data-sku="${hasSku ? product.sku : ""}" ${shopifyOverSell ? "checked" : ""} ${shopifyTracked && hasSku ? "" : "disabled"} />
                  </label>`
                : "—"
            }
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

  productsTableBody.onchange = async (event) => {
    const input =
      event.target instanceof HTMLInputElement
        ? event.target
        : event.target instanceof HTMLElement
          ? event.target.closest("input")
          : null;
    if (!input) return;
    if (input.classList.contains("product-oversell-toggle")) {
      const target = input.getAttribute("data-oversell-target") || "";
      const alegraId = input.getAttribute("data-alegra-id") || "";
      const sku = input.getAttribute("data-sku") || "";
      const nextValue = input.checked;
      try {
        input.disabled = true;
        await updateProductOversell({ target, alegraId, sku, value: nextValue });
        if (target === "alegra" && alegraId) {
          const match = productsList.find((item) => String(item.id) === String(alegraId));
          if (match) match.alegraOverSell = nextValue;
          productsRows.forEach((row) => {
            if (String(row.item?.id || "") === String(alegraId)) {
              row.item.alegraOverSell = nextValue;
            }
          });
        }
        if (target === "shopify" && sku) {
          const entry = shopifyLookup[sku];
          if (entry) {
            entry.inventoryPolicy = nextValue ? "CONTINUE" : "DENY";
          }
        }
        showToast("Configuracion actualizada.", "is-success");
      } catch (error) {
        input.checked = !nextValue;
        showToast(error?.message || "No se pudo guardar la configuracion.", "is-warn");
      } finally {
        input.disabled = false;
      }
      return;
    }
    if (input.classList.contains("product-track-toggle")) {
      const target = input.getAttribute("data-track-target") || "";
      const alegraId = input.getAttribute("data-alegra-id") || "";
      const sku = input.getAttribute("data-sku") || "";
      const nextValue = input.checked;
      try {
        input.disabled = true;
        const alegraItem = alegraId
          ? productsList.find((item) => String(item.id) === String(alegraId))
          : null;
        await updateProductTracking({
          target,
          alegraId,
          sku,
          value: nextValue,
          inventoryQuantity: alegraItem?.inventoryQuantity ?? null,
          inventoryUnit: alegraItem?.inventoryUnit || "u",
          allowOversellAlegra: Boolean(alegraItem?.alegraOverSell),
        });
        if (target === "alegra" && alegraId) {
          productsRows.forEach((row) => {
            if (String(row.item?.id || "") === String(alegraId)) {
              row.item.alegraTrackable = nextValue;
              if (!nextValue) {
                row.item.alegraOverSell = false;
              }
            }
          });
        }
        if (target === "shopify" && sku) {
          const entry = shopifyLookup[sku];
          if (entry) {
            entry.tracked = nextValue;
            if (!nextValue) {
              entry.inventoryPolicy = "DENY";
            }
          }
        }
        renderProducts();
        showToast("Configuracion actualizada.", "is-success");
      } catch (error) {
        input.checked = !nextValue;
        showToast(error?.message || "No se pudo guardar la configuracion.", "is-warn");
      } finally {
        input.disabled = false;
      }
    }
  };

}

async function updateProductOversell({ target, alegraId, sku, value }) {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  const payload = { shopDomain };
  if (target === "alegra") {
    if (!alegraId) throw new Error("Falta el ID de Alegra.");
    payload.alegraId = alegraId;
    payload.allowOversellAlegra = value;
  } else if (target === "shopify") {
    if (!sku) throw new Error("Falta el SKU para Shopify.");
    payload.sku = sku;
    payload.allowOversellShopify = value;
  } else {
    throw new Error("Accion no soportada.");
  }
  await fetchJson("/api/products/oversell", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function updateProductTracking({
  target,
  alegraId,
  sku,
  value,
  inventoryQuantity,
  inventoryUnit,
  allowOversellAlegra,
}) {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  const payload = { shopDomain };
  if (target === "alegra") {
    if (!alegraId) throw new Error("Falta el ID de Alegra.");
    payload.alegraId = alegraId;
    payload.trackInventoryAlegra = value;
    payload.inventoryQuantity = inventoryQuantity;
    payload.inventoryUnit = inventoryUnit;
    payload.allowOversellAlegra = allowOversellAlegra;
  } else if (target === "shopify") {
    if (!sku) throw new Error("Falta el SKU para Shopify.");
    payload.sku = sku;
    payload.trackInventoryShopify = value;
  } else {
    throw new Error("Accion no soportada.");
  }
  await fetchJson("/api/products/tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
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
    const payload = await fetchJson(`/api/alegra/items?${params.toString()}`);
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
  const publishEnabled = rulesAutoPublish ? rulesAutoPublish.checked : true;
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
  const onlyActive = rulesOnlyActive ? rulesOnlyActive.checked : false;
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
    if (productsSyncStatus) productsSyncStatus.textContent = "Sin tienda activa";
    return;
  }
  if (!storeConnections.shopifyConnected || !storeConnections.alegraConnected) {
    setProductsBulkSyncRunning(false);
    showToast("Conecta Shopify y Alegra para ejecutar la sincronizacion masiva.", "is-warn");
    if (productsSyncStatus) productsSyncStatus.textContent = "Faltan conexiones";
    return;
  }
  if (productSettings.sync.publishOnSync) {
    const confirmPublish = window.confirm(
      "El checkbox de publicar esta activo. ¿Seguro que quieres publicar estos productos en Shopify?"
    );
    if (!confirmPublish) {
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
    updated: 0,
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
          warehouseIds: Array.isArray(productSettings.sync.warehouseIds)
            ? productSettings.sync.warehouseIds
            : [],
          includeInventory: productSettings.sync.includeInventory !== false,
          onlyActive: productSettings.sync.onlyActive !== false,
        },
        settings: {
          status: productSettings.publish.status,
          includeImages: productSettings.publish.includeImages,
          vendor: productSettings.publish.vendor,
          publishOnSync: productSettings.sync.publishOnSync !== false,
          updateExisting: productSettings.sync.updateExisting !== false,
          onlyPublishedInShopify: productSettings.sync.onlyPublishedInShopify !== false,
          trackInventory: productSettings.publish.trackInventory !== false,
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
            updated: payload.updated ?? latestTotals.updated,
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
	            const publishOnSync = productSettings?.sync?.publishOnSync !== false;
	            if (!publishOnSync) {
	              productsSyncStatus.textContent =
	                `Revisados ${scanned}/${total || "?"} · Base de datos: sincronizando... · Shopify: OFF`;
	            } else {
	              productsSyncStatus.textContent =
	                `Revisados ${scanned}/${total || "?"}` +
	                ` · Procesados ${latestTotals.processed}` +
	                ` · Shopify actualizados ${latestTotals.updated || 0}` +
	                ` · Shopify publicados ${latestTotals.published}` +
	                ` · Existentes ${latestTotals.skipped}` +
	                ` · No publicados ${latestTotals.skippedUnpublished || 0}` +
	                ` · Reintentos ${latestTotals.rateLimitRetries}`;
	            }
	          }
	          continue;
	        }
	        if (payload.type === "complete") {
          const parents = payload.parentCount ?? 0;
          const variants = payload.variantCount ?? 0;
          const total = payload.total ?? payload.scanned ?? payload.processed ?? 0;
          const scanned = payload.scanned ?? 0;
          const processed = payload.processed ?? 0;
          const updated = payload.updated ?? 0;
          const published = payload.published ?? 0;
          const skipped = payload.skipped ?? 0;
          const failed = payload.failed ?? 0;
          const rateLimitRetries = payload.rateLimitRetries ?? 0;
	          const publishOnSync = payload.publishOnSync !== false;
	          const updateExisting = payload.updateExisting !== false;
	          const publishStatus = payload.publishStatus || "draft";
	          const skippedUnpublished = payload.skippedUnpublished ?? 0;
	          const summary =
	            total > 0
	              ? !publishOnSync
	                ? `Total: ${total} · Revisados: ${scanned} · Base de datos: OK · Fallidos: ${failed} · Padres: ${parents} · Variantes: ${variants} · Actualizar existentes: ${updateExisting ? "Si" : "No"} · Shopify: OFF`
	                : `Total: ${total} · Revisados: ${scanned} · Procesados: ${processed} · Shopify actualizados: ${updated} · Shopify publicados: ${published} · Existentes: ${skipped} · No publicados: ${skippedUnpublished} · Reintentos: ${rateLimitRetries} · Fallidos: ${failed} · Padres: ${parents} · Variantes: ${variants} · Publicar: ${publishOnSync ? "Si" : "No"} · Estado: ${publishStatus} · Actualizar existentes: ${updateExisting ? "Si" : "No"}`
	              : payload?.message
	                ? payload.message
	                : "Sin productos para sincronizar con esos filtros.";
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
    const updated = Number(latestTotals.updated) || 0;
    const published = Number(latestTotals.published) || 0;
    const skipped = Number(latestTotals.skipped) || 0;
	    const skippedUnpublished = Number(latestTotals.skippedUnpublished) || 0;
	    const failed = Number(latestTotals.failed) || 0;
	    const rateLimitRetries = Number(latestTotals.rateLimitRetries) || 0;
	    const publishOnSync = productSettings?.sync?.publishOnSync !== false;
	    const summary =
	      total > 0
	        ? !publishOnSync
	          ? `Total: ${total} · Revisados: ${scanned} · Base de datos: OK · Fallidos: ${failed}`
	          : `Total: ${total} · Revisados: ${scanned} · Procesados: ${processed} · Shopify actualizados: ${updated} · Shopify publicados: ${published} · Existentes: ${skipped} · No publicados: ${skippedUnpublished} · Reintentos: ${rateLimitRetries} · Fallidos: ${failed}`
	        : "Sin productos para sincronizar con esos filtros.";
	    if (productsSyncStatus) {
	      productsSyncStatus.textContent = summary;
	    }
	    finishProductsProgress("Productos 100%");
	    stopProgress("Productos 100%");
	    activeProductsSyncId = "";
	  } catch (error) {
	    const message = error?.message || "No se pudo sincronizar productos.";
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

async function runProductsShopifyBulkSync() {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!shopDomain) {
    setProductsShopifyBulkStatus("Selecciona una tienda.", "is-warn");
    return;
  }
  const dateStart =
    productsShopifyBulkDateStart instanceof HTMLInputElement ? productsShopifyBulkDateStart.value : "";
  const dateEnd =
    productsShopifyBulkDateEnd instanceof HTMLInputElement ? productsShopifyBulkDateEnd.value : "";
  const limitRaw =
    productsShopifyBulkLimit instanceof HTMLInputElement ? Number(productsShopifyBulkLimit.value) : 0;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : null;

  const createInAlegra =
    productsShopifyBulkCreate instanceof HTMLInputElement ? Boolean(productsShopifyBulkCreate.checked) : false;
  const updateInAlegra =
    productsShopifyBulkUpdate instanceof HTMLInputElement ? Boolean(productsShopifyBulkUpdate.checked) : true;
  const includeInventory =
    productsShopifyBulkIncludeInventory instanceof HTMLInputElement
      ? Boolean(productsShopifyBulkIncludeInventory.checked)
      : false;
  const matchPriority =
    productsShopifyBulkMatch instanceof HTMLSelectElement ? productsShopifyBulkMatch.value : "sku_barcode";
  const warehouseId =
    productsShopifyBulkWarehouse instanceof HTMLSelectElement ? productsShopifyBulkWarehouse.value : "";

  if (includeInventory) {
    if (!warehouseId || !String(warehouseId).trim()) {
      markFieldError(productsShopifyBulkWarehouse, "Selecciona una bodega destino para inventario.");
      setProductsShopifyBulkStatus("Bodega destino requerida para inventario.", "is-error");
      return;
    }
    clearFieldError(productsShopifyBulkWarehouse);
  } else {
    clearFieldError(productsShopifyBulkWarehouse);
  }

  setProductsShopifyBulkStatus("Sincronizando...", "");
  updateProductsShopifyBulkProgress(0, "Productos 0% · ETA --:--");
  let startedAt = Date.now();
  let totals = {
    totalVariants: null,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  if (productsShopifyBulkAbort) {
    try {
      productsShopifyBulkAbort.abort();
    } catch {
      // ignore
    }
  }
  const controller = new AbortController();
  productsShopifyBulkAbort = controller;
  setProductsShopifyBulkRunning(true);
  activeProductsShopifyBulkSyncId = "";

  try {
    const response = await fetch("/api/sync/products/shopify-to-alegra?stream=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopDomain,
        filters: { dateStart: dateStart || undefined, dateEnd: dateEnd || undefined, limit },
        settings: {
          createInAlegra,
          updateInAlegra,
          includeInventory,
          matchPriority,
          warehouseId: includeInventory ? warehouseId || undefined : undefined,
        },
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(text || "No se pudo sincronizar productos (Shopify → Alegra).");
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
        if (payload.syncId && !activeProductsShopifyBulkSyncId) {
          activeProductsShopifyBulkSyncId = String(payload.syncId || "");
        }
        if (payload.type === "start") {
          startedAt = Date.now();
          if (Number.isFinite(payload.totalVariants)) totals.totalVariants = payload.totalVariants;
          continue;
        }
        if (payload.type === "progress") {
          totals = {
            ...totals,
            totalVariants: payload.totalVariants ?? totals.totalVariants,
            processed: payload.processed ?? totals.processed,
            created: payload.created ?? totals.created,
            updated: payload.updated ?? totals.updated,
            skipped: payload.skipped ?? totals.skipped,
            failed: payload.failed ?? totals.failed,
          };
        }
        if (payload.type === "variant" && payload.result && payload.ok) {
          const action = payload.result.action || "";
          if (action === "created") totals.created += 1;
          else if (action === "updated") totals.updated += 1;
          else totals.skipped += 1;
          totals.processed = Number(payload.processed || totals.processed);
        }
        if (payload.type === "variant" && payload.ok === false) {
          totals.failed += 1;
          totals.processed = Number(payload.processed || totals.processed);
        }
        if (payload.type === "canceled") {
          setProductsShopifyBulkStatus("Sincronizacion detenida.", "is-warn");
          updateProductsShopifyBulkProgress(100, "Productos detenido");
          continue;
        }
        if (payload.type === "error") {
          throw new Error(payload.error || "No se pudo sincronizar.");
        }

        const total = Number(totals.totalVariants) || 0;
        const processed = Number(totals.processed) || 0;
        const percent = total > 0 ? (processed / total) * 100 : 0;
        const elapsedMs = Date.now() - startedAt;
        const rate = processed > 0 ? elapsedMs / processed : 0;
        const remainingMs = total > 0 && rate > 0 ? rate * Math.max(0, total - processed) : 0;
        const etaText = total > 0 ? formatDuration(remainingMs) : "--:--";
        updateProductsShopifyBulkProgress(percent, `Productos ${Math.round(percent)}% · ETA ${etaText}`);
        setProductsShopifyBulkStatus(
          `Procesadas ${processed}/${total || "?"}` +
            ` · Creadas ${totals.created}` +
            ` · Actualizadas ${totals.updated}` +
            ` · Existentes ${totals.skipped}` +
            ` · Fallidas ${totals.failed}`,
          ""
        );
      }
    }
    const total = Number(totals.totalVariants) || 0;
    const processed = Number(totals.processed) || 0;
    setProductsShopifyBulkStatus(
      total > 0
        ? `Total ${total} · Creadas ${totals.created} · Actualizadas ${totals.updated} · Existentes ${totals.skipped} · Fallidas ${totals.failed}`
        : "Sin datos para sincronizar.",
      totals.failed ? "is-warn" : "is-ok"
    );
    updateProductsShopifyBulkProgress(100, "Productos 100%");
  } catch (error) {
    const message = String(error?.message || "No se pudo sincronizar.");
    if (message.includes("aborted") || message.includes("AbortError")) {
      setProductsShopifyBulkStatus("Detenido.", "is-warn");
      updateProductsShopifyBulkProgress(100, "Productos detenido");
    } else {
      setProductsShopifyBulkStatus(message, "is-error");
      updateProductsShopifyBulkProgress(100, "Error en productos");
    }
  } finally {
    productsShopifyBulkAbort = null;
    activeProductsShopifyBulkSyncId = "";
    setProductsShopifyBulkRunning(false);
  }
}

async function runStoreProductsSync() {
  const sourceProvider = storeSyncSourceProviderSelect?.value || "shopify";
  const targetProvider = storeSyncTargetProviderSelect?.value || "shopify";
  const source = normalizeShopDomain(storeSyncSourceSelect?.value || "");
  const target = normalizeShopDomain(storeSyncTargetSelect?.value || "");
  const scope = storeSyncScopeSelect instanceof HTMLSelectElement ? storeSyncScopeSelect.value : "products";
  const alegraAccountId =
    storeSyncAlegraAccountSelect instanceof HTMLSelectElement
      ? Number(storeSyncAlegraAccountSelect.value || 0)
      : 0;
  const priceListId =
    storeSyncPriceListSelect instanceof HTMLSelectElement ? storeSyncPriceListSelect.value : "";
  if (scope !== "products") {
    if (storeSyncStatusLabel) storeSyncStatusLabel.textContent = "Inventario: proximo modulo. Selecciona Productos.";
    return;
  }
  if (!source || !target) {
    if (storeSyncStatusLabel) storeSyncStatusLabel.textContent = "Selecciona tiendas origen y destino.";
    return;
  }
  if (sourceProvider === targetProvider && source === target) {
    if (storeSyncStatusLabel) storeSyncStatusLabel.textContent = "Origen y destino deben ser diferentes.";
    return;
  }
  if (!Number.isFinite(alegraAccountId) || alegraAccountId <= 0) {
    if (storeSyncStatusLabel) storeSyncStatusLabel.textContent = "Selecciona una cuenta Alegra.";
    return;
  }
  if (!priceListId || !String(priceListId).trim()) {
    if (storeSyncStatusLabel) storeSyncStatusLabel.textContent = "Selecciona una lista de precios.";
    return;
  }

  const statusValue =
    storeSyncStatusSelect instanceof HTMLSelectElement ? storeSyncStatusSelect.value : "draft";
  const priceFallback =
    storeSyncPriceFallbackSelect instanceof HTMLSelectElement
      ? storeSyncPriceFallbackSelect.value
      : "shopify";
  const onlyActive =
    storeSyncOnlyActive instanceof HTMLInputElement ? Boolean(storeSyncOnlyActive.checked) : true;
  const includeDescriptions =
    storeSyncIncludeDescriptions instanceof HTMLInputElement
      ? Boolean(storeSyncIncludeDescriptions.checked)
      : true;
  const includeImages =
    storeSyncIncludeImages instanceof HTMLInputElement ? Boolean(storeSyncIncludeImages.checked) : true;
  const includeProductType =
    storeSyncIncludeProductType instanceof HTMLInputElement
      ? Boolean(storeSyncIncludeProductType.checked)
      : true;
  const includeTags =
    storeSyncIncludeTags instanceof HTMLInputElement ? Boolean(storeSyncIncludeTags.checked) : true;
  const trackInventory =
    storeSyncTrackInventory instanceof HTMLInputElement
      ? Boolean(storeSyncTrackInventory.checked)
      : true;
  const includeInventory =
    storeSyncIncludeInventory instanceof HTMLInputElement
      ? Boolean(storeSyncIncludeInventory.checked)
      : true;
  const inventorySource = getStoreSyncInventorySource();

  if (storeSyncStatusLabel) storeSyncStatusLabel.textContent = "Sincronizando...";
  try {
    const isShopifyOnly = sourceProvider === "shopify" && targetProvider === "shopify";
    const result = await fetchJson("/api/sync/stores/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: isShopifyOnly ? "shopify" : "cross",
        sourceProvider,
        targetProvider,
        sourceShopDomain: source,
        targetShopDomain: target,
        settings: {
          alegraAccountId,
          priceListId,
          priceFallback,
          status: statusValue === "active" ? "active" : "draft",
          onlyActive,
          includeDescriptions,
          includeImages,
          includeProductType,
          includeTags,
          trackInventory,
          includeInventory,
          inventorySource,
        },
      }),
    });
    const total = Number(result?.total) || 0;
    const created = Number(result?.created) || 0;
    const updated = Number(result?.updated) || 0;
    const skipped = Number(result?.skipped) || 0;
    const failed = Number(result?.failed) || 0;
    if (storeSyncStatusLabel) {
      storeSyncStatusLabel.textContent =
        total > 0
          ? `Total ${total} · Creados ${created} · Actualizados ${updated} · Omitidos ${skipped} · Fallidos ${failed}`
          : "Sin productos para sincronizar.";
    }
  } catch (error) {
    const message = error?.message || "No se pudo sincronizar productos entre tiendas.";
    if (storeSyncStatusLabel) storeSyncStatusLabel.textContent = message;
  }
}

	async function runOrdersSync() {
	  refreshProductSettingsFromInputs();
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
	  if (ordersBulkSyncAbort) {
	    try {
	      ordersBulkSyncAbort.abort();
	    } catch {
	      // ignore abort failures
	    }
	  }
	  const controller = new AbortController();
	  ordersBulkSyncAbort = controller;
	  setOrdersBulkSyncRunning(true);
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
	    signal: controller.signal,
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
	            const synced = Number(payload.synced) || 0;
	            const skipped = Number(payload.skipped) || 0;
	            const failed = Number(payload.failed) || 0;
	            ordersSyncStatus.textContent =
	              `Procesados ${processed}/${total || "?"}` +
	              ` · Facturados ${synced}` +
	              ` · Existentes ${skipped}` +
	              ` · Fallidos ${failed}`;
	          }
	          continue;
	        }
	        if (payload.type === "complete") {
	          const total = Number(payload.total ?? payload.processed ?? 0) || 0;
	          const processed = Number(payload.processed ?? 0) || 0;
	          const synced = Number(payload.synced ?? 0) || 0;
	          const skipped = Number(payload.skipped ?? 0) || 0;
	          const failed = Number(payload.failed ?? 0) || 0;
	          const summary =
	            total > 0
	              ? `Total: ${total} · Procesados: ${processed} · Facturados: ${synced} · Existentes: ${skipped} · Fallidos: ${failed}`
	              : "Sin pedidos para sincronizar con esos filtros.";
	          if (ordersSyncStatus) {
	            ordersSyncStatus.textContent = summary;
	          }
	          finishOrdersProgress("Pedidos 100%");
	          stopProgress("Pedidos 100%");
	          await loadOperationsView();
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
    if (ordersSyncStatus) {
      ordersSyncStatus.textContent = summary;
    }
    finishOrdersProgress("Pedidos 100%");
    stopProgress("Pedidos 100%");
		    await loadOperationsView();
		  } catch (error) {
	    const message = error?.message || "No se pudo sincronizar pedidos.";
	    if (ordersSyncStatus) {
	      ordersSyncStatus.textContent = message;
	    }
	    stopProgress("Error en pedidos");
	    finishOrdersProgress("Error en pedidos");
	  } finally {
	    ordersBulkSyncAbort = null;
	    setOrdersBulkSyncRunning(false);
	}
}

async function runInvoicesBackfill() {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  const limit = invoicesBackfillLimit instanceof HTMLInputElement ? Number(invoicesBackfillLimit.value || 0) : 0;
  const createShopify =
    invoicesBackfillCreateShopify instanceof HTMLInputElement
      ? Boolean(invoicesBackfillCreateShopify.checked)
      : false;
  const modeRaw = invoicesBackfillMode ? String(invoicesBackfillMode.value || "draft") : "draft";
  const mode = modeRaw === "active" ? "active" : "draft";
  const dateStart =
    invoicesBackfillDateStart instanceof HTMLInputElement ? invoicesBackfillDateStart.value : "";
  const dateEnd =
    invoicesBackfillDateEnd instanceof HTMLInputElement ? invoicesBackfillDateEnd.value : "";

  setInvoicesBackfillStatus(createShopify ? "Sincronizando..." : "Cargando...", "");
  const stop = (finalLabel) => {
    if (!invoicesBackfillProgress || !invoicesBackfillProgressBar || !invoicesBackfillProgressLabel) {
      return;
    }
    invoicesBackfillProgressBar.style.width = "100%";
    invoicesBackfillProgressLabel.textContent = finalLabel || "Facturas 100%";
    setTimeout(() => {
      invoicesBackfillProgress.classList.remove("is-active");
      invoicesBackfillProgressBar.style.width = "0%";
    }, 800);
  };
  if (invoicesBackfillProgress && invoicesBackfillProgressBar && invoicesBackfillProgressLabel) {
    invoicesBackfillProgress.classList.add("is-active");
    invoicesBackfillProgressBar.style.width = "0%";
    invoicesBackfillProgressLabel.textContent = "Facturas 0% · ETA --:--";
  }

  if (invoicesBackfillAbort) {
    try {
      invoicesBackfillAbort.abort();
    } catch {
      // ignore
    }
  }
  const controller = new AbortController();
  invoicesBackfillAbort = controller;
  setInvoicesBackfillRunning(true);

  let latestTotals = { total: null, processed: 0, pages: 0 };
  let startedAt = Date.now();

  try {
    const response = await fetch(
      createShopify ? "/api/sync/invoices?stream=1" : "/api/backfill/orders?stream=1",
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopDomain,
        ...(createShopify
          ? {
              mode,
              filters: {
                limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
                dateStart: dateStart || undefined,
                dateEnd: dateEnd || undefined,
              },
            }
          : {
              source: "alegra",
              limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
              dateStart: dateStart || undefined,
              dateEnd: dateEnd || undefined,
            }),
        stream: true,
      }),
      signal: controller.signal,
    }
    );
    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(
        text || (createShopify ? "No se pudieron sincronizar facturas." : "No se pudieron cargar facturas.")
      );
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
          startedAt = payload.startedAt || Date.now();
          if (Number.isFinite(payload.total)) {
            latestTotals.total = payload.total;
          }
          if (Number.isFinite(payload.pages)) {
            latestTotals.pages = payload.pages;
          }
          continue;
        }
        if (payload.type === "progress") {
          latestTotals = {
            ...latestTotals,
            total: payload.total ?? latestTotals.total,
            processed: payload.processed ?? latestTotals.processed,
            pages: payload.pages ?? latestTotals.pages,
          };
          const total = Number(latestTotals.total) || 0;
          const processed = Number(latestTotals.processed) || 0;
          const percent = total > 0 ? (processed / total) * 100 : 0;
          const elapsedMs = Date.now() - startedAt;
          const rate = processed > 0 ? elapsedMs / processed : 0;
          const remainingMs = total > 0 && rate > 0 ? rate * Math.max(0, total - processed) : 0;
          const etaText = total > 0 ? formatDuration(remainingMs) : "--:--";
          if (invoicesBackfillProgress && invoicesBackfillProgressBar && invoicesBackfillProgressLabel) {
            invoicesBackfillProgress.classList.add("is-active");
            invoicesBackfillProgressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            invoicesBackfillProgressLabel.textContent = `Facturas ${Math.round(percent)}% · ETA ${etaText}`;
          }
          if (createShopify) {
            const created = Number(payload.created ?? 0) || 0;
            const skipped = Number(payload.skipped ?? 0) || 0;
            const failed = Number(payload.failed ?? 0) || 0;
            setInvoicesBackfillStatus(
              `Procesadas ${processed}/${total || "?"}` +
                ` · Creadas ${created}` +
                ` · Existentes ${skipped}` +
                ` · Fallidas ${failed}`,
              ""
            );
          } else {
            setInvoicesBackfillStatus(
              `Procesadas ${processed}/${total || "?"} · Paginas ${latestTotals.pages}`,
              ""
            );
          }
          continue;
        }
        if (payload.type === "complete") {
          const total = Number(payload.total ?? latestTotals.total ?? 0) || 0;
          const processed = Number(payload.processed ?? payload.count ?? latestTotals.processed ?? 0) || 0;
          if (createShopify) {
            const created = Number(payload.created ?? 0) || 0;
            const skipped = Number(payload.skipped ?? 0) || 0;
            const failed = Number(payload.failed ?? 0) || 0;
            const summary =
              total > 0
                ? `Total: ${total} · Procesadas: ${processed} · Creadas: ${created} · Existentes: ${skipped} · Fallidas: ${failed}`
                : "Sin facturas para sincronizar con esos filtros.";
            setInvoicesBackfillStatus(summary, failed ? "is-warn" : "is-ok");
          } else {
            const pages = Number(payload.pages ?? latestTotals.pages ?? 0) || 0;
            const summary =
              processed > 0
                ? `Facturas cargadas: ${processed} · Paginas: ${pages}`
                : "Sin facturas para cargar con esos filtros.";
            setInvoicesBackfillStatus(summary, "is-ok");
          }
          stop("Facturas 100%");
          await loadOperationsView();
          return;
        }
        if (payload.type === "error") {
          throw new Error(
            payload.error ||
              (createShopify ? "No se pudieron sincronizar facturas." : "No se pudieron cargar facturas.")
          );
        }
      }
    }
    const processed = Number(latestTotals.processed) || 0;
    const summary = processed > 0
      ? (createShopify ? `Facturas procesadas: ${processed}` : `Facturas cargadas: ${processed}`)
      : (createShopify ? "Facturas sincronizadas." : "Facturas cargadas.");
    setInvoicesBackfillStatus(summary, "is-ok");
    stop("Facturas 100%");
    await loadOperationsView();
  } catch (error) {
    const message = String(
      error?.message || (createShopify ? "No se pudieron sincronizar facturas." : "No se pudieron cargar facturas.")
    );
    if (message.includes("aborted") || message.includes("AbortError")) {
      setInvoicesBackfillStatus("Detenido.", "is-warn");
      stop("Facturas detenido");
    } else {
      setInvoicesBackfillStatus(message, "is-error");
      stop("Error en facturas");
    }
  } finally {
    invoicesBackfillAbort = null;
    setInvoicesBackfillRunning(false);
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

let marketingLoading = false;
let marketingReloadTimer = null;
let superAdminLoaded = false;

function isMarketingActive() {
  const marketingSection = document.getElementById("marketing");
  return marketingSection instanceof HTMLElement && marketingSection.classList.contains("is-active");
}

function scheduleMarketingLoad() {
  if (!isMarketingActive()) return;
  if (marketingReloadTimer) {
    clearTimeout(marketingReloadTimer);
  }
  marketingReloadTimer = setTimeout(() => {
    loadMarketing().catch(() => null);
  }, 300);
}

function utcMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function setBillingTopbarVisible(visible) {
  if (!(topbarBilling instanceof HTMLElement)) return;
  topbarBilling.style.display = visible ? "" : "none";
}

async function loadBillingTopbar() {
  try {
    const data = await fetchJson(`/api/billing/summary?t=${Date.now()}`);
    const billedEvents = Number(data.billedEvents || 0) || 0;
    const billedTotal = Number(data.billedTotal || 0) || 0;
    const planLabel = String(data.planName || data.planKey || "").trim();
    if (billingMonthMetrics) {
      billingMonthMetrics.textContent = `Consumo: ${billedEvents} · Cobro: ${formatCurrencyValue(billedTotal)}`;
    }
    if (billingPlanPill) billingPlanPill.textContent = planLabel || "--";
    setBillingTopbarVisible(true);
  } catch {
    setBillingTopbarVisible(false);
  }
}

function setSaStatus(message, className) {
  if (!(saStatus instanceof HTMLElement)) return;
  saStatus.textContent = message || "Sin datos";
  saStatus.classList.remove("is-ok", "is-warn", "is-error");
  if (className) saStatus.classList.add(className);
}

function setSaPane(paneKey) {
  const key = String(paneKey || "tenant");
  if (saPaneTenant) saPaneTenant.style.display = key === "tenant" ? "" : "none";
  if (saPaneServices) saPaneServices.style.display = key === "services" ? "" : "none";
  if (saPanePlans) saPanePlans.style.display = key === "plans" ? "" : "none";
  if (saPaneUsers) saPaneUsers.style.display = key === "users" ? "" : "none";
}

function ensureSaDefaultsUi() {
  if (saPeriod instanceof HTMLInputElement) {
    if (!saPeriod.value) saPeriod.value = utcMonthKey();
  }
}

function getSaTenantId() {
  if (!(saTenant instanceof HTMLSelectElement)) return 0;
  return Number(saTenant.value || 0);
}

function getSaPeriodKey() {
  if (!(saPeriod instanceof HTMLInputElement)) return "";
  return String(saPeriod.value || "").slice(0, 7);
}

async function loadSaTenants() {
  if (!(saTenant instanceof HTMLSelectElement)) return;
  const data = await fetchJson(`/api/sa/tenants?t=${Date.now()}`);
  const items = Array.isArray(data.items) ? data.items : [];
  saTenant.innerHTML = items
    .map((t) => `<option value="${t.id}">${escapeHtml(t.name || `Tenant ${t.id}`)} (#${t.id})</option>`)
    .join("");
  if (!saTenant.value && items[0]?.id) saTenant.value = String(items[0].id);
}

async function loadSaPlans() {
  const assignSelect = saPlanKey instanceof HTMLSelectElement ? saPlanKey : null;
  const limitsSelect = saPlanLimitsKey instanceof HTMLSelectElement ? saPlanLimitsKey : null;
  if (!assignSelect && !limitsSelect) return;
  const data = await fetchJson(`/api/sa/plans?t=${Date.now()}`);
  const items = Array.isArray(data.items) ? data.items : [];
  const html = items
    .filter((p) => p && p.active !== false)
    .map((p) => `<option value="${escapeHtml(p.key)}">${escapeHtml(p.name || p.key)}</option>`)
    .join("");
  if (assignSelect) {
    assignSelect.innerHTML = html;
    if (!assignSelect.value && items[0]?.key) assignSelect.value = String(items[0].key);
  }
  if (limitsSelect) {
    limitsSelect.innerHTML = html;
    if (!limitsSelect.value && items[0]?.key) limitsSelect.value = String(items[0].key);
  }
}

async function loadSaUsage() {
  if (!saUsageBody) return;
  const tenantId = getSaTenantId();
  const period = getSaPeriodKey();
  if (!tenantId || !period) {
    saUsageBody.innerHTML = `<tr><td colspan="4" class="empty">Selecciona tenant y mes.</td></tr>`;
    return;
  }
  try {
    setSaStatus("Cargando...", "");
    const data = await fetchJson(`/api/sa/usage?tenantId=${tenantId}&period=${encodeURIComponent(period)}&t=${Date.now()}`);
    const services = Array.isArray(data.services) ? data.services : [];
    if (!services.length) {
      saUsageBody.innerHTML = `<tr><td colspan="4" class="empty">Sin datos</td></tr>`;
    } else {
      saUsageBody.innerHTML = services
        .map(
          (row) => `
          <tr>
            <td>${escapeHtml(row.serviceKey || "-")}</td>
            <td>${Number(row.usage || 0)}</td>
            <td>${Number(row.billedQty || 0)}</td>
            <td>${formatCurrencyValue(Number(row.billedTotal || 0))}</td>
          </tr>
        `
        )
        .join("");
    }
    setSaStatus("OK", "is-ok");
  } catch (error) {
    setSaStatus(error?.message || "No se pudo cargar.", "is-error");
    saUsageBody.innerHTML = `<tr><td colspan="4" class="empty">Error</td></tr>`;
  }
}

async function loadSaModules() {
  if (!saModulesBody) return;
  const tenantId = getSaTenantId();
  if (!tenantId) {
    saModulesBody.innerHTML = `<tr><td colspan="2" class="empty">Selecciona un tenant.</td></tr>`;
    return;
  }
  const data = await fetchJson(`/api/sa/tenant/modules?tenantId=${tenantId}&t=${Date.now()}`);
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    saModulesBody.innerHTML = `<tr><td colspan="2" class="empty">Sin datos</td></tr>`;
    return;
  }
  saModulesBody.innerHTML = items
    .map((m) => {
      const key = escapeHtml(m.key || "");
      const name = escapeHtml(m.name || m.key || "-");
      const enabled = Boolean(m.enabled);
      const disabled = Boolean(m.active === false);
      return `
        <tr>
          <td>${name}</td>
          <td><input type="checkbox" data-sa-module="${key}" class="toggle" ${enabled ? "checked" : ""} ${disabled ? "disabled" : ""} /></td>
        </tr>
      `;
    })
    .join("");
}

async function loadSaSnapshot() {
  if (
    !(saSnapshotTenantId instanceof HTMLInputElement) ||
    !(saSnapshotPlanKey instanceof HTMLInputElement) ||
    !(saSnapshotPlanType instanceof HTMLInputElement) ||
    !(saSnapshotMonthlyPrice instanceof HTMLInputElement) ||
    !(saSnapshotUpdatedAt instanceof HTMLInputElement) ||
    !(saSnapshotServicesBody instanceof HTMLElement)
  ) {
    return;
  }
  const tenantId = getSaTenantId();
  if (!tenantId) {
    renderSaSnapshot(null, "Selecciona un tenant.");
    return;
  }
  try {
    const data = await fetchJson(`/api/sa/tenant/plan?tenantId=${tenantId}&t=${Date.now()}`);
    if (data && data.snapshot) {
      renderSaSnapshot(data.snapshot, "");
      return;
    }
  } catch (error) {
    renderSaSnapshot(null, error?.message || "No se pudo cargar snapshot.");
    return;
  }
  renderSaSnapshot(null, "Sin datos");
}

async function loadSaServices() {
  if (!saServicesBody) return;
  const data = await fetchJson(`/api/sa/services?t=${Date.now()}`);
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    saServicesBody.innerHTML = `<tr><td colspan="4" class="empty">Sin datos</td></tr>`;
    return;
  }
  saServicesBody.innerHTML = items
    .map((s) => {
      const key = escapeHtml(s.key || "-");
      const name = escapeHtml(s.name || s.key || "-");
      const periodLabel = s.periodType === "total" ? "Total" : "Mensual";
      const activeLabel = s.active === false ? "No" : "Sí";
      return `
        <tr>
          <td>${key}</td>
          <td>${name}</td>
          <td>${periodLabel}</td>
          <td>${activeLabel}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadSaPlanLimits() {
  if (!saPlanLimitsBody) return;
  const planKey = saPlanLimitsKey instanceof HTMLSelectElement ? String(saPlanLimitsKey.value || "") : "";
  if (!planKey) {
    saPlanLimitsBody.innerHTML = `<tr><td colspan="5" class="empty">Selecciona un plan.</td></tr>`;
    return;
  }
  const data = await fetchJson(`/api/sa/plan/limits?planKey=${encodeURIComponent(planKey)}&t=${Date.now()}`);
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    saPlanLimitsBody.innerHTML = `<tr><td colspan="5" class="empty">Sin datos</td></tr>`;
    return;
  }
  saPlanLimitsBody.innerHTML = items
    .map((row) => {
      const serviceKey = escapeHtml(row.serviceKey || "");
      const serviceName = escapeHtml(row.serviceName || row.serviceKey || "-");
      const isUnlimited = row.isUnlimited === true;
      const maxValue = row.maxValue === null || row.maxValue === undefined ? "" : String(row.maxValue);
      const unitPrice = row.unitPrice === null || row.unitPrice === undefined ? "0" : String(row.unitPrice);
      const disabled = row.active === false;
      return `
        <tr>
          <td>
            <div style="display:flex;flex-direction:column;gap:2px">
              <span>${serviceName}</span>
              <span class="muted">${serviceKey}</span>
            </div>
          </td>
          <td><input type="checkbox" class="toggle" data-sa-limit-unlimited="1" data-sa-service="${serviceKey}" ${isUnlimited ? "checked" : ""} ${disabled ? "disabled" : ""} /></td>
          <td><input type="number" min="0" step="1" data-sa-limit-max="1" data-sa-service="${serviceKey}" value="${escapeHtml(maxValue)}" ${disabled ? "disabled" : ""} /></td>
          <td><input type="number" min="0" step="0.01" data-sa-limit-price="1" data-sa-service="${serviceKey}" value="${escapeHtml(unitPrice)}" ${disabled ? "disabled" : ""} /></td>
          <td><button class="ghost" type="button" data-sa-limit-save="${serviceKey}" ${disabled ? "disabled" : ""}>Guardar</button></td>
        </tr>
      `;
    })
    .join("");
}

function resetSaUserForm() {
  editingSaUserId = null;
  if (saUserNameInput) saUserNameInput.value = "";
  if (saUserEmailInput) saUserEmailInput.value = "";
  if (saUserPhoneInput) saUserPhoneInput.value = "";
  if (saUserPasswordInput) saUserPasswordInput.value = "";
  if (saUserCreate) saUserCreate.textContent = "Crear super admin";
  if (saUserCancel) saUserCancel.style.display = "none";
}

function setSaUsersMessage(message) {
  if (saUsersMessage) saUsersMessage.textContent = message || "";
}

function renderSaUsers(items) {
  if (!saUsersBody) return;
  if (!Array.isArray(items) || !items.length) {
    saUsersBody.innerHTML = `<tr><td colspan="5" class="empty">Sin usuarios.</td></tr>`;
    return;
  }
  const byId = new Map(items.map((user) => [String(user.id), user]));
  saUsersBody.innerHTML = items
    .map((user) => {
      const isSelf = Number(user.id) === Number(currentUserId);
      return `
        <tr>
          <td>${escapeHtml(user.name || "-")}</td>
          <td>${escapeHtml(user.email || "-")}</td>
          <td>${escapeHtml(user.phone || "-")}</td>
          <td>${user.createdAt ? formatDate(user.createdAt) : "-"}</td>
          <td>
            <button class="ghost" type="button" data-sa-user-edit="${user.id}">Editar</button>
            <button class="ghost danger" type="button" data-sa-user-delete="${user.id}" ${isSelf ? "disabled" : ""}>Eliminar</button>
          </td>
        </tr>
      `;
    })
    .join("");
  saUsersBody.querySelectorAll("button[data-sa-user-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const userId = String(button.getAttribute("data-sa-user-edit") || "");
      const user = byId.get(userId);
      if (!user) return;
      editingSaUserId = Number(user.id);
      if (saUserNameInput) saUserNameInput.value = user.name || "";
      if (saUserEmailInput) saUserEmailInput.value = user.email || "";
      if (saUserPhoneInput) saUserPhoneInput.value = user.phone || "";
      if (saUserPasswordInput) saUserPasswordInput.value = "";
      if (saUserCreate) saUserCreate.textContent = "Guardar cambios";
      if (saUserCancel) saUserCancel.style.display = "";
      setSaUsersMessage("");
    });
  });
  saUsersBody.querySelectorAll("button[data-sa-user-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = Number(button.getAttribute("data-sa-user-delete") || 0);
      if (!userId) return;
      const confirmDelete = window.confirm("Seguro que deseas eliminar este super admin?");
      if (!confirmDelete) return;
      try {
        await fetchJson(`/api/sa/users/${userId}`, { method: "DELETE" });
        setSaUsersMessage("Super admin eliminado.");
        await loadSaUsers();
      } catch (error) {
        setSaUsersMessage(error?.message || "No se pudo eliminar.");
      }
    });
  });
}

async function loadSaUsers() {
  try {
    resetSaUserForm();
    setSaUsersMessage("");
    const data = await fetchJson(`/api/sa/users?t=${Date.now()}`);
    renderSaUsers(data.items || []);
  } catch (error) {
    setSaUsersMessage(error?.message || "No se pudieron cargar usuarios.");
  }
}

async function saveSaUserFromForm() {
  if (!saUserCreate) return;
  try {
    const name = saUserNameInput ? saUserNameInput.value.trim() : "";
    const email = saUserEmailInput ? saUserEmailInput.value.trim() : "";
    const phone = saUserPhoneInput ? saUserPhoneInput.value.trim() : "";
    const password = saUserPasswordInput ? saUserPasswordInput.value : "";
    if (!email) {
      throw new Error("Email requerido.");
    }
    const payload = { email, name, phone };
    if (password) {
      payload.password = password;
    }
    if (!editingSaUserId && !password) {
      throw new Error("Contrasena requerida.");
    }
    const method = editingSaUserId ? "PUT" : "POST";
    const url = editingSaUserId ? `/api/sa/users/${editingSaUserId}` : "/api/sa/users";
    setSaUsersMessage(editingSaUserId ? "Actualizando..." : "Creando...");
    await fetchJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaUsersMessage(editingSaUserId ? "Super admin actualizado." : "Super admin creado.");
    resetSaUserForm();
    await loadSaUsers();
  } catch (error) {
    setSaUsersMessage(error?.message || "No se pudo guardar.");
  }
}

async function loadSuperAdmin() {
  if (!currentUserIsSuperAdmin) {
    setSaStatus("Sin permisos.", "is-warn");
    return;
  }
  ensureSaDefaultsUi();
  if (saTab instanceof HTMLSelectElement) {
    setSaPane(saTab.value);
  }
  if (!superAdminLoaded) {
    superAdminLoaded = true;
    await Promise.allSettled([loadSaTenants(), loadSaPlans(), loadSaServices()]);
  }
  const tabKey = saTab instanceof HTMLSelectElement ? saTab.value : "tenant";
  if (tabKey === "services") {
    await loadSaServices();
    setSaStatus("OK", "is-ok");
    return;
  }
  if (tabKey === "plans") {
    await loadSaPlanLimits();
    setSaStatus("OK", "is-ok");
    return;
  }
  if (tabKey === "users") {
    await loadSaUsers();
    setSaStatus("OK", "is-ok");
    return;
  }
  await Promise.allSettled([loadSaSnapshot(), loadSaModules(), loadSaUsage()]);
}

function setMarketingStatus(message, className) {
  if (!(marketingStatus instanceof HTMLElement)) return;
  marketingStatus.textContent = message || "Sin datos";
  marketingStatus.classList.remove("is-ok", "is-warn", "is-error");
  if (className) marketingStatus.classList.add(className);
}

function renderSaSnapshot(snapshot, message) {
  if (
    !(saSnapshotTenantId instanceof HTMLInputElement) ||
    !(saSnapshotPlanKey instanceof HTMLInputElement) ||
    !(saSnapshotPlanType instanceof HTMLInputElement) ||
    !(saSnapshotMonthlyPrice instanceof HTMLInputElement) ||
    !(saSnapshotUpdatedAt instanceof HTMLInputElement) ||
    !(saSnapshotServicesBody instanceof HTMLElement)
  ) {
    return;
  }

  if (!snapshot) {
    saSnapshotTenantId.value = "";
    saSnapshotPlanKey.value = "";
    saSnapshotPlanType.value = "";
    saSnapshotMonthlyPrice.value = "";
    saSnapshotUpdatedAt.value = "";
    saSnapshotServicesBody.innerHTML = `<tr><td colspan="5" class="empty">${escapeHtml(message || "Sin datos")}</td></tr>`;
    return;
  }

  const tenantId = snapshot.tenantId ?? snapshot.tenant_id ?? "";
  const planKey = snapshot.planKey ?? snapshot.plan_key ?? "";
  const planType = snapshot.planType ?? snapshot.plan_type ?? "";
  const monthlyPrice = snapshot.monthlyPrice ?? snapshot.monthly_price ?? "";
  const updatedAt = snapshot.updatedAt ?? snapshot.updated_at ?? "";

  saSnapshotTenantId.value = String(tenantId ?? "");
  saSnapshotPlanKey.value = String(planKey ?? "");
  saSnapshotPlanType.value = String(planType ?? "");
  saSnapshotMonthlyPrice.value = String(monthlyPrice ?? "");
  saSnapshotUpdatedAt.value = String(updatedAt ?? "");

  const servicesRaw = snapshot.services || {};
  const servicesList = Object.values(servicesRaw || {}).filter(Boolean);
  if (!servicesList.length) {
    saSnapshotServicesBody.innerHTML = `<tr><td colspan="5" class="empty">Sin servicios</td></tr>`;
    return;
  }

  saSnapshotServicesBody.innerHTML = servicesList
    .map((svc) => {
      const key = escapeHtml(svc.serviceKey || "");
      const periodType = String(svc.periodType || "monthly") === "total" ? "Total" : "Mensual";
      const isUnlimited = svc.isUnlimited === true;
      const maxValue = svc.maxValue === null || svc.maxValue === undefined ? "" : String(svc.maxValue);
      const unitPrice = svc.unitPrice === null || svc.unitPrice === undefined ? "0" : String(svc.unitPrice);
      return `
        <tr>
          <td>${key || "-"}</td>
          <td>${periodType}</td>
          <td><input type="checkbox" class="toggle" ${isUnlimited ? "checked" : ""} disabled /></td>
          <td><input type="number" value="${escapeHtml(maxValue)}" disabled /></td>
          <td><input type="number" value="${escapeHtml(unitPrice)}" disabled /></td>
        </tr>
      `;
    })
    .join("");
}

function ensureMarketingDefaults() {
  const fromEl = marketingFrom instanceof HTMLInputElement ? marketingFrom : null;
  const toEl = marketingTo instanceof HTMLInputElement ? marketingTo : null;
  if (!fromEl || !toEl) return;
  if (fromEl.value && toEl.value) return;
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (!toEl.value) toEl.value = to;
  if (!fromEl.value) fromEl.value = from;
}

function getMarketingQuery() {
  const preferredDomain =
    marketingStoreSelect instanceof HTMLSelectElement
      ? marketingStoreSelect.value
      : "";
  const shopDomain = normalizeShopDomain(preferredDomain || shopifyDomain?.value || activeStoreDomain || "");
  const from = marketingFrom instanceof HTMLInputElement ? String(marketingFrom.value || "") : "";
  const to = marketingTo instanceof HTMLInputElement ? String(marketingTo.value || "") : "";
  return { shopDomain, from, to };
}

function pct(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 1000) / 10; // 1 decimal
}

function renderMarketingDashboard(data) {
  const kpis = data?.kpis || {};
  if (mkKpiRevenue) mkKpiRevenue.textContent = formatCurrencyValue(Number(kpis.revenue || 0));
  if (mkKpiSpend) mkKpiSpend.textContent = formatCurrencyValue(Number(kpis.spend || 0));
  if (mkKpiRoas) {
    mkKpiRoas.textContent = kpis.roas === null || kpis.roas === undefined ? "--" : String(Math.round(Number(kpis.roas || 0) * 10) / 10);
  }
  if (mkKpiAov) {
    mkKpiAov.textContent = kpis.aov === null || kpis.aov === undefined ? "--" : formatCurrencyValue(Number(kpis.aov || 0));
  }

  const funnel = kpis?.funnel || {};
  if (mkFunnelBody) {
    const sessions = Number(funnel.sessions || 0);
    const addToCart = Number(funnel.addToCart || 0);
    const checkouts = Number(funnel.checkouts || 0);
    const paidOrders = Number(funnel.paidOrders || 0);
    const s2c = pct(funnel.convSessionToCart);
    const c2co = pct(funnel.convCartToCheckout);
    const co2p = pct(funnel.convCheckoutToPaid);
    mkFunnelBody.innerHTML = `
      <tr>
        <td>${sessions}</td>
        <td>${addToCart}</td>
        <td>${checkouts}</td>
        <td>${paidOrders}</td>
        <td>${s2c === null ? "--" : `${s2c}%`}</td>
        <td>${c2co === null ? "--" : `${c2co}%`}</td>
        <td>${co2p === null ? "--" : `${co2p}%`}</td>
      </tr>
    `;
  }

  const series = Array.isArray(data?.series) ? data.series : [];
  renderLineChart(
    mkRevenueSeries,
    series.map((point) => ({ date: point.date, amount: Number(point.revenue || 0) }))
  );

  const byChannel = Array.isArray(data?.byChannel) ? data.byChannel : [];
  renderBarChart(mkByChannel, byChannel, {
    labelKey: "channel",
    valueKey: "revenue",
    valueFormatter: (value) => formatCurrencyValue(Number(value || 0)),
  });

  if (mkTopCampaignsBody) {
    const campaigns = Array.isArray(data?.topCampaigns) ? data.topCampaigns : [];
    if (!campaigns.length) {
      mkTopCampaignsBody.innerHTML = `<tr><td colspan="4" class="empty">Sin datos</td></tr>`;
    } else {
      mkTopCampaignsBody.innerHTML = campaigns
        .slice(0, 25)
        .map((row) => {
          const roas = row.roas === null || row.roas === undefined ? null : Number(row.roas);
          return `
            <tr>
              <td>${escapeHtml(row.utmCampaign || "-")}</td>
              <td>${formatCurrencyValue(Number(row.revenue || 0))}</td>
              <td>${Number(row.paidOrders || 0)}</td>
              <td>${roas === null || !Number.isFinite(roas) ? "--" : (Math.round(roas * 10) / 10).toFixed(1)}</td>
            </tr>
          `;
        })
        .join("");
    }
  }
}

function isMarketingDashboardEmpty(data) {
  const kpis = data?.kpis || {};
  const revenue = Number(kpis.revenue || 0);
  const series = Array.isArray(data?.series) ? data.series : [];
  const byChannel = Array.isArray(data?.byChannel) ? data.byChannel : [];
  const topCampaigns = Array.isArray(data?.topCampaigns) ? data.topCampaigns : [];
  const funnel = kpis?.funnel || {};
  const sessions = Number(funnel.sessions || 0);
  const paidOrders = Number(funnel.paidOrders || 0);
  const hasAny =
    revenue > 0 ||
    series.length > 0 ||
    byChannel.length > 0 ||
    topCampaigns.length > 0 ||
    sessions > 0 ||
    paidOrders > 0;
  return !hasAny;
}

async function loadMarketing() {
  if (marketingLoading) return;
  marketingLoading = true;
  try {
    ensureMarketingDefaults();
    const { shopDomain, from, to } = getMarketingQuery();
    if (!shopDomain) {
      setMarketingStatus("Selecciona una tienda en Configuracion → Tiendas.", "is-warn");
      return;
    }
    if (!from || !to) {
      setMarketingStatus("Selecciona un rango de fechas válido.", "is-warn");
      return;
    }

    setMarketingStatus("Cargando dashboard de marketing...", "");
    const params = new URLSearchParams();
    params.set("shopDomain", shopDomain);
    params.set("from", from);
    params.set("to", to);
    params.set("t", String(Date.now()));

    const data = await fetchJson(`/api/marketing/dashboard?${params.toString()}`);
    renderMarketingDashboard(data);
    if (isMarketingDashboardEmpty(data)) {
      setMarketingStatus(
        "Sin datos en este rango. Verifica Pixel + Webhooks en Configuración → Marketing y sincronización de pedidos en Operación.",
        "is-warn"
      );
    } else {
      setMarketingStatus("OK", "is-ok");
    }
  } catch (error) {
    setMarketingStatus(error?.message || "No se pudo cargar marketing.", "is-error");
    renderMarketingDashboard({});
  } finally {
    marketingLoading = false;
  }
}

async function loadMetrics() {
  try {
    const range = metricsRange ? String(metricsRange.value || "month") : "month";
    const params = new URLSearchParams();
    const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
    if (shopDomain) params.set("shopDomain", shopDomain);
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
    renderTopCustomersTable(data.repeatCustomers || data.topCustomers || []);
    renderInventoryAlerts(data.lowStock || [], data.inactiveProducts || []);
    updatePanelVisibility(data);
    if (metricsInsights) {
      const parts = [];
      if (Number.isFinite(data.repeatRate)) parts.push(`Clientes recurrentes: ${data.repeatRate}%`);
      if (Number.isFinite(data.pendingDbRange)) parts.push(`Pendientes por facturar: ${data.pendingDbRange}`);
      if (Number.isFinite(data.ordersDbRange) && Number.isFinite(data.invoicedDbRange)) {
        const orders = Number(data.ordersDbRange) || 0;
        const invoiced = Number(data.invoicedDbRange) || 0;
        if (orders > 0) parts.push(`Facturados: ${Math.round((invoiced / orders) * 100)}%`);
      }
      const lastWebhookAt = data.lastWebhookAt ? formatDate(data.lastWebhookAt) : null;
      if (lastWebhookAt) parts.push(`Último webhook: ${lastWebhookAt}`);
      if (parts.length) {
        metricsInsights.textContent = parts.join(" · ");
        metricsInsights.style.display = "";
      } else if (data.error) {
        metricsInsights.textContent = `Sin métricas externas: ${String(data.error)}`;
        metricsInsights.style.display = "";
      } else {
        metricsInsights.textContent = "";
        metricsInsights.style.display = "none";
      }
    }
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
    if (metricsInsights) {
      metricsInsights.textContent = "";
      metricsInsights.style.display = "none";
    }
  }
}

function downloadMetricsReport() {
  const range = metricsRange ? String(metricsRange.value || "month") : "month";
  const type = metricsReport instanceof HTMLSelectElement ? String(metricsReport.value || "orders") : "orders";
  const params = new URLSearchParams();
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (shopDomain) params.set("shopDomain", shopDomain);
  if (range) params.set("range", range);
  if (type) params.set("type", type);
  window.location.href = `/api/reports/commerce.csv?${params.toString()}`;
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
    const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
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
  if (!opsTableBody) {
    return;
  }
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
  const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
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
	        await loadOperationsView();
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

async function loadInvoices() {
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
    const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
    params.set("limit", String(pageSize));
    params.set("offset", String(invoicesStart));
    const data = await fetchJson(`/api/invoices?${params.toString()}`);
    invoicesList = Array.isArray(data.items) ? data.items : [];
    invoicesTotal = Number.isFinite(data.total) ? Number(data.total) : invoicesList.length;
    renderInvoices(invoicesList);
  } catch {
    invoicesList = [];
    invoicesTotal = 0;
    renderInvoices([]);
  }
}

function renderInvoices(items) {
  if (!invoicesTableBody) return;
  if (!items.length) {
    invoicesTableBody.innerHTML = `<tr><td colspan="6" class="empty">Sin facturas para mostrar.</td></tr>`;
    invoicesTotal = 0;
    invoicesStart = 0;
    if (invoicesPageLabel) invoicesPageLabel.textContent = "Pagina 1 de 1";
    if (invoicesCountLabel) invoicesCountLabel.textContent = "Mostrando 0 de 0";
    if (invoicesPrevBtn) invoicesPrevBtn.disabled = true;
    if (invoicesNextBtn) invoicesNextBtn.disabled = true;
    return;
  }
  const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
  const total = Number(invoicesTotal || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(totalPages, Math.floor(invoicesStart / pageSize) + 1);
  if (invoicesPageLabel) {
    invoicesPageLabel.textContent = `Pagina ${currentPage} de ${totalPages} (${total || 0} facturas)`;
  }
  if (invoicesPageInput) {
    invoicesPageInput.max = String(totalPages);
    invoicesPageInput.value = String(currentPage);
  }
  if (invoicesCountLabel) {
    const startLabel = total === 0 ? 0 : invoicesStart + 1;
    const endLabel = Math.min(invoicesStart + pageSize, total || 0);
    invoicesCountLabel.textContent = `Mostrando ${startLabel}-${endLabel} de ${total || 0}`;
  }
  if (invoicesPrevBtn) invoicesPrevBtn.disabled = invoicesStart <= 0;
  if (invoicesNextBtn) invoicesNextBtn.disabled = invoicesStart + pageSize >= (total || 0);

  invoicesTableBody.innerHTML = items
    .map((item) => {
      const status = String(item.status || item.alegraStatus || "").toLowerCase();
      const statusLabel = status ? status : "-";
      const invoiceId = item.invoiceId || item.alegraInvoiceId || item.id || "";
      const invoiceNumber = item.invoiceNumber || item.number || invoiceId || "-";
      const total = Number(item.total || 0);
      const currency = item.currency || "";
      const totalLabel = Number.isFinite(total) && total > 0 ? `${formatCurrencyValue(total)} ${currency}`.trim() : "-";
      const canDownload = Boolean(invoiceId);
      const actions = canDownload
        ? `<button class="ghost" data-download-invoice="${String(invoiceId)}">Descargar PDF</button>`
        : "-";
      return `
        <tr>
          <td>${item.processedAt ? formatDate(item.processedAt) : "-"}</td>
          <td>${invoiceNumber}</td>
          <td>${item.customer || "-"}</td>
          <td>${totalLabel}</td>
          <td>${statusLabel}</td>
          <td class="actions">${actions}</td>
        </tr>
      `;
    })
    .join("");

  invoicesTableBody.querySelectorAll("button[data-download-invoice]").forEach((button) => {
    button.addEventListener("click", () => {
      const invoiceId = String(button.getAttribute("data-download-invoice") || "");
      if (!invoiceId) return;
      window.location.href = `/api/invoices/${encodeURIComponent(invoiceId)}/pdf`;
    });
  });
}

function loadOperationsView() {
  if (operationsView === "invoices") {
    return loadInvoices();
  }
  return loadOperations();
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
    container.innerHTML = `<div class="empty">Sin datos</div>`;
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
    container.innerHTML = `<div class="empty">Sin datos</div>`;
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
        <td>${Number(item.count || 0) || 0}</td>
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
            <td>${item.sold ?? 0}</td>
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
  const hasTopCustomers =
    (Array.isArray(data.repeatCustomers) && data.repeatCustomers.length > 0) ||
    (Array.isArray(data.topCustomers) && data.topCustomers.length > 0);
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
    avatar.alt = "Asistente IA";
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
      const safeReply = escapeHtml(result.reply || "Listo.").replace(/\n/g, "<br>");
      thinkingBubble.innerHTML = safeReply;
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
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }
  try {
    const params = new URLSearchParams();
    const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
    if (shopDomain) {
      params.set("shopDomain", shopDomain);
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await fetchJson(`/api/alegra/${endpoint}${query}`);
    const items = Array.isArray(data.items) ? data.items : [];
    if (data && typeof data === "object" && "error" in data && data.error) {
      throw new Error(String(data.error));
    }
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
    // Si Alegra no está conectado (403), evitamos llenar la consola.
    const msg = String(error?.message || "");
    if (!msg.includes("Alegra API error: 403")) {
      console.error(error);
    }
  }
}

async function loadResolutions() {
  try {
    const params = new URLSearchParams();
    const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
    if (shopDomain) params.set("shopDomain", shopDomain);
    const query = params.toString() ? `?${params.toString()}` : "";
    const data = await fetchJson(`/api/settings/resolutions${query}`);
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

adsAppSaveButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    setButtonLoading(button, true, "Guardando...");
    try {
      await saveSettings({ includeAdsApps: true });
      showToast("Configuracion Ads guardada.", "is-ok");
    } catch (error) {
      showToast(error?.message || "No se pudo guardar.", "is-error");
    } finally {
      setButtonLoading(button, false);
    }
  });
});

if (aiKey) {
  let aiTokenTimer = null;
  let aiTokenInFlight = false;
  const scheduleAiTokenSave = (delayMs) => {
    if (!aiKey) return;
    const value = aiKey.value.trim();
    if (!value) return;
    if (aiTokenTimer) clearTimeout(aiTokenTimer);
    aiTokenTimer = setTimeout(async () => {
      aiTokenTimer = null;
      if (aiTokenInFlight) return;
      const current = aiKey.value.trim();
      if (!current) return;
      aiTokenInFlight = true;
      try {
        await saveSettings({ includeAi: true });
        showToast("Token guardado.", "is-ok");
      } catch (error) {
        showToast(error?.message || "No se pudo guardar.", "is-error");
      } finally {
        aiTokenInFlight = false;
      }
    }, Math.max(0, Number(delayMs) || 0));
  };

  aiKey.addEventListener("input", () => scheduleAiTokenSave(900));
  aiKey.addEventListener("change", () => scheduleAiTokenSave(250));
  aiKey.addEventListener("blur", () => scheduleAiTokenSave(0));
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
if (wooDomain) {
  wooDomain.addEventListener("input", () => {
    updateConnectionPills();
  });
}

if (syncOrdersShopifyEnabled) {
  syncOrdersShopifyEnabled.addEventListener("change", async () => {
    if (ordersWebhooksToggleSyncing) return;
    const previous = ordersWebhooksToggleValue;
    const next = Boolean(syncOrdersShopifyEnabled.checked);
    ordersWebhooksToggleValue = next;

    applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, "db_only");
    updateOrderSyncDependencies();

    if (ordersWebhooksToggleBusy) {
      setOrdersWebhooksToggleChecked(previous);
      applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, "db_only");
      updateOrderSyncDependencies();
      showToast("Espera a que termine la accion anterior.", "is-warn");
      return;
    }

    ordersWebhooksToggleBusy = true;
    try {
      const ok = next ? await createShopifyWebhooks() : await deleteShopifyWebhooks();
      if (!ok) {
        setOrdersWebhooksToggleChecked(previous);
        applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, "db_only");
        updateOrderSyncDependencies();
        ordersWebhooksToggleValue = previous;
      }
    } finally {
      ordersWebhooksToggleBusy = false;
    }
  });
}

	if (syncOrdersShopifyInvoice instanceof HTMLInputElement) {
	  syncOrdersShopifyInvoice.addEventListener("change", () => {
	    if (!(syncOrdersShopify instanceof HTMLSelectElement)) return;
	    const next = Boolean(syncOrdersShopifyInvoice.checked);
	    if (next) {
	      const previous = syncOrdersShopify.value;
	      syncOrdersShopify.value = "invoice";
	      if (cfgGenerateInvoice instanceof HTMLInputElement) cfgGenerateInvoice.checked = true;
	      if (cfgTransferEnabled instanceof HTMLInputElement) cfgTransferEnabled.checked = true;
	      updateTransferDestinationState();
	      updateInvoiceWarehouseFromTransfer();
	      const ready = warnIfShopifyOrdersInvoiceNotReady();
	      if (!ready) {
	        // No permitir activar "Crear factura" si falta configurar logistica/facturacion.
	        syncOrdersShopifyInvoice.checked = false;
	        syncOrdersShopify.value = previous && previous !== "invoice" ? previous : "db_only";
	      }
	    } else {
	      syncOrdersShopify.value = "db_only";
	      updateInvoiceWarehouseFromTransfer();
	    }
	    updateOrderSyncDependencies();
	    applyToggleDependencies();
	  });
	}

if (syncOrdersAlegraEnabled) {
  syncOrdersAlegraEnabled.addEventListener("change", () => {
    applyOrderToggle(syncOrdersAlegra, syncOrdersAlegraEnabled, "draft");
    updateAlegraOrdersAutoUi();
  });
}

	if (syncOrdersShopify) {
	  syncOrdersShopify.addEventListener("change", () => {
	    if (syncOrdersShopify.value === "invoice" && !warnIfShopifyOrdersInvoiceNotReady()) {
	      syncOrdersShopify.value = "db_only";
	    }
	    if (syncOrdersShopifyInvoice instanceof HTMLInputElement) {
	      syncOrdersShopifyInvoice.checked = syncOrdersShopify.value === "invoice";
	    }
	    if (syncOrdersShopify.value === "invoice" && cfgGenerateInvoice instanceof HTMLInputElement) {
	      cfgGenerateInvoice.checked = true;
	    }
	    if (syncOrdersShopify.value === "invoice" && cfgTransferEnabled instanceof HTMLInputElement) {
	      cfgTransferEnabled.checked = true;
	    }
	    updateTransferDestinationState();
	    updateInvoiceWarehouseFromTransfer();
	    if (syncOrdersShopifyEnabled) {
	      syncOrdersShopifyEnabled.checked = syncOrdersShopify.value !== "off";
	      applyOrderToggle(syncOrdersShopify, syncOrdersShopifyEnabled, "db_only");
	    }
	    updateOrderSyncDependencies();
	    applyToggleDependencies();
	  });
	}

if (syncOrdersAlegra) {
  syncOrdersAlegra.addEventListener("change", () => {
    if (syncOrdersAlegraEnabled) {
      syncOrdersAlegraEnabled.checked = syncOrdersAlegra.value !== "off";
      applyOrderToggle(syncOrdersAlegra, syncOrdersAlegraEnabled, "draft");
    }
    updateAlegraOrdersAutoUi();
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

let ordersWebhooksToggleSyncing = false;
let ordersWebhooksToggleBusy = false;
let ordersWebhooksToggleValue =
  syncOrdersShopifyEnabled instanceof HTMLInputElement ? Boolean(syncOrdersShopifyEnabled.checked) : false;

function setOrdersWebhooksToggleChecked(nextEnabled) {
  if (!(syncOrdersShopifyEnabled instanceof HTMLInputElement)) return;
  const next = Boolean(nextEnabled);
  ordersWebhooksToggleSyncing = true;
  syncOrdersShopifyEnabled.checked = next;
  ordersWebhooksToggleSyncing = false;
  ordersWebhooksToggleValue = next;
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
    return false;
  }
  setShopifyWebhooksStatus("Activando webhooks...");
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
      total > 0 ? `Activados ${okCount}/${total}` : result?.message || "Webhooks activados.";
    setShopifyWebhooksStatus(statusText, okCount === total ? "is-ok" : "is-error");
    await loadShopifyWebhooksStatus();
    advanceWizardStep("sync-orders");
    return okCount === total;
  } catch (error) {
    setShopifyWebhooksStatus(error?.message || "No se pudieron crear.", "is-error");
    return false;
  }
}

async function deleteShopifyWebhooks() {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!shopDomain) {
    setShopifyWebhooksStatus("Dominio Shopify requerido.", "is-error");
    return false;
  }
  setShopifyWebhooksStatus("Desactivando webhooks...");
  try {
    const result = await fetchJson("/api/shopify/webhooks/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopDomain }),
    });
    const deleted = Number(result?.deleted || 0);
    const total = Number(result?.total || 0);
    const statusText =
      total > 0 ? `Desactivados ${deleted}/${total}` : "Webhooks desactivados.";
    setShopifyWebhooksStatus(statusText, deleted === total ? "is-ok" : "is-error");
    await loadShopifyWebhooksStatus();
    return deleted === total;
  } catch (error) {
    setShopifyWebhooksStatus(error?.message || "No se pudieron eliminar.", "is-error");
    return false;
  }
}

function getContactsBulkSelections() {
  const shopifyToAlegra =
    syncContactsBulkShopify instanceof HTMLInputElement ? syncContactsBulkShopify.checked !== false : true;
  const alegraToShopify =
    syncContactsBulkAlegra instanceof HTMLInputElement ? syncContactsBulkAlegra.checked !== false : true;
  return { shopifyToAlegra, alegraToShopify };
}

function updateContactsActionVisibility() {
  const selections = getContactsBulkSelections();
  const anyDirection = Boolean(selections.shopifyToAlegra || selections.alegraToShopify);
  const bulkEnabled = anyDirection && !contactsBulkSyncRunning;

  if (syncContactsBulkRun instanceof HTMLButtonElement) {
    syncContactsBulkRun.hidden = !bulkEnabled;
    syncContactsBulkRun.disabled = !bulkEnabled;
  }
  if (syncContactsBulkClear instanceof HTMLButtonElement) {
    syncContactsBulkClear.hidden = contactsBulkSyncRunning;
    syncContactsBulkClear.disabled = contactsBulkSyncRunning;
  }
  if (syncContactsBulkStop instanceof HTMLButtonElement) {
    syncContactsBulkStop.hidden = !contactsBulkSyncRunning;
    syncContactsBulkStop.disabled = !contactsBulkSyncRunning;
  }
}

async function runBulkContactSync() {
  const shopDomain = normalizeShopDomain(shopifyDomain?.value || activeStoreDomain || "");
  if (!shopDomain) {
    setContactsSyncStatus("Dominio Shopify requerido.", "is-error");
    return;
  }
  const selections = getContactsBulkSelections();
  const shopifyToAlegra = Boolean(selections.shopifyToAlegra);
  const alegraToShopify = Boolean(selections.alegraToShopify);
  if (!shopifyToAlegra && !alegraToShopify) {
    setContactsSyncStatus("Activa al menos una direccion (Shopify → Alegra o Alegra → Shopify).", "is-warn");
    updateContactsActionVisibility();
    return;
  }
  const limit = syncContactLimit ? Number(syncContactLimit.value || 0) : 0;
  const from = syncContactsBulkDateStart instanceof HTMLInputElement ? syncContactsBulkDateStart.value : "";
  const to = syncContactsBulkDateEnd instanceof HTMLInputElement ? syncContactsBulkDateEnd.value : "";
  const createInAlegra =
    syncContactsBulkCreateAlegra instanceof HTMLInputElement
      ? syncContactsBulkCreateAlegra.checked !== false
      : true;
  const createInShopify =
    syncContactsBulkCreateShopify instanceof HTMLInputElement
      ? syncContactsBulkCreateShopify.checked !== false
      : true;
  const directionLabel =
    shopifyToAlegra && alegraToShopify
      ? "Bidireccional"
      : shopifyToAlegra
        ? "Shopify → Alegra"
        : "Alegra → Shopify";
  setContactsSyncStatus("Sincronizando masivo...");
  setContactsBulkSyncRunning(true);
  updateContactsActionVisibility();
  const controller = new AbortController();
  contactsBulkSyncAbort = controller;
  const stopProgress = startSyncProgress("Contactos");
  updateContactsProgress(0, "Contactos 0% · ETA --:--");
  let syncStartTime = Date.now();
  let latestTotals = {
    total: null,
    processed: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
  };
  try {
    const response = await fetch("/api/sync/contacts/bulk?stream=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        direction: shopifyToAlegra && alegraToShopify ? "bidirectional" : (shopifyToAlegra ? "shopify_to_alegra" : "alegra_to_shopify"),
        directions: {
          shopifyToAlegra,
          alegraToShopify,
        },
        from: from || undefined,
        to: to || undefined,
        createInAlegra,
        createInShopify,
        limit: limit || undefined,
        shopDomain,
        stream: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(text || "No se pudo sincronizar.");
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
          continue;
        }
        if (payload.type === "phase_start") {
          syncStartTime = payload.startedAt || Date.now();
          latestTotals = { total: null, processed: 0, synced: 0, skipped: 0, failed: 0 };
          const phaseIndex = Number(payload.phaseIndex || 1);
          const phaseTotal = Number(payload.phaseTotal || 1);
          const phaseLabel = String(payload.directionLabel || "").trim();
          if (syncContactsStatus) {
            syncContactsStatus.textContent = `Fase ${phaseIndex}/${phaseTotal} · ${phaseLabel}`;
          }
          continue;
        }
        if (payload.type === "progress") {
          latestTotals = {
            ...latestTotals,
            total: payload.total ?? latestTotals.total,
            processed: payload.processed ?? latestTotals.processed,
            synced: payload.synced ?? latestTotals.synced,
            skipped: payload.skipped ?? latestTotals.skipped,
            failed: payload.failed ?? latestTotals.failed,
          };
          const total = Number(latestTotals.total) || 0;
          const processed = Number(latestTotals.processed) || 0;
          const phaseIndex = Number(payload.phaseIndex || 1);
          const phaseTotal = Number(payload.phaseTotal || 1);
          const phasePercent = total > 0 ? (processed / total) * 100 : 0;
          const elapsedMs = Date.now() - syncStartTime;
          const rate = processed > 0 ? elapsedMs / processed : 0;
          const remainingMs = total > 0 && rate > 0 ? rate * Math.max(0, total - processed) : 0;
          const percent =
            phaseTotal > 0
              ? ((Math.max(0, phaseIndex - 1) + (phasePercent / 100)) / phaseTotal) * 100
              : phasePercent;
          const etaText = total > 0 ? formatDuration(remainingMs) : "--:--";
          updateContactsProgress(percent, `Contactos ${Math.round(percent)}% · ETA ${etaText}`);
          if (syncContactsStatus) {
            const synced = Number(latestTotals.synced) || 0;
            const skipped = Number(latestTotals.skipped) || 0;
            const failed = Number(latestTotals.failed) || 0;
            const totalLabel = total > 0 ? `${processed}/${total}` : `${processed}/?`;
            const last = payload.last && typeof payload.last === "object" ? payload.last : null;
            const lastLabel = last?.label ? String(last.label) : "";
            const phaseLabel = String(payload.directionLabel || directionLabel);
            syncContactsStatus.textContent =
              `Fase ${phaseIndex}/${phaseTotal} · ${phaseLabel} · Procesados ${totalLabel} · Sincronizados ${synced} · Saltados ${skipped} · Fallidos ${failed}` +
              (lastLabel ? ` · Último: ${lastLabel}` : "") +
              ` · ${directionLabel}`;
          }
          continue;
        }
        if (payload.type === "phase_complete") {
          continue;
        }
        if (payload.type === "complete") {
          const total = payload.total ?? payload.processed ?? 0;
          const processed = payload.processed ?? 0;
          const synced = payload.synced ?? 0;
          const skipped = payload.skipped ?? 0;
          const failed = payload.failed ?? 0;
          const summary =
            total > 0
              ? `Total: ${total} · Procesados: ${processed} · Sincronizados: ${synced} · Saltados: ${skipped} · Fallidos: ${failed} · ${directionLabel}`
              : "Sin contactos para sincronizar con esos filtros.";
          setContactsSyncStatus(summary, "is-ok");
          finishContactsProgress("Contactos 100%");
          stopProgress("Contactos 100%");
          return;
        }
        if (payload.type === "canceled") {
          const summary = "Sincronizacion detenida por el usuario.";
          setContactsSyncStatus(summary, "is-warn");
          finishContactsProgress("Contactos detenido");
          stopProgress("Contactos detenido");
          return;
        }
        if (payload.type === "error") {
          throw new Error(payload.error || "No se pudo sincronizar.");
        }
      }
    }
    // Si el stream termina sin "complete", igual cerramos UI.
    finishContactsProgress("Contactos 100%");
    stopProgress("Contactos 100%");
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("aborted") || message.includes("AbortError")) {
      setContactsSyncStatus("Detenido.");
      finishContactsProgress("Contactos detenido");
      stopProgress("Contactos detenido");
    } else {
      setContactsSyncStatus(error?.message || "No se pudo sincronizar.", "is-error");
      finishContactsProgress("Error en contactos");
      stopProgress("Error en contactos");
    }
  } finally {
    contactsBulkSyncAbort = null;
    setContactsBulkSyncRunning(false);
    updateContactsActionVisibility();
  }
}

async function saveStoreConfigFromSettings() {
  const storeId = normalizeStoreId(getActiveStoreId() || storeActiveSelect?.value || "");
  if (!storeId) {
    throw new Error("Selecciona una tienda para guardar configuraciones.");
  }
  if (cfgProductsShopifyToAlegraIncludeInventory instanceof HTMLInputElement) {
    const includeInventory = Boolean(cfgProductsShopifyToAlegraIncludeInventory.checked);
    const warehouseId =
      cfgProductsShopifyToAlegraWarehouse instanceof HTMLSelectElement
        ? String(cfgProductsShopifyToAlegraWarehouse.value || "").trim()
        : "";
    if (includeInventory && !warehouseId) {
      markFieldError(cfgProductsShopifyToAlegraWarehouse, "Selecciona una bodega destino para inventario.");
      throw new Error("Bodega destino requerida para incluir inventario (Shopify → Alegra).");
    }
    clearFieldError(cfgProductsShopifyToAlegraWarehouse);
  }
  const shopifyOrderMode = syncOrdersShopify ? syncOrdersShopify.value : "";
  const alegraOrderMode = syncOrdersAlegra ? syncOrdersAlegra.value : "";
  const contactsEnabled =
    syncContactsEnabled instanceof HTMLInputElement ? Boolean(syncContactsEnabled.checked) : true;
  const matchPriorityKey = syncContactsPriority ? syncContactsPriority.value : "document_phone_email";
  const matchPriority = matchPriorityKey.split("_").filter(Boolean);
  const generateInvoiceValue = true;
	  const payload = {
      storeId,
	    transfers: {
	      enabled: cfgTransferEnabled ? cfgTransferEnabled.checked : true,
	      destinationMode: cfgTransferDestMode ? cfgTransferDestMode.value : "fixed",
	      destinationRequired: cfgTransferDestRequired
	        ? cfgTransferDestRequired.checked !== false
	        : true,
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
	      invoiceStatus:
	        cfgInvoiceStatus instanceof HTMLSelectElement ? cfgInvoiceStatus.value || "draft" : "draft",
	      resolutionId: cfgResolution ? cfgResolution.value : "",
	      costCenterId: cfgCostCenter ? cfgCostCenter.value : "",
	      warehouseId: cfgWarehouse ? cfgWarehouse.value : "",
	      sellerId: cfgSeller ? cfgSeller.value : "",
	      paymentMethod: cfgPaymentMethod ? cfgPaymentMethod.value : "",
	      bankAccountId: cfgBankAccount ? cfgBankAccount.value : "",
	      applyPayment: cfgApplyPayment ? cfgApplyPayment.checked : false,
	      observationsTemplate: cfgObservations ? cfgObservations.value : "",
	      observationsFields: getSelectedObservationKeys(),
	      observationsExtra:
	        cfgObservationsExtra instanceof HTMLInputElement ? cfgObservationsExtra.value.trim() : "",
	      einvoiceEnabled: cfgEinvoiceEnabled ? cfgEinvoiceEnabled.checked : false,
	    },
	    rules: {
	      publishOnStock: cfgInventoryPublishStock ? cfgInventoryPublishStock.checked : true,
	      onlyActiveItems: rulesOnlyActive ? rulesOnlyActive.checked : false,
	      autoPublishOnWebhook: rulesAutoPublish ? rulesAutoPublish.checked : false,
	      autoPublishStatus:
	        rulesAutoStatus && rulesAutoStatus.value === "active" ? "active" : "draft",
        createInShopify:
          rulesAutoCreateShopify instanceof HTMLInputElement
            ? rulesAutoCreateShopify.checked !== false
            : true,
        updateInShopify:
          rulesAutoUpdateShopify instanceof HTMLInputElement
            ? rulesAutoUpdateShopify.checked !== false
            : true,
      includeImages: rulesAutoImages ? rulesAutoImages.checked !== false : true,
      trackInventory: getTrackInventoryValue(),
      syncEnabled: getTrackInventoryValue()
        ? true
        : rulesSyncEnabled
          ? rulesSyncEnabled.checked
          : true,
      webhookItemsEnabled: rulesAutoEnabled ? rulesAutoEnabled.checked !== false : true,
      warehouseIds: getSelectedInventoryWarehouseIds(),
    },
	    sync: {
	      contacts: {
	        enabled: contactsEnabled,
	        fromShopify: syncContactsShopify ? syncContactsShopify.checked !== false : true,
	        fromAlegra: syncContactsAlegra ? syncContactsAlegra.checked !== false : true,
	        createInAlegra: syncContactsCreateAlegra ? syncContactsCreateAlegra.checked !== false : true,
	        createInShopify: syncContactsCreateShopify ? syncContactsCreateShopify.checked !== false : true,
	        matchPriority,
	      },
	      orders: {
	        shopifyEnabled:
	          syncOrdersShopifyEnabled instanceof HTMLInputElement
	            ? Boolean(syncOrdersShopifyEnabled.checked)
	            : false,
	        alegraEnabled:
	          syncOrdersAlegraEnabled instanceof HTMLInputElement
	            ? Boolean(syncOrdersAlegraEnabled.checked)
	            : false,
	        shopifyToAlegra: shopifyOrderMode || "db_only",
	        alegraToShopify: alegraOrderMode || "off",
	      },
        products: {
          shopifyEnabled:
            cfgProductsShopifyToAlegraEnabled instanceof HTMLInputElement
              ? Boolean(cfgProductsShopifyToAlegraEnabled.checked)
              : false,
          createInAlegra:
            cfgProductsShopifyToAlegraCreate instanceof HTMLInputElement
              ? Boolean(cfgProductsShopifyToAlegraCreate.checked)
              : false,
          updateInAlegra:
            cfgProductsShopifyToAlegraUpdate instanceof HTMLInputElement
              ? Boolean(cfgProductsShopifyToAlegraUpdate.checked)
              : true,
          includeInventory:
            cfgProductsShopifyToAlegraIncludeInventory instanceof HTMLInputElement
              ? Boolean(cfgProductsShopifyToAlegraIncludeInventory.checked)
              : false,
          matchPriority:
            cfgProductsShopifyToAlegraMatch instanceof HTMLSelectElement
              ? cfgProductsShopifyToAlegraMatch.value || "sku_barcode"
              : "sku_barcode",
          warehouseId:
            cfgProductsShopifyToAlegraWarehouse instanceof HTMLSelectElement
              ? cfgProductsShopifyToAlegraWarehouse.value || ""
              : "",
        },
	    },
	  };
	  await fetchJson(`/api/store-configs/${encodeURIComponent(storeId)}`, {
	    method: "PUT",
	    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function saveSettings(options = {}) {
  const includeRules = options.includeRules === true;
  const includeInvoice = options.includeInvoice === true;
  const includeAi = options.includeAi === true;
  const includeAdsApps = options.includeAdsApps === true;
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
      inventoryAdjustmentsAutoPublish: true,
      trackInventory: inventoryRules.trackInventory !== false,
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
  if (includeAdsApps) {
    const appHostValue = adsAppHost ? adsAppHost.value.trim() : "";
    const googleClientIdValue = googleAdsClientId ? googleAdsClientId.value.trim() : "";
    const googleClientSecretValue = googleAdsClientSecret ? googleAdsClientSecret.value.trim() : "";
    const googleDeveloperTokenValue = googleAdsDeveloperToken ? googleAdsDeveloperToken.value.trim() : "";
    const metaAppIdValue = metaAdsAppId ? metaAdsAppId.value.trim() : "";
    const metaAppSecretValue = metaAdsAppSecret ? metaAdsAppSecret.value.trim() : "";
    const tiktokAppIdValue = tiktokAdsAppId ? tiktokAdsAppId.value.trim() : "";
    const tiktokAppSecretValue = tiktokAdsAppSecret ? tiktokAdsAppSecret.value.trim() : "";

    payload.adsApps = {};
    if (appHostValue) {
      payload.adsApps.appHost = appHostValue;
    }
    if (googleClientIdValue || googleClientSecretValue || googleDeveloperTokenValue) {
      if (!googleClientIdValue || !googleClientSecretValue || !googleDeveloperTokenValue) {
        throw new Error("Google Ads: completa Client ID, Client Secret y Developer Token.");
      }
      payload.adsApps.googleAds = {
        clientId: googleClientIdValue,
        clientSecret: googleClientSecretValue,
        developerToken: googleDeveloperTokenValue,
      };
    }
    if (metaAppIdValue || metaAppSecretValue) {
      if (!metaAppIdValue || !metaAppSecretValue) {
        throw new Error("Meta Ads: completa App ID y App Secret.");
      }
      payload.adsApps.metaAds = {
        appId: metaAppIdValue,
        appSecret: metaAppSecretValue,
      };
    }
    if (tiktokAppIdValue || tiktokAppSecretValue) {
      if (!tiktokAppIdValue || !tiktokAppSecretValue) {
        throw new Error("TikTok Ads: completa App ID y App Secret.");
      }
      payload.adsApps.tiktokAds = {
        appId: tiktokAppIdValue,
        appSecret: tiktokAppSecretValue,
      };
    }
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
  if (includeAdsApps) {
    if (googleAdsClientSecret) googleAdsClientSecret.value = "";
    if (googleAdsDeveloperToken) googleAdsDeveloperToken.value = "";
    if (metaAdsAppSecret) metaAdsAppSecret.value = "";
    if (tiktokAdsAppSecret) tiktokAdsAppSecret.value = "";
  }
  await loadSettings({ preserveUi: true });
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
  if (wooDomain) wooDomain.value = "";
  if (wooConsumerKey) wooConsumerKey.value = "";
  if (wooConsumerSecret) wooConsumerSecret.value = "";
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
  const store = getSelectedStore();
  if (!store) {
    throw new Error("Selecciona una tienda.");
  }
  const commerceAlegraId =
    commerceAlegraSelect instanceof HTMLSelectElement ? commerceAlegraSelect.value : "";
  if (commerceAlegraSelect instanceof HTMLSelectElement && commerceAlegraSelect.options.length > 1 && !commerceAlegraId) {
    throw new Error("Selecciona la cuenta contable.");
  }
  const response = await fetchJson("/api/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: store.id,
      storeName: params.storeName || store.name || "",
      shopify: {
        shopDomain: params.shopDomain,
        accessToken: tokenValue,
      },
      alegra: commerceAlegraId ? { accountId: Number(commerceAlegraId) } : undefined,
    }),
  });
  if (shopifyToken) shopifyToken.value = "";
  showToast("Shopify conectado.", "is-ok");
  closeConnectionModal();
  setConnectionsSetupOpen(true);
  setSettingsPane("connections", { persist: false });
  await loadConnections();
  updateConnectionPills();
  return response;
}

async function connectWooCommerceStore() {
  const domain = normalizeShopDomain(wooDomain?.value || "");
  if (!domain) {
    throw new Error("Dominio WooCommerce requerido.");
  }
  const consumerKey = wooConsumerKey ? wooConsumerKey.value.trim() : "";
  const consumerSecret = wooConsumerSecret ? wooConsumerSecret.value.trim() : "";
  if (!consumerKey || !consumerSecret) {
    throw new Error("Consumer Key y Secret requeridos.");
  }
  const store = getSelectedStore();
  if (!store) {
    throw new Error("Selecciona una tienda.");
  }
  const commerceAlegraId =
    commerceAlegraSelect instanceof HTMLSelectElement ? commerceAlegraSelect.value : "";
  if (commerceAlegraSelect instanceof HTMLSelectElement && commerceAlegraSelect.options.length > 1 && !commerceAlegraId) {
    throw new Error("Selecciona la cuenta contable.");
  }
  const testResult = await fetchJson("/api/settings/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      woocommerce: {
        shopDomain: domain,
        consumerKey,
        consumerSecret,
      },
    }),
  });
  if (!String(testResult?.woocommerce || "").startsWith("ok")) {
    throw new Error(String(testResult?.woocommerce || "No se pudo validar WooCommerce."));
  }
  const storeName = storeNameInput ? storeNameInput.value.trim() : "";
  const response = await fetchJson("/api/woocommerce/connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: store.id,
      storeName: storeName || store.name || "",
      shopDomain: domain,
      consumerKey,
      consumerSecret,
      alegraAccountId: commerceAlegraId ? Number(commerceAlegraId) : undefined,
    }),
  });
  if (wooConsumerKey) wooConsumerKey.value = "";
  if (wooConsumerSecret) wooConsumerSecret.value = "";
  showToast("WooCommerce conectado.", "is-ok");
  closeConnectionModal();
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
  const selectedStore = getSelectedStore();
  const resolvedStoreName =
    selectedStore?.name ||
    (sameStore ? activeStoreName : "") ||
    "";
  const storeId = selectedStore?.id;
  const commerceAlegraId =
    commerceAlegraSelect instanceof HTMLSelectElement ? commerceAlegraSelect.value : "";
  if (commerceAlegraSelect instanceof HTMLSelectElement && commerceAlegraSelect.options.length > 1 && !commerceAlegraId) {
    throw new Error("Selecciona la cuenta contable.");
  }
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
  if (storeId) {
    params.set("storeId", String(storeId));
  }
  if (commerceAlegraId) {
    params.set("alegraAccountId", String(commerceAlegraId));
  }
  const copyFrom = normalizeStoreId(copyConfigSelect?.value || "");
  if (copyFrom && storeId && copyFrom !== String(storeId)) {
    savePendingConfigCopy(copyFrom, String(storeId));
  }
  window.location.href = `/api/auth/shopify?${params.toString()}`;
}

async function startGoogleAdsOAuthFlow() {
  const customerId = googleAdsCustomerId ? googleAdsCustomerId.value.trim() : "";
  if (!customerId) {
    throw new Error("Customer ID de Google Ads requerido.");
  }
  const shopDomain = normalizeShopDomain(activeStoreDomain || storeActiveSelect?.value || shopifyDomain?.value || "");
  if (!shopDomain) {
    throw new Error("Selecciona una tienda antes de conectar Google Ads.");
  }
  const params = new URLSearchParams({ customerId, shopDomain });
  window.location.href = `/api/auth/google-ads/start?${params.toString()}`;
}

async function startMetaAdsOAuthFlow() {
  const adAccountId = metaAdsAccountId ? metaAdsAccountId.value.trim() : "";
  if (!adAccountId) {
    throw new Error("Ad Account ID de Meta Ads requerido.");
  }
  const shopDomain = normalizeShopDomain(activeStoreDomain || storeActiveSelect?.value || shopifyDomain?.value || "");
  if (!shopDomain) {
    throw new Error("Selecciona una tienda antes de conectar Meta Ads.");
  }
  const params = new URLSearchParams({ adAccountId, shopDomain });
  window.location.href = `/api/auth/meta-ads/start?${params.toString()}`;
}

async function startTikTokAdsOAuthFlow() {
  const advertiserId = tiktokAdsAdvertiserId ? tiktokAdsAdvertiserId.value.trim() : "";
  if (!advertiserId) {
    throw new Error("Advertiser ID de TikTok Ads requerido.");
  }
  const shopDomain = normalizeShopDomain(activeStoreDomain || storeActiveSelect?.value || shopifyDomain?.value || "");
  if (!shopDomain) {
    throw new Error("Selecciona una tienda antes de conectar TikTok Ads.");
  }
  const params = new URLSearchParams({ advertiserId, shopDomain });
  window.location.href = `/api/auth/tiktok-ads/start?${params.toString()}`;
}

async function connectStore(kind) {
  if (!validateInitialConnection(kind)) {
    throw new Error("Completa los campos obligatorios.");
  }
  const selectedStore = getSelectedStore();
  if (!selectedStore) {
    throw new Error("Selecciona una tienda.");
  }
  const storeName = selectedStore.name || "";
  const shopDomainValue = shopifyDomain?.value.trim() || activeStoreDomain || "";
  const normalizedActive = normalizeShopDomain(activeStoreDomain || "");
  const normalizedInput = normalizeShopDomain(shopDomainValue || "");
  const sameStore = normalizedActive && normalizedActive === normalizedInput;
  const resolvedStoreName = storeName || (sameStore ? activeStoreName : "") || "";
  const hasShopifyContext = Boolean(normalizedInput || normalizedActive);
  const payload = {
    storeId: selectedStore.id,
    storeName: resolvedStoreName,
    shopify: {
      shopDomain: normalizedInput || shopDomainValue,
    },
  };
  if (kind === "alegra") {
    const alegraEmailValue = alegraEmail ? alegraEmail.value.trim() : "";
    const alegraKeyValue = alegraKey ? alegraKey.value.trim() : "";
    if (!hasShopifyContext && !alegraEmailValue && !alegraKeyValue) {
      throw new Error("Credenciales Alegra requeridas");
    }
    payload.alegra = {};
    if (alegraAccountSelect && alegraAccountSelect.value !== "new") {
      payload.alegra.accountId = Number(alegraAccountSelect.value);
      const apiKey = alegraKey ? alegraKey.value.trim() : "";
      if (apiKey) {
        payload.alegra.apiKey = apiKey;
      }
    } else {
      const email = alegraEmailValue;
      const apiKey = alegraKeyValue;
      if (!email || !apiKey) {
        throw new Error("Credenciales Alegra requeridas");
      }
      payload.alegra.email = email;
      payload.alegra.apiKey = apiKey;
      payload.alegra.environment = alegraEnvSelect ? alegraEnvSelect.value : "prod";
    }
    const shouldTestAlegra =
      (alegraAccountSelect && alegraAccountSelect.value === "new" && alegraEmailValue && alegraKeyValue) ||
      (alegraAccountSelect && alegraAccountSelect.value !== "new" && Boolean(alegraKeyValue));
    if (shouldTestAlegra) {
      const testPayload = {
        alegra: {
          email: alegraEmailValue,
          apiKey: alegraKeyValue,
          environment: alegraEnvSelect ? alegraEnvSelect.value : "prod",
        },
      };
      const testResult = await fetchJson("/api/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });
      if (!String(testResult?.alegra || "").startsWith("ok")) {
        throw new Error(String(testResult?.alegra || "No se pudo validar Alegra."));
      }
    }
  }
  if (!shopDomainValue) {
    delete payload.shopify;
  }
  if (!shopDomainValue && kind !== "alegra") {
    throw new Error("Dominio Shopify requerido");
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
    await loadSettings({ preserveUi: true });
  } catch (error) {
    showToast(error?.message || "Conexion guardada, pero no se pudieron cargar las configuraciones.", "is-warn");
  }
  updateConnectionPills();
  closeConnectionModal();
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
if (metricsReportDownload) {
  metricsReportDownload.addEventListener("click", () => {
    try {
      downloadMetricsReport();
    } catch (error) {
      showToast(error?.message || "No se pudo descargar el reporte.", "is-error");
    }
  });
}
if (sidebarLogout) {
  sidebarLogout.addEventListener("click", () => {
    fetchJson("/api/auth/logout", { method: "POST" })
      .catch(() => null)
      .finally(() => {
        window.location.href = "/login.html";
      });
  });
}
if (saTab instanceof HTMLSelectElement) {
  saTab.addEventListener("change", () => {
    setSaPane(saTab.value);
    loadSuperAdmin().catch(() => null);
  });
}
if (saLoad) {
  saLoad.addEventListener("click", () => {
    loadSuperAdmin().catch(() => null);
  });
}
if (saTenant instanceof HTMLSelectElement) {
  saTenant.addEventListener("change", () => {
    loadSuperAdmin().catch(() => null);
  });
}
if (saPeriod instanceof HTMLInputElement) {
  saPeriod.addEventListener("change", () => {
    loadSuperAdmin().catch(() => null);
  });
}
if (saReset) {
  saReset.addEventListener("click", async () => {
    try {
      const tenantId = getSaTenantId();
      const periodKey = getSaPeriodKey();
      if (!tenantId || !periodKey) {
        showToast("Selecciona tenant y mes.", "is-warn");
        return;
      }
      setButtonLoading(saReset, true, "Reseteando...");
      await fetchJson("/api/sa/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, periodKey }),
      });
      showToast("Contadores reseteados.", "is-ok");
      loadSaUsage().catch(() => null);
      loadBillingTopbar().catch(() => null);
    } catch (error) {
      showToast(error?.message || "No se pudo resetear.", "is-error");
    } finally {
      setButtonLoading(saReset, false);
    }
  });
}
if (saAssignPlan) {
  saAssignPlan.addEventListener("click", async () => {
    try {
      const tenantId = getSaTenantId();
      const planKey = saPlanKey instanceof HTMLSelectElement ? String(saPlanKey.value || "") : "";
      if (!tenantId || !planKey) {
        showToast("Selecciona tenant y plan.", "is-warn");
        return;
      }
      setButtonLoading(saAssignPlan, true, "Asignando...");
      const payload = await fetchJson("/api/sa/plans/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, planKey }),
      });
      if (payload && payload.snapshot) {
        renderSaSnapshot(payload.snapshot, "");
      }
      showToast("Plan asignado.", "is-ok");
      loadBillingTopbar().catch(() => null);
      loadSaSnapshot().catch(() => null);
    } catch (error) {
      showToast(error?.message || "No se pudo asignar plan.", "is-error");
    } finally {
      setButtonLoading(saAssignPlan, false);
    }
  });
}
if (saModulesBody instanceof HTMLElement) {
  saModulesBody.addEventListener("change", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const input = target.closest("[data-sa-module]");
    if (!(input instanceof HTMLInputElement)) return;
    try {
      const moduleKey = input.getAttribute("data-sa-module") || "";
      const tenantId = getSaTenantId();
      if (!tenantId || !moduleKey) return;
      await fetchJson("/api/sa/modules/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, moduleKey, enabled: Boolean(input.checked) }),
      });
      showToast("Módulo actualizado.", "is-ok");
    } catch (error) {
      showToast(error?.message || "No se pudo actualizar módulo.", "is-error");
    }
  });
}

if (saServiceSave) {
  saServiceSave.addEventListener("click", async () => {
    try {
      const key = saServiceKey instanceof HTMLInputElement ? String(saServiceKey.value || "").trim() : "";
      const name = saServiceName instanceof HTMLInputElement ? String(saServiceName.value || "").trim() : "";
      const periodType = saServicePeriod instanceof HTMLSelectElement ? String(saServicePeriod.value || "monthly") : "monthly";
      const active = saServiceActive instanceof HTMLInputElement ? Boolean(saServiceActive.checked) : true;
      if (!key || !name) {
        showToast("Key y nombre requeridos.", "is-warn");
        return;
      }
      setButtonLoading(saServiceSave, true, "Guardando...");
      await fetchJson("/api/sa/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, name, periodType, active }),
      });
      showToast("Servicio guardado.", "is-ok");
      if (saServiceKey instanceof HTMLInputElement) saServiceKey.value = "";
      if (saServiceName instanceof HTMLInputElement) saServiceName.value = "";
      await Promise.allSettled([loadSaServices(), loadSaPlans()]);
    } catch (error) {
      showToast(error?.message || "No se pudo guardar servicio.", "is-error");
    } finally {
      setButtonLoading(saServiceSave, false);
    }
  });
}

if (saPlanLimitsLoad) {
  saPlanLimitsLoad.addEventListener("click", () => {
    loadSaPlanLimits().catch(() => null);
  });
}

if (saPlanLimitsBody instanceof HTMLElement) {
  saPlanLimitsBody.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const button = target.closest("[data-sa-limit-save]");
    if (!(button instanceof HTMLButtonElement)) return;
    try {
      const planKey = saPlanLimitsKey instanceof HTMLSelectElement ? String(saPlanLimitsKey.value || "") : "";
      const serviceKey = button.getAttribute("data-sa-limit-save") || "";
      if (!planKey || !serviceKey) return;
      const unlimitedInput = saPlanLimitsBody.querySelector(
        `input[data-sa-limit-unlimited][data-sa-service="${CSS.escape(serviceKey)}"]`
      );
      const maxInput = saPlanLimitsBody.querySelector(
        `input[data-sa-limit-max][data-sa-service="${CSS.escape(serviceKey)}"]`
      );
      const priceInput = saPlanLimitsBody.querySelector(
        `input[data-sa-limit-price][data-sa-service="${CSS.escape(serviceKey)}"]`
      );
      const isUnlimited = unlimitedInput instanceof HTMLInputElement ? Boolean(unlimitedInput.checked) : false;
      const rawMax = maxInput instanceof HTMLInputElement ? String(maxInput.value || "").trim() : "";
      const maxValue = rawMax ? Number(rawMax) : null;
      const rawPrice = priceInput instanceof HTMLInputElement ? String(priceInput.value || "").trim() : "0";
      const unitPrice = rawPrice ? Number(rawPrice) : 0;
      setButtonLoading(button, true, "Guardando...");
      await fetchJson("/api/sa/plan/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planKey,
          serviceKey,
          isUnlimited,
          maxValue: Number.isFinite(maxValue) ? maxValue : null,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        }),
      });
      showToast("Límite actualizado.", "is-ok");
    } catch (error) {
      showToast(error?.message || "No se pudo guardar límite.", "is-error");
    } finally {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const button = target ? target.closest("[data-sa-limit-save]") : null;
      if (button instanceof HTMLButtonElement) setButtonLoading(button, false);
    }
  });
}
if (saUserCreate) {
  saUserCreate.addEventListener("click", () => {
    saveSaUserFromForm().catch(() => null);
  });
}
if (saUserCancel) {
  saUserCancel.addEventListener("click", () => {
    resetSaUserForm();
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
if (commerceAlegraSelect) {
  commerceAlegraSelect.addEventListener("change", () => updateConnectionButtonsState());
}
		  if (storeActiveSelect) {
		    storeActiveSelect.addEventListener("change", () => {
	      const nextId = storeActiveSelect.value || "";
	      setActiveStoreId(nextId);
	      const activeStore = getStoreByIdFromCatalog(nextId);
	      activeStoreName = activeStore?.name || activeStore?.storeName || "";
	      activeStoreDomain = getStoreShopDomainFromCatalog(activeStore);
	    if (storeNameInput) {
	      storeNameInput.placeholder = getActiveStoreLabel() || "Tienda de ejemplo";
	    }
	    shopifyAdminBase = activeStoreDomain ? `https://${activeStoreDomain}/admin` : "";
		      updateStoreModuleTitles();
		      renderStoreActiveList(storesCatalog);
		      renderConnections({ stores: storesCache, wooStores: wooStoresCache });
		      renderStoreContextSelects(storesCache);
		      setShopifyWebhooksStatus("Sin configurar");
		      const activePane =
		        document.querySelector("[data-settings-pane].is-active")?.getAttribute("data-settings-pane") || "";
		      const keepConnectionsOpen = activePane === "connections" || getModulePanel("connections")?.getAttribute("data-setup-open") === "1";
		      collapseAllGroupsAndModules();
		      openDefaultGroups();
		      const storeGroup = getGroupPanel("store");
		      if (storeGroup) setGroupCollapsed(storeGroup, false);
		      if (keepConnectionsOpen) {
		        const panel = getModulePanel("connections");
		        if (panel) setModuleCollapsed(panel, false);
		        const summary = getModulePanel("connections-summary");
	        if (summary) setModuleCollapsed(summary, false);
	        setConnectionsSetupOpen(true);
	      }
		      loadLegacyStoreConfig().catch(() => null);
		      // Refrescar catálogos dependientes de la tienda (bodegas, listas, etc.)
		      loadSettingsWarehouses().catch(() => null);
		      loadResolutions().catch(() => null);
		      loadCatalog(cfgCostCenter, "cost-centers").catch(() => null);
		      loadCatalog(cfgWarehouse, "warehouses").catch(() => null);
		      loadCatalog(cfgSeller, "sellers").catch(() => null);
		      loadCatalog(cfgPaymentMethod, "payment-methods").catch(() => null);
		      loadCatalog(cfgBankAccount, "bank-accounts").catch(() => null);
		      loadCatalog(cfgPriceGeneral, "price-lists").catch(() => null);
		      loadCatalog(cfgPriceDiscount, "price-lists").catch(() => null);
		      loadCatalog(cfgPriceWholesale, "price-lists").catch(() => null);
		      loadCatalog(cfgTransferDest, "warehouses").catch(() => null);
		      loadCatalog(cfgTransferPriority, "warehouses").catch(() => null);
		      openWizardStep();
		      updateConnectionPills();
		      loadProducts().catch(() => null);
	      loadOperations().catch(() => null);
	      loadContacts().catch(() => null);
	      scheduleMarketingLoad();
		    });
		  }

		  if (storeActiveList && storeActiveSelect) {
		    storeActiveList.addEventListener("click", (event) => {
		      const target = event.target;
		      if (!(target instanceof HTMLElement)) return;
		      const button = target.closest("[data-store-id]");
		      if (!(button instanceof HTMLElement)) return;
		      const nextId = button.getAttribute("data-store-id") || "";
		      if (!nextId || storeActiveSelect.value === nextId) return;
		      storeActiveSelect.value = nextId;
		      storeActiveSelect.dispatchEvent(new Event("change"));
		    });
		  }

  const bindStoreContextSelect = (select) => {
  if (!select || !storeActiveSelect) return;
  select.addEventListener("change", () => {
      const nextDomain = select.value || "";
      if (!nextDomain) return;
      const candidate =
        storesCatalog.find((store) => normalizeShopDomain(getStoreShopDomainFromCatalog(store)) === normalizeShopDomain(nextDomain)) ||
        null;
      const nextId = candidate ? String(candidate.id || "") : "";
      if (!nextId || storeActiveSelect.value === nextId) return;
      storeActiveSelect.value = nextId;
      storeActiveSelect.dispatchEvent(new Event("change"));
    });
  };
  bindStoreContextSelect(ordersStoreSelect);
  bindStoreContextSelect(productsStoreSelect);
  bindStoreContextSelect(contactsStoreSelect);
  bindStoreContextSelect(marketingStoreSelect);

  if (marketingStoreSelect) {
    marketingStoreSelect.addEventListener("change", scheduleMarketingLoad);
  }
  if (marketingFrom) {
    marketingFrom.addEventListener("change", scheduleMarketingLoad);
  }
  if (marketingTo) {
    marketingTo.addEventListener("change", scheduleMarketingLoad);
  }

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
if (connectWooCommerce) {
  connectWooCommerce.addEventListener("click", async () => {
    try {
      setButtonLoading(connectWooCommerce, true, "Conectando...");
      await connectWooCommerceStore();
    } catch (error) {
      showToast(error?.message || "No se pudo conectar WooCommerce.", "is-error");
    } finally {
      setButtonLoading(connectWooCommerce, false);
    }
  });
}
if (connectGoogleAds) {
  connectGoogleAds.addEventListener("click", async () => {
    try {
      setButtonLoading(connectGoogleAds, true, "Conectando...");
      await startGoogleAdsOAuthFlow();
    } catch (error) {
      showToast(error?.message || "No se pudo conectar Google Ads.", "is-error");
    } finally {
      setButtonLoading(connectGoogleAds, false);
    }
  });
}
if (connectMetaAds) {
  connectMetaAds.addEventListener("click", async () => {
    try {
      setButtonLoading(connectMetaAds, true, "Conectando...");
      await startMetaAdsOAuthFlow();
    } catch (error) {
      showToast(error?.message || "No se pudo conectar Meta Ads.", "is-error");
    } finally {
      setButtonLoading(connectMetaAds, false);
    }
  });
}
if (connectTikTokAds) {
  connectTikTokAds.addEventListener("click", async () => {
    try {
      setButtonLoading(connectTikTokAds, true, "Conectando...");
      await startTikTokAdsOAuthFlow();
    } catch (error) {
      showToast(error?.message || "No se pudo conectar TikTok Ads.", "is-error");
    } finally {
      setButtonLoading(connectTikTokAds, false);
    }
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
		if (cfgTransferDest) {
		  cfgTransferDest.addEventListener("change", () => {
		    cfgTransferDest.dataset.selected = cfgTransferDest.value || "";
		    updateInvoiceWarehouseFromTransfer();
		    clearTransferErrors();
		    if (cfgTransferEnabled?.checked && String(cfgTransferDest.value || "").trim()) {
		      if (cfgTransferStrategy) focusFieldWithContext(cfgTransferStrategy);
		    }
		  });
		}
		if (cfgTransferPriority) {
		  cfgTransferPriority.addEventListener("change", () => {
		    updateTransferDestinationState();
		    updateInvoiceWarehouseFromTransfer();
		    clearTransferErrors();
		    if (cfgTransferEnabled?.checked && String(cfgTransferPriority.value || "").trim()) {
		      if (cfgTransferStrategy) focusFieldWithContext(cfgTransferStrategy);
		    }
		  });
		}
		if (cfgTransferStrategy) {
		  cfgTransferStrategy.addEventListener("change", () => {
		    updateTransferOriginState();
		    clearTransferErrors();
		    const strategy = cfgTransferStrategy.value || "manual";
		    const fallback = cfgTransferFallback ? cfgTransferFallback.value || "" : "";
		    const requiresOrigins = strategy === "manual" || fallback === "manual";
		    if (cfgTransferEnabled?.checked && requiresOrigins) {
		      openTransferOriginPicker();
		    }
		  });
		}
		if (cfgTransferDestMode) {
		  cfgTransferDestMode.addEventListener("change", () => {
		    updateTransferDestinationState();
		    clearTransferErrors();
		    if (!cfgTransferEnabled?.checked) return;
		    const mode = cfgTransferDestMode.value || "fixed";
		    if (mode === "fixed") {
		      if (cfgTransferDest) focusFieldWithContext(cfgTransferDest);
		      return;
		    }
		    if (mode === "auto") {
		      if (cfgTransferPriority) focusFieldWithContext(cfgTransferPriority);
		      return;
		    }
		  });
		}
	if (cfgTransferDestRequired) {
	  cfgTransferDestRequired.addEventListener("change", () => {
	    clearTransferErrors();
	  });
	}
		if (cfgTransferFallback) {
		  cfgTransferFallback.addEventListener("change", () => {
		    updateTransferOriginState();
		    clearTransferErrors();
		    const strategy = cfgTransferStrategy ? cfgTransferStrategy.value || "manual" : "manual";
		    const fallback = cfgTransferFallback ? cfgTransferFallback.value || "" : "";
		    const requiresOrigins = strategy === "manual" || fallback === "manual";
		    if (cfgTransferEnabled?.checked && requiresOrigins) {
		      openTransferOriginPicker();
		    }
		  });
	}
		if (cfgTransferEnabled) {
		  cfgTransferEnabled.addEventListener("change", () => {
		    updateTransferDestinationState();
		    updateTransferOriginState();
		    if (!cfgTransferEnabled.checked) {
		      clearTransferErrors();
		    } else {
		      if (cfgTransferDestMode) {
		        focusFieldWithContext(cfgTransferDestMode);
		      } else if (cfgTransferDest) {
		        focusFieldWithContext(cfgTransferDest);
		      }
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
	    updateTransferDestinationState();
	    updateInvoiceWarehouseFromTransfer();
	    if (!cfgGenerateInvoice.checked) {
	      clearInvoiceErrors();
	    }
	  });
	}
if (cfgEinvoiceEnabled) {
  cfgEinvoiceEnabled.addEventListener("change", () => {
    clearFieldWarning(cfgEinvoiceEnabled);
    clearFieldError(cfgResolution);
    applyToggleDependencies();
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
  if (cfgObservationsFields) {
    cfgObservationsFields.addEventListener("change", () => {
      updateObservationsTemplateFromUi();
    });
  }
  if (cfgObservationsExtra) {
    cfgObservationsExtra.addEventListener("input", () => {
      updateObservationsTemplateFromUi();
    });
    cfgObservationsExtra.addEventListener("change", () => {
      updateObservationsTemplateFromUi();
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
      if (clientLogo) {
        clientLogo.src = preview;
        clientLogo.style.display = "";
        clientLogo.closest(".topbar-brand")?.classList.add("has-client-logo");
      }
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
        fetchJson("/api/auth/logout", { method: "POST" })
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
    if (operationsView === "invoices") {
      invoicesStart = 0;
    } else {
      ordersStart = 0;
    }
    loadOperationsView();
  });
}

if (opsViewOrdersBtn) {
  opsViewOrdersBtn.addEventListener("click", () => {
    setOperationsView("orders");
    ordersStart = 0;
    loadOperationsView();
  });
}

if (opsViewInvoicesBtn) {
  opsViewInvoicesBtn.addEventListener("click", () => {
    setOperationsView("invoices");
    invoicesStart = 0;
    loadOperationsView();
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

if (storeSyncAlegraAccountSelect) {
  storeSyncAlegraAccountSelect.addEventListener("change", () => {
    const nextId = storeSyncAlegraAccountSelect.value || "";
    if (!nextId) {
      if (storeSyncPriceListSelect instanceof HTMLSelectElement) {
        storeSyncPriceListSelect.innerHTML = "";
        const option = document.createElement("option");
        option.disabled = true;
        option.selected = true;
        option.textContent = "Selecciona cuenta Alegra";
        storeSyncPriceListSelect.appendChild(option);
      }
      return;
    }
    loadStoreSyncPriceLists(nextId);
  });
}

if (storeSyncSourceSelect) {
  storeSyncSourceSelect.addEventListener("change", () => {
    ensureStoreSyncDistinct();
  });
}
if (storeSyncSourceProviderSelect) {
  storeSyncSourceProviderSelect.addEventListener("change", updateStoreSyncTitle);
}

if (storeSyncIncludeInventory instanceof HTMLInputElement) {
  storeSyncIncludeInventory.addEventListener("change", applyStoreSyncInventoryGuard);
}
if (storeSyncTrackInventory instanceof HTMLInputElement) {
  storeSyncTrackInventory.addEventListener("change", applyStoreSyncInventoryGuard);
}
if (storeSyncInventorySource instanceof HTMLSelectElement) {
  storeSyncInventorySource.addEventListener("change", applyStoreSyncInventoryGuard);
}
if (storeSyncTargetProviderSelect) {
  storeSyncTargetProviderSelect.addEventListener("change", updateStoreSyncTitle);
}
if (connectionModalOpen) {
  connectionModalOpen.addEventListener("click", () => {
    connectionWizardChoice = "shopify";
    openConnectionModal();
  });
}
  if (connectionModal) {
    connectionModal.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    if (target.closest("[data-connection-modal-close]")) {
      closeConnectionModal();
      return;
    }
    if (target.closest("[data-connection-modal-back]")) {
      if (connectionWizardStep === "form") {
        setConnectionWizardStep("platform");
      } else if (connectionWizardStep === "platform") {
        setConnectionWizardStep("group");
      } else {
        setConnectionWizardStep("name");
      }
      return;
    }
    const quickGroup = target.closest("[data-connection-group-open]");
    if (quickGroup instanceof HTMLElement) {
      const group = quickGroup.getAttribute("data-connection-group-open") || "commerce";
      openConnectionModal(group);
      return;
    }
    const groupChoice = target.closest("[data-connection-group-choice]");
    if (groupChoice instanceof HTMLElement) {
      const group = groupChoice.getAttribute("data-connection-group-choice") || "commerce";
      setConnectionGroup(group);
      return;
    }
    const choice = target.closest("[data-connection-choice]");
    if (choice instanceof HTMLElement) {
      const kind = choice.getAttribute("data-connection-choice") || "shopify";
      setConnectionChoice(kind);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeConnectionModal();
  });
}
if (connectionNameNext) {
  connectionNameNext.addEventListener("click", () => {
    const store = getSelectedStore();
    if (!store) {
      if (connectionStoreSelect) markFieldError(connectionStoreSelect, "Selecciona una tienda.");
      if (connectionStoreSelect) focusFieldWithContext(connectionStoreSelect);
      showToast("Selecciona una tienda antes de continuar.", "is-warn");
      return;
    }
    setActiveStoreId(store.id);
    if (pendingConnectionGroup) {
      const group = pendingConnectionGroup;
      pendingConnectionGroup = "";
      setConnectionGroup(group);
      return;
    }
    setConnectionWizardStep("group");
  });
}

if (storeCreateOpen) {
  storeCreateOpen.addEventListener("click", () => openStoreCreateModal());
}
if (connectionStoreCreate) {
  connectionStoreCreate.addEventListener("click", () => openStoreCreateModal());
}
if (connectionStoreCreateTop) {
  connectionStoreCreateTop.addEventListener("click", () => openStoreCreateModal());
}
if (storeCreateClose) {
  storeCreateClose.addEventListener("click", () => closeStoreCreateModal());
}
if (storeCreateModal) {
  storeCreateModal.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target && target === storeCreateModal) {
      closeStoreCreateModal();
    }
  });
}
if (storeCreateSave) {
  storeCreateSave.addEventListener("click", async () => {
    try {
      const nameValue = storeCreateName ? storeCreateName.value.trim() : "";
      if (!nameValue) {
        if (storeCreateName) markFieldError(storeCreateName, "Nombre requerido.");
        if (storeCreateName) focusFieldWithContext(storeCreateName);
        showToast("Completa el nombre de la tienda.", "is-warn");
        return;
      }
      setButtonLoading(storeCreateSave, true, "Creando...");
      const result = await fetchJson("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue }),
      });
      closeStoreCreateModal();
      await loadConnections({ preserveUi: true });
      if (result?.created?.id && connectionStoreSelect instanceof HTMLSelectElement) {
        connectionStoreSelect.value = String(result.created.id);
        setActiveStoreId(result.created.id);
      }
      updateConnectionButtonsState();
      showToast("Tienda creada.", "is-ok");
    } catch (error) {
      showToast(error?.message || "No se pudo crear la tienda.", "is-error");
    } finally {
      setButtonLoading(storeCreateSave, false);
    }
  });
}
if (connectionStoreSelect instanceof HTMLSelectElement) {
  connectionStoreSelect.addEventListener("change", () => {
    setActiveStoreId(connectionStoreSelect.value);
    const selectedStore = getSelectedStore();
    if (storeNameInput) storeNameInput.value = selectedStore ? selectedStore.name : "";
    updateConnectionStoreHints();
    syncCommerceAlegraSelection();
    updateConnectionButtonsState();
  });
}
if (storesList) {
  storesList.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;
    const actionButton = target.closest("[data-store-action]");
    if (actionButton instanceof HTMLElement) {
      const action = actionButton.getAttribute("data-store-action") || "";
      const storeIdRaw = actionButton.getAttribute("data-store-id") || "";
      const storeId = Number(storeIdRaw);
      const provider = actionButton.getAttribute("data-provider") || "";
      const shopDomain = actionButton.getAttribute("data-shop-domain") || "";
      if (!Number.isFinite(storeId)) return;
      if (action === "delete") {
        if (!confirm("Eliminar la tienda y desconectar sus plataformas?")) return;
        if (!confirm("Esta acción es irreversible. ¿Confirmas eliminar la tienda?")) return;
        showToast("Eliminando tienda...", "is-warn");
        fetchJson(`/api/stores/${storeId}`, { method: "DELETE" })
          .then(() => {
            showToast("Tienda eliminada.", "is-ok");
            return Promise.all([loadConnections(), loadStoresCatalog()]);
          })
          .catch((error) => {
            showToast(error?.message || "No se pudo eliminar la tienda.", "is-error");
          });
        return;
      }
      if (action === "disconnect") {
        if (!provider) return;
        const label =
          provider === "shopify"
            ? "Shopify"
            : provider === "woocommerce"
              ? "WooCommerce"
              : "Alegra";
        if (!confirm(`Desconectar ${label} de esta tienda?`)) return;
        if (!confirm(`Confirmas desconectar ${label}?`)) return;
        let promise;
        if (provider === "shopify") {
          if (!shopDomain) {
            showToast("Dominio Shopify faltante.", "is-error");
            return;
          }
          promise = fetchJson(`/api/connections/domain/${encodeURIComponent(shopDomain)}`, {
            method: "DELETE",
          });
        } else if (provider === "woocommerce") {
          if (!shopDomain) {
            showToast("Dominio WooCommerce faltante.", "is-error");
            return;
          }
          promise = fetchJson(`/api/woocommerce/connections/${encodeURIComponent(shopDomain)}`, {
            method: "DELETE",
          });
        } else {
          promise = fetchJson(`/api/connections/alegra/${storeId}`, { method: "DELETE" });
        }
        showToast(`Desconectando ${label}...`, "is-warn");
        promise
          .then(() => {
            showToast(`${label} desconectado.`, "is-ok");
            return Promise.all([loadConnections(), loadStoresCatalog()]);
          })
          .catch((error) => {
            showToast(error?.message || `No se pudo desconectar ${label}.`, "is-error");
          });
        return;
      }
      if (action === "reconnect") {
        if (!provider) return;
        openConnectionModal();
        const store = getStoreByIdFromCatalog(storeId);
        if (store && connectionStoreSelect instanceof HTMLSelectElement) {
          connectionStoreSelect.value = String(store.id);
          setActiveStoreId(store.id);
        }
        if (provider === "shopify" || provider === "woocommerce") {
          const domain = shopDomain || "";
          if (provider === "shopify" && shopifyDomain) shopifyDomain.value = domain;
          if (provider === "woocommerce" && wooDomain) wooDomain.value = domain;
        }
        setConnectionChoice(provider === "woocommerce" ? "woocommerce" : provider);
        setConnectionWizardStep("form");
        return;
      }
      if (action === "associate-alegra") {
        openConnectionModal();
        const store = getStoreByIdFromCatalog(storeId);
        if (store && connectionStoreSelect instanceof HTMLSelectElement) {
          connectionStoreSelect.value = String(store.id);
          setActiveStoreId(store.id);
        }
        setConnectionChoice("alegra");
        setConnectionWizardStep("form");
        showToast("Selecciona la cuenta Alegra y presiona Conectar.", "is-warn");
        return;
      }
    }
    const card = target.closest("[data-store-card]");
    if (!(card instanceof HTMLElement)) return;
    const id = card.getAttribute("data-store-card") || "";
    if (!id) return;
    setActiveStoreId(id);
    renderStoresList();
    renderConnectionStoreSelect();
    updateConnectionButtonsState();
  });
}

[
  storeNameInput,
  connectionStoreSelect,
  shopifyDomain,
  shopifyToken,
  alegraEmail,
  alegraKey,
  alegraAccountSelect,
  wooDomain,
  wooConsumerKey,
  wooConsumerSecret,
  shopifyConnectPicker,
].filter(Boolean).forEach((node) => {
  node.addEventListener("input", updateConnectionButtonsState);
  node.addEventListener("change", updateConnectionButtonsState);
});

if (storeSyncSourceProviderSelect) {
  storeSyncSourceProviderSelect.addEventListener("change", () => {
    renderStoreSyncSelects();
  });
}

if (storeSyncTargetSelect) {
  storeSyncTargetSelect.addEventListener("change", () => {
    ensureStoreSyncDistinct();
  });
}

if (storeSyncTargetProviderSelect) {
  storeSyncTargetProviderSelect.addEventListener("change", () => {
    renderStoreSyncSelects();
  });
}

if (storeSyncRun) {
  storeSyncRun.addEventListener("click", () => {
    runStoreProductsSync();
  });
}

if (storeSyncClear) {
  storeSyncClear.addEventListener("click", () => {
    if (storeSyncStatusSelect instanceof HTMLSelectElement) storeSyncStatusSelect.value = "draft";
    if (storeSyncScopeSelect instanceof HTMLSelectElement) storeSyncScopeSelect.value = "products";
    if (storeSyncPriceFallbackSelect instanceof HTMLSelectElement)
      storeSyncPriceFallbackSelect.value = "shopify";
    if (storeSyncSourceProviderSelect instanceof HTMLSelectElement) storeSyncSourceProviderSelect.value = "shopify";
    if (storeSyncTargetProviderSelect instanceof HTMLSelectElement) storeSyncTargetProviderSelect.value = "shopify";
    if (storeSyncInventorySource instanceof HTMLSelectElement) storeSyncInventorySource.value = "accounting";
    if (storeSyncAlegraAccountSelect instanceof HTMLSelectElement)
      storeSyncAlegraAccountSelect.value = "";
    if (storeSyncPriceListSelect instanceof HTMLSelectElement) {
      storeSyncPriceListSelect.innerHTML = "";
      const option = document.createElement("option");
      option.disabled = true;
      option.selected = true;
      option.textContent = "Selecciona cuenta Alegra";
      storeSyncPriceListSelect.appendChild(option);
    }
    if (storeSyncOnlyActive instanceof HTMLInputElement) storeSyncOnlyActive.checked = true;
    if (storeSyncIncludeDescriptions instanceof HTMLInputElement) storeSyncIncludeDescriptions.checked = true;
    if (storeSyncIncludeImages instanceof HTMLInputElement) storeSyncIncludeImages.checked = true;
    if (storeSyncIncludeProductType instanceof HTMLInputElement) storeSyncIncludeProductType.checked = true;
    if (storeSyncIncludeTags instanceof HTMLInputElement) storeSyncIncludeTags.checked = true;
    if (storeSyncTrackInventory instanceof HTMLInputElement) storeSyncTrackInventory.checked = true;
    if (storeSyncIncludeInventory instanceof HTMLInputElement) storeSyncIncludeInventory.checked = true;
    renderStoreSyncSelects();
    ensureStoreSyncDistinct();
    if (storeSyncStatusLabel) storeSyncStatusLabel.textContent = "Sin datos";
    applyStoreSyncInventoryGuard();
  });
}

const syncTrackInventoryInputs = [productsSyncTrackInventory, rulesAutoTrackInventory].filter(
  (node) => node instanceof HTMLInputElement
);
if (syncTrackInventoryInputs.length) {
  syncTrackInventoryInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setTrackInventoryValue(input.checked);
      applyInventoryTrackingGuard();
      refreshProductSettingsFromInputs();
    });
  });
}

if (storeSyncTrackInventory instanceof HTMLInputElement) {
  storeSyncTrackInventory.addEventListener("change", () => {
    applyInventoryTrackingGuard();
  });
}

if (rulesSyncEnabled instanceof HTMLInputElement) {
  rulesSyncEnabled.addEventListener("change", () => {
    if (!rulesSyncEnabled.checked) {
      setTrackInventoryValue(false);
      showToast(
        "Desactivaste inventario: el seguimiento queda apagado en todos los sincronizadores.",
        "is-warn"
      );
    }
    applyInventoryTrackingGuard();
  });
}

if (productsSyncIncludeInventory) {
  productsSyncIncludeInventory.addEventListener("change", () => {
    updateSyncWarehouseState();
  });
}

if (productsPhotosBulkOpen) {
  productsPhotosBulkOpen.addEventListener("click", () => {
    openPhotosModal();
  });
}

if (photosPublishEnabled) {
  photosPublishEnabled.addEventListener("change", () => {
    updatePhotosPublishUi();
  });
}

if (photosRun) {
  photosRun.addEventListener("click", () => {
    runPhotosBulkUpload();
  });
}

if (photosStop) {
  photosStop.addEventListener("click", async () => {
    if (photosBulkAbort) {
      try {
        photosBulkAbort.abort();
      } catch {
        // ignore abort failures
      }
    }
    try {
      if (photosStop instanceof HTMLButtonElement) photosStop.disabled = true;
      await fetchJson("/api/sync/product-images/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncId: activePhotosSyncId || null }),
      });
      if (photosStatus) photosStatus.textContent = "Cancelando...";
    } catch (error) {
      const message = error?.message || "No se pudo detener.";
      if (photosStatus) photosStatus.textContent = message;
      showToast(message, "is-error");
    } finally {
      if (photosStop instanceof HTMLButtonElement) photosStop.disabled = false;
      setPhotosRunning(false);
    }
  });
}

if (photosClear) {
  photosClear.addEventListener("click", () => {
    if (photosFile instanceof HTMLInputElement) photosFile.value = "";
    if (photosPublishEnabled instanceof HTMLInputElement) photosPublishEnabled.checked = false;
    if (photosMode instanceof HTMLSelectElement) photosMode.value = "append";
    if (photosMatchBy instanceof HTMLSelectElement) photosMatchBy.value = "sku";
    if (photosAttachVariant instanceof HTMLInputElement) photosAttachVariant.checked = true;
    if (photosPublishStatus instanceof HTMLSelectElement) photosPublishStatus.value = "draft";
    photosParsedRows = [];
    photosErrorLog = [];
    activePhotosSyncId = "";
    if (photosErrors) photosErrors.textContent = "Sin errores.";
    if (photosStatus) photosStatus.textContent = "Sin datos";
    updatePhotosPublishUi();
    updatePhotosProgress(0, "Procesando 0%");
  });
}

if (photosDownloadErrors) {
  photosDownloadErrors.addEventListener("click", () => {
    const content =
      Array.isArray(photosErrorLog) && photosErrorLog.length
        ? photosErrorLog.join("\r\n")
        : photosErrors
          ? String(photosErrors.textContent || "").trim()
          : "";
    const finalContent = content && content !== "Sin errores." ? content : "";
    if (!finalContent) {
      showToast("No hay errores para descargar.", "is-warn");
      return;
    }
    downloadTextFile("errores_cargador_fotos.txt", `${finalContent}\r\n`);
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
      if (productsSyncStatus) {
        productsSyncStatus.textContent = "Cancelando...";
      }
    } catch (error) {
      productsSyncStopBtn.disabled = false;
      const message = error?.message || "No se pudo detener la sincronizacion.";
      if (productsSyncStatus) {
        productsSyncStatus.textContent = message;
      }
    }
  });
}

if (qaTokenGenerate) {
  qaTokenGenerate.addEventListener("click", async () => {
    qaTokenGenerate.disabled = true;
    if (qaTokenHint) {
      qaTokenHint.textContent = "Generando clave...";
    }
    try {
      const ttlMinutes =
        qaTokenTtl instanceof HTMLSelectElement ? Number(qaTokenTtl.value || 30) : 30;
      const scopes =
        qaTokenScope instanceof HTMLSelectElement
          ? [String(qaTokenScope.value || "general")]
          : ["general"];
      const result = await fetchJson("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ttlMinutes, scopes }),
      });
      const rawToken = String(result?.token || "").trim();
      const isValidToken = /^[a-f0-9]{48}$/i.test(rawToken);
      if (!isValidToken) {
        if (qaTokenValue) qaTokenValue.value = "";
        if (qaTokenHint) qaTokenHint.textContent = "Token invalido. Intenta generar de nuevo.";
        showToast("Token invalido. Intenta generar de nuevo.", "is-error");
        return;
      }
      if (qaTokenValue) {
        qaTokenValue.value = rawToken;
      }
      if (qaTokenHint) {
        const expiresAt = result?.expiresAt ? new Date(result.expiresAt) : null;
        qaTokenHint.textContent = expiresAt
          ? `Vence: ${expiresAt.toLocaleString()}`
          : "No expira.";
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

if (mkCfgStoreSelect) {
  mkCfgStoreSelect.addEventListener("change", () => {
    loadMarketingConfig();
  });
}

if (mkCfgRotateKey) {
  mkCfgRotateKey.addEventListener("click", () => {
    rotateMarketingPixelKey();
  });
}

if (mkCfgTest) {
  mkCfgTest.addEventListener("click", () => {
    testMarketingPixel();
  });
}

if (mkCfgCopyKey) {
  mkCfgCopyKey.addEventListener("click", async () => {
    if (!mkCfgPixelKey || !mkCfgPixelKey.value) {
      showToast("No hay key para copiar.", "is-warn");
      return;
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(mkCfgPixelKey.value);
      copied = true;
    } catch {
      try {
        mkCfgPixelKey.select();
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
    }
    showToast(copied ? "Key copiada." : "No se pudo copiar.", copied ? "is-ok" : "is-error");
  });
}

if (mkCfgCopyScript) {
  mkCfgCopyScript.addEventListener("click", async () => {
    if (!mkCfgScript || !mkCfgScript.value) {
      showToast("No hay script para copiar.", "is-warn");
      return;
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(mkCfgScript.value);
      copied = true;
    } catch {
      try {
        mkCfgScript.select();
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
    }
    showToast(copied ? "Script copiado." : "No se pudo copiar.", copied ? "is-ok" : "is-error");
  });
}

if (mkCfgCopyWebhook) {
  mkCfgCopyWebhook.addEventListener("click", async () => {
    if (!mkCfgWebhookUrl || !mkCfgWebhookUrl.value) {
      showToast("No hay URL para copiar.", "is-warn");
      return;
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(mkCfgWebhookUrl.value);
      copied = true;
    } catch {
      try {
        mkCfgWebhookUrl.select();
        copied = document.execCommand("copy");
      } catch {
        copied = false;
      }
    }
    showToast(copied ? "URL copiada." : "No se pudo copiar.", copied ? "is-ok" : "is-error");
  });
}

if (mkCfgCreateWebhooks) {
  mkCfgCreateWebhooks.addEventListener("click", () => {
    createMarketingWebhooks();
  });
}

if (mkCfgDeleteWebhooks) {
  mkCfgDeleteWebhooks.addEventListener("click", () => {
    deleteMarketingWebhooks();
  });
}

if (mkCfgConnect) {
  mkCfgConnect.addEventListener("click", () => {
    connectMarketingSetup();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (mkCfgPixelKey) {
    loadMarketingConfig();
  }
});
  if (syncContactsBulkRun) {
    syncContactsBulkRun.addEventListener("click", () => {
      runBulkContactSync();
    });
  }

	  const bindContactsBulkToggle = (el) => {
	    if (!(el instanceof HTMLInputElement)) return;
	    el.addEventListener("change", () => {
	      applyToggleDependencies();
	      updateContactsActionVisibility();
	    });
	  };
	  bindContactsBulkToggle(syncContactsBulkShopify);
	  bindContactsBulkToggle(syncContactsBulkAlegra);

	  if (syncContactsBulkStop) {
	    syncContactsBulkStop.addEventListener("click", () => {
	      if (contactsBulkSyncAbort) {
	        try {
          contactsBulkSyncAbort.abort();
        } catch {
          // ignore abort failures
        }
      }
      setContactsBulkSyncRunning(false);
      updateContactsActionVisibility();
    });
  }

  if (syncContactsBulkClear) {
    syncContactsBulkClear.addEventListener("click", () => {
      if (syncContactsBulkDateStart instanceof HTMLInputElement) syncContactsBulkDateStart.value = "";
      if (syncContactsBulkDateEnd instanceof HTMLInputElement) syncContactsBulkDateEnd.value = "";
      if (syncContactLimit instanceof HTMLInputElement) syncContactLimit.value = "";
      setContactsSyncStatus("Sin datos");
      updateContactsActionVisibility();
    });
  }

  if (syncContactsShopify) {
    syncContactsShopify.addEventListener("change", () => {
      updateContactsActionVisibility();
    });
  }

  if (syncContactsAlegra) {
    syncContactsAlegra.addEventListener("change", () => {
      updateContactsActionVisibility();
    });
  }

  if (ordersSyncBtn) {
    ordersSyncBtn.addEventListener("click", runOrdersSync);
  }

	if (ordersSyncClear) {
	  ordersSyncClear.addEventListener("click", () => {
	    if (ordersSyncDateStart) ordersSyncDateStart.value = "";
	    if (ordersSyncDateEnd) ordersSyncDateEnd.value = "";
	    if (ordersSyncLimitInput) ordersSyncLimitInput.value = "";
	    if (ordersSyncNumber) ordersSyncNumber.value = "";
	    if (ordersSyncStatus) ordersSyncStatus.textContent = "Sin datos";
	    refreshProductSettingsFromInputs();
	  });
	}

		if (ordersSyncStopBtn) {
		  ordersSyncStopBtn.addEventListener("click", () => {
	    if (ordersBulkSyncAbort) {
	      try {
	        ordersBulkSyncAbort.abort();
	      } catch {
	        // ignore abort failures
	      }
	    }
	    setOrdersBulkSyncRunning(false);
		  });
		}

			if (invoicesBackfillRun) {
			  invoicesBackfillRun.addEventListener("click", () => {
			    runInvoicesBackfill();
			  });
			}

      if (invoicesBackfillCreateShopify instanceof HTMLInputElement) {
        invoicesBackfillCreateShopify.addEventListener("change", () => {
          updateInvoicesBackfillUi();
        });
      }
	
			if (invoicesBackfillClear) {
			  invoicesBackfillClear.addEventListener("click", () => {
			    if (invoicesBackfillDateStart instanceof HTMLInputElement) invoicesBackfillDateStart.value = "";
			    if (invoicesBackfillDateEnd instanceof HTMLInputElement) invoicesBackfillDateEnd.value = "";
			    if (invoicesBackfillLimit instanceof HTMLInputElement) invoicesBackfillLimit.value = "";
          if (invoicesBackfillCreateShopify instanceof HTMLInputElement) invoicesBackfillCreateShopify.checked = false;
			    if (invoicesBackfillMode instanceof HTMLSelectElement) invoicesBackfillMode.value = "draft";
          updateInvoicesBackfillUi();
			    setInvoicesBackfillStatus("Sin datos", "");
			  });
			}

			if (invoicesBackfillStop) {
			  invoicesBackfillStop.addEventListener("click", () => {
			    if (invoicesBackfillAbort) {
			      try {
			        invoicesBackfillAbort.abort();
		      } catch {
		        // ignore abort failures
		      }
		    }
			    setInvoicesBackfillRunning(false);
			  });
			}

      if (productsShopifyBulkRun) {
        productsShopifyBulkRun.addEventListener("click", () => {
          runProductsShopifyBulkSync();
        });
      }

      if (productsShopifyBulkStop) {
        productsShopifyBulkStop.addEventListener("click", async () => {
          const syncId = String(activeProductsShopifyBulkSyncId || "").trim();
          if (syncId) {
            try {
              await fetchJson("/api/sync/products/shopify-to-alegra/stop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ syncId }),
              });
            } catch {
              // ignore
            }
          }
          if (productsShopifyBulkAbort) {
            try {
              productsShopifyBulkAbort.abort();
            } catch {
              // ignore
            }
          }
          setProductsShopifyBulkRunning(false);
        });
      }

      if (productsShopifyBulkClear) {
        productsShopifyBulkClear.addEventListener("click", () => {
          if (productsShopifyBulkDateStart instanceof HTMLInputElement) productsShopifyBulkDateStart.value = "";
          if (productsShopifyBulkDateEnd instanceof HTMLInputElement) productsShopifyBulkDateEnd.value = "";
          if (productsShopifyBulkLimit instanceof HTMLInputElement) productsShopifyBulkLimit.value = "";
          if (productsShopifyBulkCreate instanceof HTMLInputElement) productsShopifyBulkCreate.checked = false;
          if (productsShopifyBulkUpdate instanceof HTMLInputElement) productsShopifyBulkUpdate.checked = true;
          if (productsShopifyBulkIncludeInventory instanceof HTMLInputElement) productsShopifyBulkIncludeInventory.checked = false;
          if (productsShopifyBulkMatch instanceof HTMLSelectElement) productsShopifyBulkMatch.value = "sku_barcode";
          if (productsShopifyBulkWarehouse instanceof HTMLSelectElement) productsShopifyBulkWarehouse.value = "";
          setProductsShopifyBulkStatus("Sin datos", "");
          if (productsShopifyBulkProgress) productsShopifyBulkProgress.classList.remove("is-active");
          if (productsShopifyBulkProgressBar) productsShopifyBulkProgressBar.style.width = "0%";
          if (productsShopifyBulkProgressLabel) productsShopifyBulkProgressLabel.textContent = "Sincronizando 0%";
          applyToggleDependencies();
        });
      }

		if (ordersListLimit) {
		  ordersListLimit.addEventListener("change", () => {
		    if (operationsView === "invoices") invoicesStart = 0;
		    else ordersStart = 0;
	    refreshProductSettingsFromInputs();
	    loadOperationsView();
	  });
	}

	if (ordersDateFilter) {
	  ordersDateFilter.addEventListener("change", () => {
	    if (operationsView === "invoices") invoicesStart = 0;
	    else ordersStart = 0;
	    refreshProductSettingsFromInputs();
	    loadOperationsView();
	  });
	}

	if (ordersDaysSelect) {
	  ordersDaysSelect.addEventListener("change", () => {
	    if (operationsView === "invoices") invoicesStart = 0;
	    else ordersStart = 0;
	    refreshProductSettingsFromInputs();
	    loadOperationsView();
	  });
	}

	if (ordersSort) {
	  ordersSort.addEventListener("change", () => {
	    if (operationsView === "invoices") invoicesStart = 0;
	    else ordersStart = 0;
	    refreshProductSettingsFromInputs();
	    loadOperationsView();
	  });
	}

	if (opsSearch) {
	  let opsSearchTimer;
	  opsSearch.addEventListener("input", () => {
	    if (opsSearchTimer) clearTimeout(opsSearchTimer);
	    opsSearchTimer = setTimeout(() => {
	      if (operationsView === "invoices") invoicesStart = 0;
	      else ordersStart = 0;
	      refreshProductSettingsFromInputs();
	      loadOperationsView();
	    }, 400);
	  });
	}

	if (ordersPrevBtn) {
	  ordersPrevBtn.addEventListener("click", () => {
	    const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
	    ordersStart = Math.max(0, ordersStart - pageSize);
	    loadOperations();
	  });
	}

	if (ordersNextBtn) {
	  ordersNextBtn.addEventListener("click", () => {
	    const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
	    const maxStart = ordersTotal ? Math.max(0, (Math.ceil(ordersTotal / pageSize) - 1) * pageSize) : ordersStart + pageSize;
	    ordersStart = Math.min(ordersStart + pageSize, maxStart);
	    loadOperations();
	  });
	}

	if (ordersPageGo) {
	  ordersPageGo.addEventListener("click", () => {
	    const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
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

	if (invoicesPrevBtn) {
	  invoicesPrevBtn.addEventListener("click", () => {
	    const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
	    invoicesStart = Math.max(0, invoicesStart - pageSize);
	    loadInvoices();
	  });
	}

	if (invoicesNextBtn) {
	  invoicesNextBtn.addEventListener("click", () => {
	    const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
	    const maxStart = invoicesTotal ? Math.max(0, (Math.ceil(invoicesTotal / pageSize) - 1) * pageSize) : invoicesStart + pageSize;
	    invoicesStart = Math.min(invoicesStart + pageSize, maxStart);
	    loadInvoices();
	  });
	}

	if (invoicesPageGo) {
	  invoicesPageGo.addEventListener("click", () => {
	    const pageSize = ordersListLimit && Number(ordersListLimit.value) > 0 ? Number(ordersListLimit.value) : 10;
	    const totalPages = invoicesTotal ? Math.max(1, Math.ceil(invoicesTotal / pageSize)) : 1;
	    const target = invoicesPageInput ? Number(invoicesPageInput.value) : 1;
	    const page = Math.min(Math.max(1, target || 1), totalPages);
	    invoicesStart = (page - 1) * pageSize;
	    loadInvoices();
	  });
	}

	if (invoicesPageInput) {
	  invoicesPageInput.addEventListener("keydown", (event) => {
	    if (event.key === "Enter" && invoicesPageGo) {
	      event.preventDefault();
	      invoicesPageGo.click();
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
	    if (operationsView === "invoices") invoicesStart = 0;
	    else ordersStart = 0;
	    loadOperationsView();
	  });
	}

	if (ordersClearBtn) {
	  ordersClearBtn.addEventListener("click", () => {
	    if (opsSearch) opsSearch.value = "";
	    if (ordersDateFilter) ordersDateFilter.value = "";
	    if (ordersDaysSelect) ordersDaysSelect.value = "30";
	    if (ordersSort) ordersSort.value = "date_desc";
	    if (ordersListLimit) ordersListLimit.value = "";
	    if (operationsView === "invoices") invoicesStart = 0;
	    else ordersStart = 0;
	    refreshProductSettingsFromInputs();
	    loadOperationsView();
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

if (productsPublishStatusMass && rulesAutoStatus) {
  productsPublishStatusMass.addEventListener("change", () => {
    rulesAutoStatus.value = productsPublishStatusMass.value;
    rulesAutoStatus.dispatchEvent(new Event("change", { bubbles: true }));
  });
  rulesAutoStatus.addEventListener("change", () => {
    if (productsPublishStatusMass.value !== rulesAutoStatus.value) {
      productsPublishStatusMass.value = rulesAutoStatus.value;
    }
  });
}

if (productsSyncPublish) {
  productsSyncPublish.addEventListener("change", () => {
    applyToggleDependencies();
  });
}

async function saveUpdateExistingRuleFromMassProducts() {
  if (!(productsSyncUpdateExisting instanceof HTMLInputElement)) return;
  const storeId = normalizeStoreId(getActiveStoreId() || storeActiveSelect?.value || "");
  if (!storeId) return;
  if (!activeStoreConfig || normalizeStoreId(activeStoreConfig.storeId || "") !== storeId) {
    // Best-effort: ensure we have the latest config loaded.
    await loadLegacyStoreConfig();
  }
  if (!activeStoreConfig || normalizeStoreId(activeStoreConfig.storeId || "") !== storeId) {
    return;
  }
  const nextValue = Boolean(productsSyncUpdateExisting.checked);
  const payload = {
    transfers: activeStoreConfig.transfers || {},
    priceLists: activeStoreConfig.priceLists || {},
    rules: { ...(activeStoreConfig.rules || {}), updateInShopify: nextValue },
    invoice: activeStoreConfig.invoice || {},
    sync: activeStoreConfig.sync || {},
  };
  await fetchJson(`/api/store-configs/${encodeURIComponent(storeId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  activeStoreConfig = { ...activeStoreConfig, rules: payload.rules };
  if (storeRuleOverrides) {
    storeRuleOverrides = { ...storeRuleOverrides, updateInShopify: nextValue };
  }
  if (rulesAutoUpdateShopify instanceof HTMLInputElement) {
    rulesAutoUpdateShopify.checked = nextValue;
  }
}

if (productsSyncUpdateExisting) {
  productsSyncUpdateExisting.addEventListener("change", () => {
    // Persist per-store (DB), not just localStorage.
    saveUpdateExistingRuleFromMassProducts().catch((error) => {
      showToast(error?.message || "No se pudo guardar “Actualizar existentes”.", "is-error");
    });
  });
}

if (rulesAutoPublish && rulesAutoStatus) {
  rulesAutoPublish.addEventListener("change", () => {
    applyToggleDependencies();
  });
}

// Productos: configuracion unica (automatico + manual) en el bloque de reglas.

  if (productsSyncClear) {
    productsSyncClear.addEventListener("click", () => {
      if (productsDateStart) productsDateStart.value = "";
      if (productsDateEnd) productsDateEnd.value = "";
      if (productsSyncLimitInput) productsSyncLimitInput.value = "";
      if (productsSyncQuery) productsSyncQuery.value = "";
      if (productsSyncOnlyActive) productsSyncOnlyActive.checked = true;
      if (productsSyncPublish) productsSyncPublish.checked = true;
      if (productsSyncUpdateExisting) productsSyncUpdateExisting.checked = true;
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
		  rulesAutoStatus,
		  rulesAutoImages,
		  productsDateStart,
		  productsDateEnd,
		  productsSyncLimitInput,
		  productsSyncQuery,
		  productsSyncOnlyActive,
	  productsSyncPublish,
	  productsSyncUpdateExisting,
	  productsSyncOnlyPublished,
	  productsSyncIncludeInventory,
	  productsDateFilter,
	  productsSort,
	  productsLimitInput,
	  productsInStockOnly,
	  productsStatusFilter,
	  ordersSyncDateStart,
	  ordersSyncDateEnd,
	  ordersSyncLimitInput,
	  ordersListLimit,
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
  if (typeof history !== "undefined" && "scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  const resetScrollPosition = () => {
    const content = document.querySelector(".content");
    if (content) content.scrollTop = 0;
    if (typeof document !== "undefined") {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  };
  const safeLoad = async (promise) => {
    try {
      return await promise;
    } catch (error) {
      console.error(error);
      return null;
    }
  };
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname || "";
  const isSettingsView =
    params.get("settings") === "1" || isSettingsPath(pathname);
  setupViewportDebug();
  if (isSettingsView) {
    const hasParam = params.get("settings") === "1";
    const hasIntent = consumeSettingsIntent();
    const origin = window.location.origin;
    const hasReferrer =
      typeof document !== "undefined" &&
      typeof document.referrer === "string" &&
      document.referrer.startsWith(origin);
    if (!hasParam && !hasIntent && !hasReferrer) {
      window.location.href = "/";
      return;
    }
    markSettingsIntent();
  }
  document.body.classList.toggle("force-settings", isSettingsView);
  if (isSettingsView) {
    pruneSettingsPanesForPath();
  }
  if (connectionModalBody) {
    const connectionsPanel = getModulePanel("connections");
    if (connectionsPanel && connectionFormSlot && !connectionFormSlot.contains(connectionsPanel)) {
      connectionFormSlot.appendChild(connectionsPanel);
    }
  }
  if (connectionNameSlot && storeNameInput) {
    const field = storeNameInput.closest(".field");
    if (field && !connectionNameSlot.contains(field)) {
      connectionNameSlot.appendChild(field);
    }
  }
  safeLoad(loadBranding());
  loadSidebarState();
  captureOnboardingParam();
  initSettingsSubmenu();
  if (document.body.classList.contains("force-settings")) {
    activateNav("settings");
    const pathPane = getSettingsPaneFromPath();
    setSettingsPane(pathPane || getStoredSettingsPane() || "connections", {
      persist: false,
      updateUrl: Boolean(pathPane),
    });
  } else {
    activateNav("dashboard");
  }
  resetScrollPosition();
  if (typeof window !== "undefined") {
    window.addEventListener("popstate", () => {
      if (!isSettingsPath(window.location.pathname)) return;
      const pathPane = getSettingsPaneFromPath();
      setSettingsPane(pathPane || "connections", { persist: false });
    });
  }
  cleanupLegacyConnectionsUi();
  initGroupControls();
  initToggleFields();
  initToggleDependencies();
  initDependencyDisabledToasts();
  setupMultiSelectDropdowns();
  updateInvoicesBackfillUi();
  updateAlegraOrdersAutoUi();
  initTips();
  initSetupModeControls();
  initShopifyConnectPicker();
  updateWizardStartAvailability();
  applyProductSettings();
  await safeLoad(loadCurrentUser());
  await safeLoad(loadTenantModules());
  await safeLoad(ensureCsrfToken());
  await safeLoad(loadCompanyProfile());
  await safeLoad(loadUsers());
  await safeLoad(loadConnections());
  // Defer heavy modules so connections appear quickly.
  safeLoad(loadLogs());
  safeLoad(loadMetrics());
  setOperationsView("orders");
  safeLoad(loadOperationsView());
  safeLoad(loadMarketing());
  await safeLoad(loadSettings());
  await safeLoad(loadResolutions());
	  await Promise.all([
	    alegraHasToken
	      ? safeLoad(loadCatalog(cfgCostCenter, "cost-centers"))
	      : Promise.resolve(null),
	    alegraHasToken
	      ? safeLoad(loadCatalog(cfgWarehouse, "warehouses"))
	      : Promise.resolve(null),
      alegraHasToken && productsShopifyBulkWarehouse instanceof HTMLSelectElement
        ? safeLoad(loadCatalog(productsShopifyBulkWarehouse, "warehouses"))
        : Promise.resolve(null),
      alegraHasToken && cfgProductsShopifyToAlegraWarehouse instanceof HTMLSelectElement
        ? safeLoad(loadCatalog(cfgProductsShopifyToAlegraWarehouse, "warehouses"))
        : Promise.resolve(null),
	    alegraHasToken
	      ? safeLoad(loadCatalog(cfgTransferDest, "warehouses"))
	      : Promise.resolve(null),
	    alegraHasToken
	      ? safeLoad(loadCatalog(cfgTransferPriority, "warehouses"))
      : Promise.resolve(null),
    alegraHasToken
      ? safeLoad(loadCatalog(cfgSeller, "sellers"))
      : Promise.resolve(null),
    alegraHasToken
      ? safeLoad(loadCatalog(cfgPaymentMethod, "payment-methods"))
      : Promise.resolve(null),
    alegraHasToken
      ? safeLoad(loadCatalog(cfgBankAccount, "bank-accounts"))
      : Promise.resolve(null),
    alegraHasToken
      ? safeLoad(loadCatalog(cfgPriceGeneral, "price-lists"))
      : Promise.resolve(null),
    alegraHasToken
      ? safeLoad(loadCatalog(cfgPriceDiscount, "price-lists"))
      : Promise.resolve(null),
    alegraHasToken
      ? safeLoad(loadCatalog(cfgPriceWholesale, "price-lists"))
      : Promise.resolve(null),
  ]);
  initModuleControls();
  initHelpPanels();
  openWizardStep();
  if (window.location && window.location.pathname === "/__sa") {
    activateNav("superadmin");
  }
  resetScrollPosition();
}

init();
