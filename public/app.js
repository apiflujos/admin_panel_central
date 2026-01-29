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

const shopifyDomain = document.getElementById("shopify-domain");
const shopifyToken = document.getElementById("shopify-token");

const alegraEmail = document.getElementById("alegra-email");
const alegraKey = document.getElementById("alegra-key");
const aiKey = document.getElementById("ai-key");
const aiSave = document.getElementById("ai-save");
const passwordCurrent = document.getElementById("password-current");
const passwordNew = document.getElementById("password-new");
const passwordConfirm = document.getElementById("password-confirm");
const passwordSave = document.getElementById("password-save");
const passwordMessage = document.getElementById("password-message");
const testShopifyButton = document.getElementById("test-shopify");
const testAlegraButton = document.getElementById("test-alegra");
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
const productsPublishFilter = document.getElementById("products-publish-filter");
const productsWarehouseFilter = document.getElementById("products-warehouse-filter");
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
const productsIncludeImages = document.getElementById("products-include-images");
const productsDateStart = document.getElementById("products-date-start");
const productsDateEnd = document.getElementById("products-date-end");
const productsSyncLimitInput = document.getElementById("products-sync-limit");
const productsSyncQuery = document.getElementById("products-sync-query");
const productsSyncPublish = document.getElementById("products-sync-publish");
const productsSyncOnlyPublished = document.getElementById("products-sync-only-published");
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
const cfgWarehouseSync = document.getElementById("cfg-warehouse-sync");

let shopifyAdminBase = "";
let currentUserRole = "agent";
let currentUserId = null;
let inventoryRules = {
  publishOnStock: true,
  autoPublishOnWebhook: true,
  autoPublishStatus: "draft",
  inventoryAdjustmentsEnabled: true,
  inventoryAdjustmentsIntervalMinutes: 5,
  inventoryAdjustmentsAutoPublish: true,
  warehouseIds: [],
};

const PRODUCT_SETTINGS_KEY = "apiflujos-products-settings";
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
    publishOnSync: true,
    onlyPublishedInShopify: true,
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
let activeProductsSyncId = "";
let assistantHasSpoken = false;
let assistantFiles = [];
let activeEinvoiceOrderId = "";


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
}

function activateNav(target) {
  navItems.forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("data-target") === target);
  });
  showSection(target);
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
  });
});

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    const collapsed = appShell?.classList.contains("is-collapsed");
    setSidebarCollapsed(!collapsed);
  });
}


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

function applyProductSettings() {
  if (productsPublishStatus) productsPublishStatus.value = productSettings.publish.status;
  if (productsIncludeImages) productsIncludeImages.checked = productSettings.publish.includeImages;
  if (productsDateStart) productsDateStart.value = productSettings.sync.dateStart;
  if (productsDateEnd) productsDateEnd.value = productSettings.sync.dateEnd;
  if (productsSyncLimitInput) productsSyncLimitInput.value = productSettings.sync.limit || "";
  if (productsSyncQuery) productsSyncQuery.value = productSettings.sync.query || "";
  if (productsSyncPublish) productsSyncPublish.checked = productSettings.sync.publishOnSync !== false;
  if (productsSyncOnlyPublished) {
    productsSyncOnlyPublished.checked = productSettings.sync.onlyPublishedInShopify !== false;
  }
  if (productsLimitInput) productsLimitInput.value = productSettings.filters.listLimit || "30";
  if (productsPublishFilter) productsPublishFilter.value = productSettings.filters.publishStatus || "all";
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
      publishOnSync: productsSyncPublish ? productsSyncPublish.checked : true,
      onlyPublishedInShopify: productsSyncOnlyPublished
        ? productsSyncOnlyPublished.checked
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
      publishStatus: productsPublishFilter ? productsPublishFilter.value : "all",
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
  const data = await fetchJson("/api/settings");
  // ambiente fijo en produccion
  if (data.shopify) {
    shopifyDomain.value = data.shopify.shopDomain || "";
    shopifyToken.placeholder = data.shopify.hasAccessToken ? "Guardado" : "shpat_********";
    statusTextShopify.textContent = data.shopify.hasAccessToken ? "Conectado" : "Sin token";
    statusLedShopify.classList.toggle("is-ok", Boolean(data.shopify.hasAccessToken));
    if (data.shopify.shopDomain) {
      shopifyAdminBase = `https://${data.shopify.shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/admin`;
    } else {
      shopifyAdminBase = "";
    }
  }
  if (data.alegra) {
    alegraEmail.value = data.alegra.email || "";
    alegraKey.placeholder = data.alegra.hasApiKey ? "Guardado" : "";
    statusTextAlegra.textContent = data.alegra.hasApiKey ? "Conectado" : "Sin token";
    statusLedAlegra.classList.toggle("is-ok", Boolean(data.alegra.hasApiKey));
  }
  if (data.ai) {
    if (aiKey) {
      aiKey.placeholder = data.ai.hasApiKey ? "Guardado" : "";
    }
  }
  if (data.invoice) {
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
      warehouseIds: Array.isArray(data.rules.warehouseIds) ? data.rules.warehouseIds : [],
    };
  }
  if (rulesAutoPublish) rulesAutoPublish.checked = inventoryRules.autoPublishOnWebhook;
  if (rulesAutoStatus) rulesAutoStatus.value = inventoryRules.autoPublishStatus;
  if (inventoryCronEnabled) {
    inventoryCronEnabled.checked = inventoryRules.inventoryAdjustmentsEnabled !== false;
  }
  if (inventoryCronIntervalSelect) {
    inventoryCronIntervalSelect.value = String(
      inventoryRules.inventoryAdjustmentsIntervalMinutes || 5
    );
  }
  setMetricsStatusPills(data.shopify?.hasAccessToken, data.alegra?.hasApiKey);
  renderConnections(data);
  loadSettingsWarehouses().catch(() => null);
  loadInventoryCheckpoint().catch(() => null);
}

