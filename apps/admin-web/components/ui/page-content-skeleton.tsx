import { ApiFlujosBlockingLoader } from "./apiflujos-loader";

/**
 * Lo que se ve mientras carga una sección.
 *
 * Es un MODAL que oscurece y desenfoca lo que hay detrás, no un esqueleto que
 * sustituye el contenido: el usuario mantiene la referencia visual de dónde
 * está y entiende que la aplicación está trabajando, no que se rompió.
 */
export function PageContentSkeleton() {
  return <ApiFlujosBlockingLoader label="Cargando…" />;
}
