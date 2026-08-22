/**
 * Cargador oficial de ApiFlujos.
 *
 * El isotipo GIRA mientras RESPIRA (desenfoque + escala). Idea tomada del
 * cargador del CMMS, con el isotipo oficial de la marca.
 *
 * Con `prefers-reduced-motion` se reduce a un latido de opacidad.
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
 * Cargador MODAL: cubre la pantalla, oscurece y desenfoca lo de detrás e
 * impide interactuar con ello.
 *
 * Se usa tanto al navegar entre secciones como en acciones críticas (entrar).
 * Antes la carga se pintaba como un esqueleto que SUSTITUÍA el contenido, así
 * que no se percibía como "está cargando" sino como "se rompió la pantalla".
 */
export function ApiFlujosBlockingLoader({ label = "Cargando", hint }: { label?: string; hint?: string }) {
  return (
    <div className="af-blocking" role="alertdialog" aria-modal="true" aria-label={label} aria-busy="true">
      <div className="af-blocking-panel">
        <ApiFlujosLoader size="lg" label="" />
        <strong className="af-blocking-label">{label}</strong>
        {hint ? <p className="af-blocking-hint">{hint}</p> : null}
      </div>
    </div>
  );
}
