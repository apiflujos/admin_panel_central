"use client";

export default function ConnectionsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="app-state-shell app-state-shell-page">
      <div className="app-state-card app-state-card-sm">
        <p className="app-state-eyebrow">Error al cargar conexiones</p>
        <h2 className="app-state-title">No se pudo cargar el panel de conexiones</h2>
        <p className="app-state-copy">
          {error.digest ? `(${error.digest})` : "El backend no respondió mientras cargábamos las conexiones."}
        </p>
        <button onClick={reset} type="button" className="btn primary btn-compact">
          Reintentar
        </button>
      </div>
    </div>
  );
}
