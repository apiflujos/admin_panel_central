import { ApiFlujosLoader } from "../components/ui/apiflujos-loader";

/**
 * Carga de arranque de la aplicación.
 *
 * Es lo que se ve JUSTO DESPUÉS DE ENTRAR, mientras el navegador trae el panel
 * y el servidor resuelve la sesión. Antes no existía este archivo —se movió
 * dentro de `(panel)`— así que ese momento quedaba en blanco y parecía que la
 * aplicación no respondía.
 *
 * Aquí no se usa el modal: no hay nada detrás que oscurecer todavía.
 */
export default function ArranqueLoading() {
  return (
    <div className="af-boot" aria-busy="true">
      <ApiFlujosLoader size="xl" label="Cargando ApiFlujos" />
      <p className="af-loader-text">Cargando…</p>
    </div>
  );
}
