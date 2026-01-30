const backHome = document.getElementById("back-home");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userRole = document.getElementById("user-role");
const userMenu = document.getElementById("topbar-user-menu");
const userMenuToggle = document.getElementById("topbar-user-toggle");
const companyLogo = document.getElementById("company-logo");

const usersTableBody = document.querySelector("#users-table tbody");
const userNameInput = document.getElementById("user-create-name");
const userEmailInput = document.getElementById("user-create-email");
const userPhoneInput = document.getElementById("user-create-phone");
const userRoleInput = document.getElementById("user-create-role");
const userPasswordInput = document.getElementById("user-create-password");
const userCreate = document.getElementById("user-create");
const usersMessage = document.getElementById("users-message");

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
    if (currentUserRole !== "admin") {
      window.location.href = "/";
      return;
    }
    const roleLabel = user.role === "admin" ? "Admin" : "Agente";
    if (userName) userName.textContent = user.name || user.email || "Usuario";
    if (userRole) userRole.textContent = roleLabel;
    if (userAvatar) {
      userAvatar.src = user.photoBase64 || "/assets/avatar.png";
    }
    if (companyLogo && data.company?.logoBase64) {
      companyLogo.src = data.company.logoBase64;
    }
  } catch {
    // ignore
  }
}

function renderUsers(items) {
  if (!usersTableBody) return;
  if (!Array.isArray(items) || !items.length) {
    usersTableBody.innerHTML = '<tr><td colspan="5" class="empty">Sin usuarios.</td></tr>';
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
      role: userRoleInput ? userRoleInput.value : "agent",
      password: userPasswordInput ? userPasswordInput.value : "",
    };
    await fetchJson("/api/users", {
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
  } catch (error) {
    if (usersMessage) {
      usersMessage.textContent = error?.message || "No se pudo crear el usuario.";
    }
  }
}

if (backHome) {
  backHome.addEventListener("click", () => {
    window.location.href = "/";
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
    if (action === "dashboard") {
      window.location.href = "/";
      return;
    }
    if (action === "company") {
      window.location.href = "/company.html";
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
  await loadUsers();
}

init();
