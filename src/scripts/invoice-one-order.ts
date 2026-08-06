/**
 * Factura UNA sola orden de Shopify en Alegra, de forma dirigida y controlada.
 * Reutiliza el flujo real (`syncShopifyOrderToAlegra`) con la corrección del
 * tipo de identificación ya aplicada — NO toca ninguna otra orden ni dispara
 * el backlog. Pensado para verificar la facturación de una prueba puntual sin
 * hacer nada retroactivo.
 *
 * El payload crudo se toma de `webhook_events` (el mismo que recibió Shopify),
 * y se le inyecta `__shopDomain` para resolver credenciales/tienda.
 *
 * Uso:
 *   node dist/src/scripts/invoice-one-order.js --order=7205607866598                 # DRY-RUN
 *   node dist/src/scripts/invoice-one-order.js --order=7205607866598 --apply         # factura
 *   node dist/src/scripts/invoice-one-order.js --order=... --shop=mut50d-tj.myshopify.com --apply
 *
 * Por defecto la tienda es Becam (mut50d-tj.myshopify.com).
 */
import "dotenv/config";
import { runWithOrg, getPool } from "../db";
import { syncShopifyOrderToAlegra } from "../services/shopify-to-alegra.service";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const orderId = argv.find((a) => a.startsWith("--order="))?.split("=")[1];
const shopDomain =
  argv.find((a) => a.startsWith("--shop="))?.split("=")[1] || "mut50d-tj.myshopify.com";
const orgId = Number(process.env.APP_ORG_ID || 1);

async function main() {
  if (!orderId) {
    throw new Error("Falta --order=<shopifyOrderId>  (ej: --order=7205607866598)");
  }
  await runWithOrg(orgId, async () => {
    const pool = getPool();
    const { rows } = await pool.query(
      `
      SELECT payload_json, event_type, received_at
      FROM webhook_events
      WHERE organization_id = $1
        AND source = 'shopify'
        AND payload_json->>'id' = $2
        AND event_type IN ('orders/paid', 'orders/create', 'orders/updated')
      ORDER BY (event_type = 'orders/paid') DESC, received_at DESC
      LIMIT 1
      `,
      [orgId, orderId]
    );
    if (!rows.length) {
      throw new Error(`Sin payload en webhook_events para la orden ${orderId}`);
    }
    const payload: Record<string, unknown> = {
      ...(rows[0].payload_json as Record<string, unknown>),
      __shopDomain: shopDomain,
    };
    const cust = (payload.customer || {}) as Record<string, unknown>;
    const items = Array.isArray(payload.line_items) ? (payload.line_items as Array<Record<string, unknown>>) : [];

    console.log("=== ORDEN A FACTURAR (solo esta) ===");
    console.log(`  pedido:  ${payload.name} (${orderId})`);
    console.log(`  tienda:  ${shopDomain}`);
    console.log(`  cliente: ${cust.first_name || ""} ${cust.last_name || ""}`.trim());
    console.log(`  líneas:  ${items.map((i) => `${i.quantity}x ${i.sku || i.title}`).join(", ")}`);
    console.log(`  total:   ${payload.total_price} ${payload.currency}`);
    console.log(`  evento:  ${rows[0].event_type} @ ${rows[0].received_at}`);
    console.log("");

    if (!APPLY) {
      console.log("DRY-RUN. Con --apply se crea la factura en Alegra (SOLO esta orden).");
      return;
    }

    console.log("Facturando (solo esta orden)...");
    const result = await syncShopifyOrderToAlegra(payload as never, { generateInvoice: true });
    console.log("");
    console.log("=== RESULTADO ===");
    console.log(JSON.stringify(result, null, 2));
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