function renderConnections(settings) {
  if (!connectionsGrid) return;
  connectionsGrid.innerHTML = "";
  const rows = [];
  if (settings.shopify) {
    rows.push({
      service: "Shopify",
      account: settings.shopify.shopDomain || "-",
      status: settings.shopify.hasAccessToken ? "Conectado" : "Sin token",
    });
  }
  if (settings.alegra) {
    const env = settings.alegra.environment || "prod";
    rows.push({
      service: "Alegra",
      account: settings.alegra.email ? `${settings.alegra.email} (${env})` : `(${env})`,
      status: settings.alegra.hasApiKey ? "Conectado" : "Sin token",
    });
  }
  if (settings.ai) {
    rows.push({
      service: "IA",
      account: "Olivia Shoes",
      status: settings.ai.hasApiKey ? "Token activo" : "Sin token",
    });
  }
  if (!rows.length) {
    connectionsGrid.innerHTML = `<div class="connection-card empty">Sin conexiones.</div>`;
    return;
  }
  connectionsGrid.innerHTML = rows
    .map((row) => {
      const statusClass = row.status === "Conectado" || row.status === "Token activo" ? "is-ok" : "is-off";
      return `
        <div class="connection-card">
          <div class="connection-head">
            <h4>${row.service}</h4>
            <span class="status-pill ${statusClass}">${row.status}</span>
          </div>
          <p>${row.account}</p>
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
    metricsShopifyStatus.textContent = shopifyOk ? "Shopify activo" : "Shopify sin token";
    metricsShopifyStatus.classList.toggle("is-ok", Boolean(shopifyOk));
    metricsShopifyStatus.classList.toggle("is-off", !shopifyOk);
  }
  if (metricsAlegraStatus) {
    metricsAlegraStatus.textContent = alegraOk ? "Alegra activo" : "Alegra sin token";
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
    const variantSum = variants.reduce((sum, variant) => {
      const qty = Number.isFinite(variant.inventoryQuantity) ? variant.inventoryQuantity : 0;
      return sum + qty;
    }, 0);
    const parentInventory = variants.length ? variantSum : baseParent.inventoryQuantity;

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

function getSelectedSettingsWarehouseIds() {
  if (!cfgWarehouseSync) return inventoryRules.warehouseIds || [];
  const inputs = Array.from(cfgWarehouseSync.querySelectorAll("input[data-warehouse-id]"));
  if (!inputs.length) return inventoryRules.warehouseIds || [];
  return inputs
    .filter((input) => input.checked)
    .map((input) => String(input.dataset.warehouseId || ""));
}

function renderSettingsWarehouseFilters() {
  if (!cfgWarehouseSync) return;
  const selected = new Set(inventoryRules.warehouseIds || []);
  cfgWarehouseSync.innerHTML = "";
  if (!settingsWarehousesCatalog.length) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "Sin bodegas";
    cfgWarehouseSync.appendChild(empty);
    return;
  }
  settingsWarehousesCatalog.forEach((warehouse) => {
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
}

async function loadSettingsWarehouses() {
  if (!cfgWarehouseSync) return;
  try {
    const data = await fetchJson("/api/alegra/warehouses");
    settingsWarehousesCatalog = Array.isArray(data.items) ? data.items : [];
  } catch {
    settingsWarehousesCatalog = [];
  }
  renderSettingsWarehouseFilters();
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
  if (!warehousesCatalog.length) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "Sin bodegas";
    productsWarehouseFilter.appendChild(empty);
    return;
  }
  warehousesCatalog.forEach((warehouse) => {
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
}

async function loadWarehouseFilters() {
  if (!productsWarehouseFilter) return;
  try {
    const data = await fetchJson("/api/alegra/warehouses");
    warehousesCatalog = Array.isArray(data.items) ? data.items : [];
  } catch {
    warehousesCatalog = [];
  }
  renderWarehouseFilters();
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
  if (Number.isFinite(baseQty)) return baseQty;
  if (Array.isArray(product.variants)) {
    return product.variants.reduce(
      (acc, variant) => acc + (Number(variant.inventoryQuantity) || 0),
      0
    );
  }
  return 0;
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
    const payload = await fetchJson("/api/shopify/lookup-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus }),
    });
    shopifyLookup = payload.results || {};
  } catch {
    shopifyLookup = {};
  }
}

function renderProducts() {
  if (!productsTableBody) return;
  if (productsLoading) {
    productsTableBody.innerHTML = `<tr><td colspan="8" class="empty">Cargando productos...</td></tr>`;
    return;
  }
  if (!productsRows.length) {
    productsTableBody.innerHTML = `<tr><td colspan="8" class="empty">Sin productos para mostrar.</td></tr>`;
    return;
  }

  const publishFilter = productSettings.filters?.publishStatus || "all";
  const dateFilter = productSettings.filters?.productsDate || "";
  const sortMode = productSettings.filters?.productsSort || "date_desc";
  const inStockOnly = Boolean(productSettings.filters?.inStockOnly);
  const statusFilter = productSettings.filters?.statusFilter || "all";
  const selectedWarehouses = new Set(productSettings.filters?.warehouseIds || []);
  const parentRows = productsRows.filter((row) => row.type === "parent");
  const filteredParents = parentRows.filter((row) => {
    if (publishFilter === "all") return true;
    const product = row.item;
    const lookup = product.sku ? shopifyLookup[product.sku] : null;
    const variantLookup = (product.variantBarcodes || [])
      .map((sku) => shopifyLookup[sku])
      .find((entry) => entry?.published);
    const resolvedLookup = lookup?.published ? lookup : variantLookup;
    const isPublished = Boolean(resolvedLookup?.published);
    const status = String(resolvedLookup?.status || "").toLowerCase();
    if (publishFilter === "published") return isPublished;
    if (publishFilter === "unpublished") return !isPublished;
    return isPublished && status === publishFilter;
  });

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
    const matchesStock = !inStockOnly || qty > 0;
    const matchesWarehouse = matchesWarehouseFilter(product, selectedWarehouses);
    return matchesStatus && matchesStock && matchesWarehouse;
  });
  const useFilteredCount =
    publishFilter !== "all" ||
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
    params.set("start", String(productsStart));
    params.set("limit", String(limit));
    if (productsQuery) params.set("query", productsQuery);
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
  const confirmPublish = window.confirm(
    "Vas a publicar este producto en Shopify. ¿Confirmas que quieres publicarlo?"
  );
  if (!confirmPublish) {
    setProductsStatus("Publicacion cancelada.");
    return;
  }
  setProductsStatus(`Publicando ${alegraId}...`);
  try {
    await fetchJson("/api/shopify/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alegraId,
        settings: {
          status: productSettings.publish.status,
          includeImages: productSettings.publish.includeImages,
          vendor: productSettings.publish.vendor,
          publishOnSync: productSettings.sync.publishOnSync !== false,
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
  if (productSettings.sync.publishOnSync) {
    const confirmPublish = window.confirm(
      "El checkbox de publicar esta activo. ¿Seguro que quieres publicar estos productos en Shopify?"
    );
    if (!confirmPublish) {
      setProductsStatus("Sincronizacion cancelada.");
      if (productsSyncStatus) {
        productsSyncStatus.textContent = "Cancelado por el usuario";
      }
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
  if (productsSyncStopBtn) {
    productsSyncStopBtn.disabled = false;
  }
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
    const response = await fetch("/api/sync/products?stream=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: resolvedMode,
        batchSize: 5,
        filters: {
          dateStart: productSettings.sync.dateStart || null,
          dateEnd: productSettings.sync.dateEnd || null,
          limit: productSettings.sync.limit ? Number(productSettings.sync.limit) : null,
          query: productSettings.sync.query || null,
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
          if (productsSyncStopBtn) {
            productsSyncStopBtn.disabled = true;
          }
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
          if (productsSyncStopBtn) {
            productsSyncStopBtn.disabled = true;
          }
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
    if (productsSyncStopBtn) {
      productsSyncStopBtn.disabled = true;
    }
    activeProductsSyncId = "";
  } catch (error) {
    const message = error?.message || "No se pudo sincronizar productos.";
    setProductsStatus(message);
    if (productsSyncStatus) {
      productsSyncStatus.textContent = message;
    }
    stopProgress("Error en productos");
    finishProductsProgress("Error en productos");
    if (productsSyncStopBtn) {
      productsSyncStopBtn.disabled = true;
    }
    activeProductsSyncId = "";
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
    const orderNumber = productSettings.orders.orderNumber
      ? productSettings.orders.orderNumber.replace(/^#/, "")
      : "";
    const response = await fetch("/api/sync/orders?stream=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
    const query = Number.isFinite(days) && days > 0 ? `?days=${days}` : "";
    const data = await fetchJson(`/api/operations${query}`);
    const items = data.items || [];
    operationsList = items;
    renderOperations(operationsList);
  } catch {
    operationsList = [];
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
  const query = (opsSearch.value || "").toLowerCase();
  const dateFilter = productSettings.filters?.ordersDateTouched
    ? productSettings.filters?.ordersDate || ""
    : "";
  const sortMode = productSettings.filters?.ordersSort || "date_desc";
  const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;

  let filtered = query
    ? items.filter((item) =>
        (item.orderNumber || "").toLowerCase().includes(query) ||
        (item.customer || "").toLowerCase().includes(query) ||
        (item.products || "").toLowerCase().includes(query)
      )
    : items;

  if (dateFilter) {
    filtered = filtered.filter((item) => {
      const created = item.processedAt || item.createdAt || "";
      if (!created) return true;
      return String(created).slice(0, 10) === dateFilter;
    });
  }

  filtered = [...filtered].sort((a, b) => {
    if (sortMode === "order_asc") {
      return String(a.orderNumber || "").localeCompare(String(b.orderNumber || ""));
    }
    if (sortMode === "order_desc") {
      return String(b.orderNumber || "").localeCompare(String(a.orderNumber || ""));
    }
    const left = String(a.processedAt || a.createdAt || "");
    const right = String(b.processedAt || b.createdAt || "");
    if (sortMode === "date_asc") {
      return left.localeCompare(right);
    }
    return right.localeCompare(left);
  });

  ordersTotal = filtered.length;
  const totalPages = Math.max(1, Math.ceil(ordersTotal / pageSize));
  const currentPage = Math.min(totalPages, Math.floor(ordersStart / pageSize) + 1);
  const start = Math.min(Math.max(0, ordersStart), Math.max(0, (totalPages - 1) * pageSize));
  ordersStart = start;
  if (ordersPageLabel) {
    ordersPageLabel.textContent = `Pagina ${currentPage} de ${totalPages} (${ordersTotal} pedidos)`;
  }
  if (ordersPageInput) {
    ordersPageInput.max = String(totalPages);
    ordersPageInput.value = String(currentPage);
  }
  if (ordersCountLabel) {
    const startLabel = ordersTotal === 0 ? 0 : start + 1;
    const endLabel = Math.min(start + pageSize, ordersTotal);
    ordersCountLabel.textContent = `Mostrando ${startLabel}-${endLabel} de ${ordersTotal}`;
  }
  if (ordersPrevBtn) ordersPrevBtn.disabled = start <= 0;
  if (ordersNextBtn) ordersNextBtn.disabled = start + pageSize >= ordersTotal;
  filtered = filtered.slice(start, start + pageSize);

  opsTableBody.innerHTML = filtered
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
      if (item.alegraStatus !== "facturado") {
        actions.push(`<button class="ghost" data-invoice="${item.id}">Facturar manualmente</button>`);
      }
      actions.push(`<button class="ghost" data-einvoice="${item.id}">Editar e-Factura</button>`);
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
        window.alert(error?.message || "No se pudo facturar.");
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
    if (!items.length) {
      const option = document.createElement("option");
      option.disabled = true;
      option.selected = true;
      option.textContent = "Sin datos";
      select.appendChild(option);
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
    const option = document.createElement("option");
    option.disabled = true;
    option.selected = true;
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
    await saveSettings();
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

async function saveSettings() {
  const payload = {
    shopify: {
      shopDomain: shopifyDomain.value,
      accessToken: shopifyToken.value,
    },
    alegra: {
      email: alegraEmail.value,
      apiKey: alegraKey.value,
      environment: "prod",
    },
    ai: {
      apiKey: aiKey ? aiKey.value : "",
    },
    invoice: {
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
    },
    rules: {
      publishOnStock: inventoryRules.publishOnStock,
      autoPublishOnWebhook: rulesAutoPublish ? rulesAutoPublish.checked : false,
      autoPublishStatus: rulesAutoStatus && rulesAutoStatus.value === "active" ? "active" : "draft",
      inventoryAdjustmentsEnabled: inventoryCronEnabled ? inventoryCronEnabled.checked : true,
      inventoryAdjustmentsIntervalMinutes: inventoryCronIntervalSelect
        ? Number(inventoryCronIntervalSelect.value || 5)
        : 5,
      inventoryAdjustmentsAutoPublish: inventoryRules.inventoryAdjustmentsAutoPublish !== false,
      warehouseIds: getSelectedSettingsWarehouseIds(),
    },
  };
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
  ]);
}

async function testConnections() {
  statusLedShopify.classList.remove("is-ok");
  statusLedAlegra.classList.remove("is-ok");
  statusTextShopify.textContent = "Verificando...";
  statusTextAlegra.textContent = "Verificando...";
  try {
    const payload = {
      shopify: {
        shopDomain: shopifyDomain.value,
        accessToken: shopifyToken.value,
      },
      alegra: {
        email: alegraEmail.value,
        apiKey: alegraKey.value,
        environment: "prod",
      },
    };
    const result = await fetchJson("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (String(result.shopify || "").startsWith("ok")) {
      statusLedShopify.classList.add("is-ok");
      statusTextShopify.textContent = "Activo";
    } else {
      statusTextShopify.textContent = String(result.shopify || "Error");
    }
    if (String(result.alegra || "").startsWith("ok")) {
      statusLedAlegra.classList.add("is-ok");
      statusTextAlegra.textContent = "Activo";
    } else {
      statusTextAlegra.textContent = String(result.alegra || "Error");
    }
    setMetricsStatusPills(String(result.shopify || "").startsWith("ok"), String(result.alegra || "").startsWith("ok"));
  } catch {
    statusTextShopify.textContent = "Error de red";
    statusTextAlegra.textContent = "Error de red";
    setMetricsStatusPills(false, false);
  }
}

async function testShopifyConnection() {
  statusLedShopify.classList.remove("is-ok");
  statusTextShopify.textContent = "Verificando...";
  try {
    const payload = {
      shopify: {
        shopDomain: shopifyDomain.value,
        accessToken: shopifyToken.value,
      },
    };
    const result = await fetchJson("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (String(result.shopify || "").startsWith("ok")) {
      statusLedShopify.classList.add("is-ok");
      statusTextShopify.textContent = "Activo";
      setMetricsStatusPills(true, Boolean(statusLedAlegra.classList.contains("is-ok")));
    } else {
      statusTextShopify.textContent = String(result.shopify || "Error");
      setMetricsStatusPills(false, Boolean(statusLedAlegra.classList.contains("is-ok")));
    }
  } catch {
    statusTextShopify.textContent = "Error de red";
    setMetricsStatusPills(false, Boolean(statusLedAlegra.classList.contains("is-ok")));
  }
}

async function testAlegraConnection() {
  statusLedAlegra.classList.remove("is-ok");
  statusTextAlegra.textContent = "Verificando...";
  try {
    const payload = {
      alegra: {
        email: alegraEmail.value,
        apiKey: alegraKey.value,
        environment: "prod",
      },
    };
    const result = await fetchJson("/api/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (String(result.alegra || "").startsWith("ok")) {
      statusLedAlegra.classList.add("is-ok");
      statusTextAlegra.textContent = "Activo";
      setMetricsStatusPills(Boolean(statusLedShopify.classList.contains("is-ok")), true);
    } else {
      statusTextAlegra.textContent = String(result.alegra || "Error");
      setMetricsStatusPills(Boolean(statusLedShopify.classList.contains("is-ok")), false);
    }
  } catch {
    statusTextAlegra.textContent = "Error de red";
    setMetricsStatusPills(Boolean(statusLedShopify.classList.contains("is-ok")), false);
  }
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
if (testShopifyButton) {
  testShopifyButton.addEventListener("click", testShopifyConnection);
}
if (testAlegraButton) {
  testAlegraButton.addEventListener("click", testAlegraConnection);
}
if (inventoryCronEnabled) {
  inventoryCronEnabled.addEventListener("change", async () => {
    try {
      await saveSettings();
      await loadInventoryCheckpoint();
    } catch {
      // ignore save errors here
    }
  });
}
if (inventoryCronIntervalSelect) {
  inventoryCronIntervalSelect.addEventListener("change", async () => {
    try {
      await saveSettings();
      await loadInventoryCheckpoint();
    } catch {
      // ignore save errors here
    }
  });
}
if (cfgWarehouseSync) {
  cfgWarehouseSync.addEventListener("change", async () => {
    try {
      await saveSettings();
    } catch {
      // ignore save errors here
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
      openPanelInSection("settings", "company-panel");
      return;
    }
    if (action === "users") {
      openPanelInSection("settings", "users-panel");
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
  productsWarehouseFilter.addEventListener("change", () => {
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

if (productsSyncStopBtn) {
  productsSyncStopBtn.disabled = true;
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
    renderOperations(operationsList);
  });
}

if (ordersDateFilter) {
  ordersDateFilter.addEventListener("change", () => {
    ordersStart = 0;
    refreshProductSettingsFromInputs();
    renderOperations(operationsList);
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
    renderOperations(operationsList);
  });
}

if (opsSearch) {
  opsSearch.addEventListener("input", () => {
    ordersStart = 0;
    refreshProductSettingsFromInputs();
    renderOperations(operationsList);
  });
}

if (ordersPrevBtn) {
  ordersPrevBtn.addEventListener("click", () => {
    const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;
    ordersStart = Math.max(0, ordersStart - pageSize);
    renderOperations(operationsList);
  });
}

if (ordersNextBtn) {
  ordersNextBtn.addEventListener("click", () => {
    const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;
    const maxStart = ordersTotal ? Math.max(0, (Math.ceil(ordersTotal / pageSize) - 1) * pageSize) : ordersStart + pageSize;
    ordersStart = Math.min(ordersStart + pageSize, maxStart);
    renderOperations(operationsList);
  });
}

if (ordersPageGo) {
  ordersPageGo.addEventListener("click", () => {
    const pageSize = ordersLimit && Number(ordersLimit.value) > 0 ? Number(ordersLimit.value) : 10;
    const totalPages = ordersTotal ? Math.max(1, Math.ceil(ordersTotal / pageSize)) : 1;
    const target = ordersPageInput ? Number(ordersPageInput.value) : 1;
    const page = Math.min(Math.max(1, target || 1), totalPages);
    ordersStart = (page - 1) * pageSize;
    renderOperations(operationsList);
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
    if (productsPublishFilter) productsPublishFilter.value = "all";
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

  if (productsSyncClear) {
    productsSyncClear.addEventListener("click", () => {
      if (productsDateStart) productsDateStart.value = "";
      if (productsDateEnd) productsDateEnd.value = "";
      if (productsSyncLimitInput) productsSyncLimitInput.value = "";
      if (productsSyncQuery) productsSyncQuery.value = "";
      if (productsSyncPublish) productsSyncPublish.checked = true;
      if (productsSyncOnlyPublished) productsSyncOnlyPublished.checked = true;
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
  productsSyncPublish,
  productsSyncOnlyPublished,
  productsPublishFilter,
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
  applyProductSettings();
  await safeLoad(loadCurrentUser());
  await safeLoad(loadCompanyProfile());
  await safeLoad(loadUsers());
  await safeLoad(loadLogs());
  await safeLoad(loadMetrics());
  await safeLoad(loadOperations());
  if (currentUserRole === "admin") {
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
      ? safeLoad(loadCatalog(cfgSeller, "sellers"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgPaymentMethod, "payment-methods"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgBankAccount, "bank-accounts"))
      : Promise.resolve(null),
    currentUserRole === "admin"
      ? safeLoad(loadCatalog(cfgBankAccount, "bank-accounts"))
      : Promise.resolve(null),
  ]);
}

init();
