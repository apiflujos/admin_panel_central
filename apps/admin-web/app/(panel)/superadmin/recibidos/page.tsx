import { WebhooksSinAsociarPanel } from "../../../../components/webhooks-sin-asociar-panel";

/**
 * Vista de Super Admin de lo que llega y no se puede asociar.
 *
 * Existe aparte de la de cada empresa porque el caso más importante —un webhook
 * de una tienda que no reconocemos— no tiene organización por definición: si
 * sólo hubiera vista por empresa, ese caso no lo vería nadie.
 *
 * No monta AppShell: de eso se encarga el layout del panel.
 */
export default function RecibidosSinAsociarPage() {
  return <WebhooksSinAsociarPanel superAdmin />;
}
