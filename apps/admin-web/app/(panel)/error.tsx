"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="app-state-shell">
      <div className="app-state-card">
        <p className="app-state-eyebrow">Error del sistema</p>
        <h2 className="app-state-title">No se pudo cargar la página</h2>
        <p className="app-state-copy">
          El backend no respondió o encontró un error.
          {error.digest ? ` (${error.digest})` : ""}
        </p>
        <button onClick={reset} className="btn primary" type="button">
          Reintentar
        </button>
      </div>
    </div>
  );
}
