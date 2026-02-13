const backHome = document.getElementById("back-home");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userRole = document.getElementById("user-role");
const userMenu = document.getElementById("topbar-user-menu");
const userMenuToggle = document.getElementById("topbar-user-toggle");
const clientLogo = document.getElementById("client-logo");

const companyName = document.getElementById("company-name");
const companyPhone = document.getElementById("company-phone");
const companyAddress = document.getElementById("company-address");
const companyLogoInput = document.getElementById("company-logo-input");
const companySave = document.getElementById("company-save");
const companyMessage = document.getElementById("company-message");

let currentUserRole = "agent";
let csrfToken = "";

async function loadBranding() {
  try {
    const response = await fetch("/brand.json", { cache: "no-cache" });
    if (!response.ok) return;
    const brand = await response.json();
    const appTitle = String(brand.appTitle || "").trim() || "Admin Central";
    const clientName = String(brand.clientName || "").trim();
    const suffix = "Empresa";
    document.title = clientName
      ? `${appTitle} · ${clientName} - ${suffix}`
      : `${appTitle} - ${suffix}`;
  } catch {
    // ignore
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

async function ensureCsrfToken() {
  try {
    const data = await fetchJson("/api/auth/csrf");
    csrfToken = String(data?.token || "");
  } catch {
    csrfToken = "";
  }
}

function toggleUserMenu(forceState) {
  if (!userMenu) return;
  const next = typeof forceState === "boolean" ? forceState : !userMenu.classList.contains("is-open");
  userMenu.classList.toggle("is-open", next);
}

async function loadCurrentUser() {
  try {
    const data = await fetchJson("/api/profile");
    const user = data.user || {};
    currentUserRole = user.role || (user.isSuperAdmin ? "super_admin" : "agent");
    const roleLabel =
      currentUserRole === "super_admin" ? "Super Admin" : currentUserRole === "admin" ? "Admin" : "Agente";
    if (userName) userName.textContent = user.name || user.email || "Usuario";
    if (userRole) userRole.textContent = roleLabel;
    if (userAvatar) {
      userAvatar.src = user.photoBase64 || "/assets/avatar.png";
    }
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.style.display = currentUserRole === "admin" || currentUserRole === "super_admin" ? "" : "none";
    });
    await ensureCsrfToken();
  } catch {
    // ignore
  }
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
    // ignore
  }
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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

if (backHome) {
  backHome.addEventListener("click", () => {
    window.location.href = "/";
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
    if (action === "dashboard") {
      window.location.href = "/";
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

async function init() {
  loadBranding();
  await loadCurrentUser();
  await loadCompanyProfile();
}

init();
