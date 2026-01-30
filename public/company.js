const backHome = document.getElementById("back-home");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userRole = document.getElementById("user-role");
const userMenu = document.getElementById("topbar-user-menu");
const userMenuToggle = document.getElementById("topbar-user-toggle");
const companyLogo = document.getElementById("company-logo");

const companyName = document.getElementById("company-name");
const companyPhone = document.getElementById("company-phone");
const companyAddress = document.getElementById("company-address");
const companyLogoInput = document.getElementById("company-logo-input");
const companySave = document.getElementById("company-save");
const companyMessage = document.getElementById("company-message");

let currentUserRole = "agent";

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

function toggleUserMenu(forceState) {
  if (!userMenu) return;
  const next = typeof forceState === "boolean" ? forceState : !userMenu.classList.contains("is-open");
  userMenu.classList.toggle("is-open", next);
}

async function loadCurrentUser() {
  try {
    const data = await fetchJson("/api/profile");
    const user = data.user || {};
    currentUserRole = user.role || "agent";
    const roleLabel = user.role === "admin" ? "Admin" : "Agente";
    if (userName) userName.textContent = user.name || user.email || "Usuario";
    if (userRole) userRole.textContent = roleLabel;
    if (userAvatar) {
      userAvatar.src = user.photoBase64 || "/assets/avatar.png";
    }
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.style.display = currentUserRole === "admin" ? "" : "none";
    });
  } catch {
    // ignore
  }
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
    if (companyLogo) {
      companyLogo.src = data.logoBase64 || "/assets/logo.png";
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
      if (companyLogo) companyLogo.src = preview;
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

async function init() {
  await loadCurrentUser();
  await loadCompanyProfile();
}

init();
