import { WorkersPanel } from "../../../../components/workers-panel";

/**
 * Los trabajos viven DENTRO de Configuración, que es donde el usuario espera
 * encontrarlos: son parte de configurar la automatización, no una sección
 * aparte. Esta ruta se conserva para que los enlaces guardados no se rompan.
 *
 * No monta AppShell: de eso se encarga el layout del panel.
 */
export default function WorkersRoutePage() {
  return <WorkersPanel conCabecera />;
}
