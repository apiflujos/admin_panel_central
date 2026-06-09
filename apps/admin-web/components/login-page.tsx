export function LoginPage({ hasError = false }: { hasError?: boolean }) {
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

        {hasError ? (
          <div className="auth-inline-state auth-inline-state-error">No se pudo iniciar sesión. Revisa tus datos.</div>
        ) : null}

        <form className="auth-form" action="/api/session/login" method="post">
          <label className="auth-field">
            <span>Usuario</span>
            <input className="input" name="email" type="email" placeholder="admin@apiflujos.com" />
          </label>

          <label className="auth-field">
            <span>Contraseña</span>
            <div className="auth-password-row">
              <input className="input" name="password" type="password" placeholder="" />
              <button className="auth-password-toggle" type="button">
                Ver
              </button>
            </div>
          </label>

          <label className="auth-checkbox-row">
            <input type="checkbox" name="remember" value="1" />
            <span>Recordarme</span>
          </label>

          <div className="auth-actions">
            <button className="btn primary" type="submit">
              Entrar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
