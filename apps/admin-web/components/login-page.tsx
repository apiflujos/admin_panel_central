export function LoginPage({ hasError = false }: { hasError?: boolean }) {
  return (
    <section className="auth-layout">
      <div className="auth-hero">
        <p className="auth-kicker">Alegra ↔ Shopify</p>
        <h1>Nuevo acceso del admin central</h1>
        <p>Panel de administración para la sincronización entre Alegra y Shopify. Accede con tus credenciales de administrador.</p>
        <div className="auth-pill-row">
          <span className="pill pill-info">Design System v4</span>
          <span className="pill pill-success">Strict TS</span>
          <span className="pill">Session DTO</span>
        </div>
      </div>
      <div className="auth-card card">
        <div className="table-meta">Acceso administrativo</div>
        <form className="auth-form" action="/api/session/login" method="post">
          <label className="auth-field">
            <span>Email</span>
            <input className="input-control" name="email" type="email" placeholder="admin@apiflows.co" />
          </label>
          <label className="auth-field">
            <span>Contraseña</span>
            <input className="input-control" name="password" type="password" placeholder="••••••••" />
          </label>
          {hasError ? <p className="auth-error">No se pudo iniciar sesión. Verifica credenciales y backend.</p> : null}
          <div className="auth-actions">
            <a
              className="btn btn-ghost"
              href="mailto:soporte@apiflujos.co"
            >
              Recuperar acceso
            </a>
            <button className="btn btn-primary" type="submit">
              Ingresar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
