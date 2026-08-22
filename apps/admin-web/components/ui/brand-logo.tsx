/**
 * Marca ApiFlujos.
 *
 * Se usa el SVG OFICIAL de apiflujos.com (`/assets/brand/logo-light.svg`), no
 * una reconstrucción: la marca es del cliente y debe ser exactamente la suya.
 *
 * - `variant="full"`  → isotipo + palabra (el archivo oficial completo).
 * - `variant="mark"`  → sólo el isotipo, recortando el mismo archivo por
 *   viewBox. Un único activo, cero riesgo de que las dos versiones se
 *   desincronicen.
 */
export function BrandLogo({
  variant = "full",
  height = 32,
  subtitle,
  className = "",
}: {
  variant?: "full" | "mark";
  /** Alto en píxeles. El ancho se ajusta solo. */
  height?: number;
  subtitle?: string;
  className?: string;
}) {
  const esCompleto = variant === "full";
  const src = esCompleto ? "/assets/logo.svg" : "/assets/isotipo.svg";
  // Proporciones del archivo oficial: 400 x 112.31 completo, 113 x 112.31 el isotipo.
  const width = Math.round(height * (esCompleto ? 400 / 112.31 : 113 / 112.31));

  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <img
        className="brand-logo-img"
        src={src}
        width={width}
        height={height}
        style={{ height, width }}
        alt="ApiFlujos"
      />
      {subtitle ? <span className="brand-subtitle">{subtitle}</span> : null}
    </span>
  );
}
