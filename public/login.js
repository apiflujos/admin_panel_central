const form = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const rememberInput = document.getElementById("login-remember");
const errorBox = document.getElementById("login-error");
const loginLogo = document.getElementById("login-logo");
const loginTitle = document.getElementById("login-title");
const loginSubtitle = document.getElementById("login-subtitle");
const clientLogo = document.getElementById("client-logo");

async function loadBranding() {
  try {
    const response = await fetch("/brand.json", { cache: "no-cache" });
    if (!response.ok) return;
    const brand = await response.json();
    const appTitle = String(brand.appTitle || "").trim();
    const clientName = String(brand.clientName || "").trim();
    const loginTitleText = String(brand.loginTitle || "").trim();
    const loginSubtitleText = String(brand.loginSubtitle || "").trim();
    if (appTitle) {
      document.title = clientName ? `${appTitle} · ${clientName}` : appTitle;
    }
    if (loginTitle && loginTitleText) {
      loginTitle.textContent = loginTitleText;
    } else if (loginTitle && clientName) {
      loginTitle.textContent = `Acceso ${clientName}`;
    }
    if (loginSubtitle && loginSubtitleText) {
      loginSubtitle.textContent = loginSubtitleText;
    }
  } catch {
    // ignore
  }
}

try {
  const savedEmail = localStorage.getItem("ac_login_email");
  if (savedEmail) {
    emailInput.value = savedEmail;
    if (rememberInput) rememberInput.checked = true;
  }
} catch {
  // ignore storage errors
}

fetch("/api/company/public")
  .then((response) => (response.ok ? response.json() : null))
  .then((data) => {
    if (!data) return;
    if (clientLogo) {
      if (data.logoBase64) {
        clientLogo.src = data.logoBase64;
        clientLogo.style.display = "";
        clientLogo.closest(".login-brand")?.classList.add("has-client-logo");
      } else {
        clientLogo.src = "";
        clientLogo.style.display = "none";
        clientLogo.closest(".login-brand")?.classList.remove("has-client-logo");
      }
    }
    if (loginTitle && data.name && !loginTitle.textContent) {
      loginTitle.textContent = `Acceso ${data.name}`;
    }
  })
  .catch(() => null);

loadBranding();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";
  const email = String(emailInput.value || "").trim();
  const password = String(passwordInput.value || "");
  const remember = Boolean(rememberInput && rememberInput.checked);
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Credenciales invalidas.");
    }
    try {
      if (remember) {
        localStorage.setItem("ac_login_email", email);
      } else {
        localStorage.removeItem("ac_login_email");
      }
    } catch {
      // ignore storage errors
    }
    window.location.href = "/";
  } catch (error) {
    errorBox.textContent = error?.message || "No se pudo iniciar sesion.";
  }
});
