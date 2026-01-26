const form = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const rememberInput = document.getElementById("login-remember");
const errorBox = document.getElementById("login-error");

try {
  const savedEmail = localStorage.getItem("os_login_email");
  if (savedEmail) {
    emailInput.value = savedEmail;
    if (rememberInput) rememberInput.checked = true;
  }
} catch {
  // ignore storage errors
}

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
