import { ApiFlujosBlockingLoader } from "../../components/ui/apiflujos-loader";

/**
 * Lo que se ve al cambiar de sección.
 *
 * Un MODAL a pantalla completa que oscurece y desenfoca el menú y la cabecera
 * que quedan detrás. Antes era un esqueleto que sustituía el contenido: no se
 * leía como "cargando" sino como "se rompió".
 */
export default function PanelLoading() {
  return <ApiFlujosBlockingLoader label="Cargando…" />;
}
