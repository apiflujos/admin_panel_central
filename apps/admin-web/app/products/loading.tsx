import { PageContentSkeleton } from "../../components/ui/page-content-skeleton";

/**
 * Estado de carga de la ruta.
 *
 * Se renderiza SOLO el esqueleto, sin `AppShell`: el shell exige una sesión y
 * durante la carga aún no la tenemos, así que devolvía `null` y el usuario no
 * veía nada al navegar. Ahora hay realimentación visual inmediata.
 */
export default function Loading() {
  return <PageContentSkeleton />;
}
