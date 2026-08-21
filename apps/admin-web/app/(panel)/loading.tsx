import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";

/**
 * Estado de carga de las pantallas del panel.
 *
 * Se pinta DENTRO del shell, que ya está montado por el layout: el usuario ve
 * el menú y la cabecera intactos y sólo el área de contenido en esqueleto.
 */
export default function PanelLoading() {
  return <PageContentSkeleton />;
}
