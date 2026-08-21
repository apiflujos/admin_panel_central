import { PageContentSkeleton } from "../../../../components/ui/page-content-skeleton";

/**
 * Estado de carga de la ruta.
 *
 * Se pinta DENTRO del shell, que el layout del panel ya tiene montado: el menú
 * y la cabecera se quedan quietos y sólo el contenido pasa a esqueleto.
 */
export default function Loading() {
  return <PageContentSkeleton />;
}
