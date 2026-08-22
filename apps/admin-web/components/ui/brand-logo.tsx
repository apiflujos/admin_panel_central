/**
 * Marca ApiFlujos: isotipo + palabra.
 *
 * El isotipo es un SVG (2 KB comprimidos frente a los 136 KB del PNG anterior,
 * y nítido a cualquier tamaño). La PALABRA se compone en HTML, no dentro del
 * SVG: así usa la tipografía real de la interfaz, se adapta al tema y no
 * depende de que el navegador tenga una fuente concreta.
 *
 * Antes el PNG ya incluía la palabra «ApiFlujos» y al lado se pintaba OTRA vez
 * en texto. Se veía dos veces.
 */
export function BrandLogo({
  size = 28,
  withWordmark = true,
  subtitle,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <img
        className="brand-isotype"
        src="/assets/isotipo.svg"
        width={size}
        height={size}
        alt={withWordmark ? "" : "ApiFlujos"}
        aria-hidden={withWordmark ? true : undefined}
        style={{ width: size, height: size }}
      />
      {withWordmark ? (
        <span className="brand-words">
          <strong className="brand-wordmark">
            <span className="brand-word-api">Api</span>
            <span className="brand-word-flujos">Flujos</span>
          </strong>
          {subtitle ? <span className="brand-subtitle">{subtitle}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
