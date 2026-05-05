"use client";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="app-state-shell app-state-shell-page">
      <div className="app-state-card app-state-card-sm">
        <p className="app-state-eyebrow">Error al cargar</p>
        <h2 className="app-state-title">No se pudo obtener los datos</h2>
        <p className="app-state-copy">{error.digest ? `(${error.digest})` : "El backend no respondió."}</p>
        <button onClick={reset} type="button" className="btn primary btn-compact">
          Reintentar
        </button>
      </div>
    </div>
  );
}
