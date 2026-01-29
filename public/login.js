const form = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const rememberInput = document.getElementById("login-remember");
const errorBox = document.getElementById("login-error");
const loginLogo = document.getElementById("login-logo");
const loginTitle = document.getElementById("login-title");

try {
  const savedEmail = localStorage.getItem("os_login_email");
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
    if (loginLogo && data.logoBase64) {
      loginLogo.src = data.logoBase64;
    }
    if (loginTitle && data.name) {
      loginTitle.textContent = `Acceso ${data.name}`;
    }
  })
  .catch(() => null);

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
        localStorage.setItem("os_login_email", email);
      } else {
        localStorage.removeItem("os_login_email");
      }
    } catch {
      // ignore storage errors
    }
    window.location.href = "/";
  } catch (error) {
    errorBox.textContent = error?.message || "No se pudo iniciar sesion.";
  }
});
