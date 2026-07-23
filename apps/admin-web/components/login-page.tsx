"use client";

import { useState } from "react";

export function LoginPage({ hasError = false }: { hasError?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(hasError);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(false);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const remember = formData.get("remember") === "1";

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
        credentials: "include",
      });

      if (!response.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      const data = (await response.json()) as { ok?: boolean };
      if (!data.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      // Hard navigation (no soft router.replace) so the just-set os_session cookie
      // is reliably sent on the next request and the middleware/session read it on
      // the first try — avoids the "double login" where a soft RSC navigation raced
      // the freshly set cookie and bounced back to /auth/login.
      window.location.assign("/");
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-card card">
        <div className="auth-brand-row">
          <img className="auth-brand-logo" src="/assets/logo.png" alt="ApiFlujos" />
          <img className="auth-brand-avatar" src="/assets/avatar.png" alt="" aria-hidden="true" />
        </div>

        <div className="auth-copy">
          <h1>Bienvenido</h1>
          <p>Ingresa para ver los pedidos y la trazabilidad.</p>
        </div>

        {error ? (
          <div className="auth-inline-state auth-inline-state-error">No se pudo iniciar sesión. Revisa tus datos.</div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Usuario</span>
            <input className="input" name="email" type="email" placeholder="admin@apiflujos.com" required />
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <div className="auth-password-row">
              <input
                className="input"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder=""
                required
              />
              <button
                className="auth-password-toggle"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </label>

          <label className="auth-checkbox-row">
            <input type="checkbox" name="remember" value="1" />
            <span>Recordarme</span>
          </label>

          <div className="auth-actions">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
