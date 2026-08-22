/**
 * Cargador oficial de ApiFlujos.
 *
 * Dos animaciones a la vez: el envoltorio GIRA y el isotipo de dentro RESPIRA
 * (desenfoque + escala). La idea está tomada del cargador del CMMS, adaptada a
 * esta marca: cargar deja de ser una pantalla en blanco y pasa a ser el logo
 * moviéndose, que es lo que le dice al usuario que la aplicación está viva.
 *
 * Con `prefers-reduced-motion` ambas animaciones se reducen a un latido suave
 * de opacidad: quien tenga sensibilidad al movimiento no se marea.
 */
export type ApiFlujosLoaderSize = "xs" | "sm" | "md" | "lg" | "xl";

const CLASE_TAMANO: Record<ApiFlujosLoaderSize, string> = {
  xs: "is-xs",
  sm: "is-sm",
  md: "is-md",
  lg: "is-lg",
  xl: "is-xl",
};

export function ApiFlujosLoader({
  size = "md",
  className = "",
  /** Texto para lectores de pantalla. Vacío si algo al lado ya lo anuncia. */
  label = "Cargando",
}: {
  size?: ApiFlujosLoaderSize;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`af-loader ${CLASE_TAMANO[size]} ${className}`.trim()}
      role={label ? "status" : undefined}
      aria-live={label ? "polite" : undefined}
      aria-label={label || undefined}
    >
      <img src="/assets/isotipo.svg" alt="" aria-hidden="true" />
    </span>
  );
}

/**
 * Cargador a pantalla completa que BLOQUEA la interacción mientras una acción
 * crítica está en vuelo (entrar, guardar una configuración que toca tiendas).
 */
export function ApiFlujosBlockingLoader({ label = "Cargando", hint }: { label?: string; hint?: string }) {
  return (
    <div className="af-blocking" role="alertdialog" aria-modal="true" aria-label={label}>
      <div className="af-blocking-panel">
        <ApiFlujosLoader size="lg" label="" />
        <strong className="af-blocking-label">{label}</strong>
        {hint ? <p className="af-blocking-hint">{hint}</p> : null}
      </div>
    </div>
  );
}
