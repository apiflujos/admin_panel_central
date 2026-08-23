/**
 * Recupera los pedidos que ENTRARON por webhook pero NUNCA llegaron a la
 * plataforma.
 *
 * POR QUÉ EXISTE
 * --------------
 * Hasta la corrección de «un pedido no puede dejar de entrar», el pedido se
 * registraba DESPUÉS de facturar. Si la factura fallaba —y falló miles de
 * veces: sin cédula, departamento inválido, tipo de persona— el webhook
 * quedaba en `failed` y el pedido no existía en ninguna parte. Desde fuera
 * parecía que la venta no había ocurrido.
 *
 * Este comando repara ese pasado. Toma el payload que Shopify ya nos mandó
 * —está guardado íntegro en `webhook_events`— y registra el pedido con los
 * datos que llegaron, sean los que sean.
 *
 * QUÉ NO HACE
 * -----------
 * NO factura. Nunca. Ni siquiera con --aplicar. Registrar el pedido y decidir
 * si se factura son dos cosas distintas: lo primero es un hecho, lo segundo es
 * una decisión que toma una persona o las reglas de los workers.
 *
 * Cuando el pedido no cumple los requisitos de la DIAN, se registra igual y se
 * marca `sync_status = 'no_facturable'` con el motivo y cómo se arregla, para
 * que se vea en la pantalla del pedido en vez de desaparecer.
 *
 * Uso:
 *   node dist/src/scripts/recuperar-pedidos-perdidos.js            # SOLO INFORMA (por omisión)
 *   node dist/src/scripts/recuperar-pedidos-perdidos.js --aplicar  # registra los pedidos
 *   node dist/src/scripts/recuperar-pedidos-perdidos.js --limite=10 --aplicar
 *   node dist/src/scripts/recuperar-pedidos-perdidos.js --tienda=mut50d-tj.myshopify.com
 */
import "dotenv/config";
import { z } from "zod";

import { getOrgId, getPool, runWithOrg } from "../db";
import { upsertOrder } from "../services/orders.service";
import { buildOrderMetaFromPayload, mapShopifyToAlegraContact } from "../services/shopify-to-alegra.service";
import { preflightDeFacturacion } from "../../packages/domain/src/invoice-preflight";

const argv = process.argv.slice(2);
const APLICAR = argv.includes("--aplicar");
const orgId = Number(process.env.APP_ORG_ID || 1);

const opcionesSchema = z.object({
  limite: z.coerce.number().int().positive().max(5000).default(5000),
  tienda: z.string().trim().min(1).optional(),
});

const leerOpcion = (nombre: string) =>
  argv
    .find((a) => a.startsWith(`--${nombre}=`))
    ?.split("=")
    .slice(1)
    .join("=");

/**
 * Fila cruda de `webhook_events`. Se valida en vez de confiar: son payloads de
 * hace semanas y basta con que UNO venga raro para tumbar toda la recuperación.
 */
const filaSchema = z.object({
  order_id: z.string().min(1),
  shop_domain: z.string().min(1),
  payload_json: z.record(z.string(), z.unknown()),
  eventos: z.coerce.number().int().nonnegative(),
});

type Fila = z.infer<typeof filaSchema>;

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim() : "");

/**
 * Diagnóstico SOLO INFORMATIVO: para qué pedidos faltaría un dato obligatorio.
 *
 * Usa `mapShopifyToAlegraContact`, el mismo mapeo del motor, en vez de repetir
 * aquí la regla de la cédula: dos copias de la misma regla acaban dando
 * respuestas distintas.
 *
 * Es CONSERVADOR a propósito: el motor no exige la identificación cuando el
 * cliente ya existe en Alegra con su documento guardado, y eso sólo se sabe
 * consultando Alegra. Aquí no se consulta, así que un pedido listado como
 * bloqueado por «sin_identificacion» puede resultar facturable. Por eso este
 * veredicto NO se escribe en la base: sólo se cuenta en el informe.
 */
function diagnosticoDelPayload(payload: Record<string, unknown>) {
  const cliente = (payload.customer || {}) as Record<string, unknown>;
  const email = texto(cliente.email) || texto(payload.email);
  const contacto = mapShopifyToAlegraContact(payload as never, email, {});
  const lineas = Array.isArray(payload.line_items) ? (payload.line_items as Array<Record<string, unknown>>) : [];
  return preflightDeFacturacion({
    identificacion: contacto.identification,
    nombreCliente: contacto.name,
    email,
    moneda: texto(payload.currency),
    total: (payload.total_price as string | number | null) ?? null,
    lineas: lineas.map((li) => ({ alegraItemId: "pendiente", nombre: texto(li.title) })),
  });
}

async function main() {
  const opciones = opcionesSchema.parse({
    limite: leerOpcion("limite"),
    tienda: leerOpcion("tienda"),
  });

  await runWithOrg(orgId, async () => {
    const pool = getPool();

    // Un pedido puede tener varios webhooks (create + updated + paid). Se toma
    // UNO por pedido, prefiriendo el que trae la información más completa.
    const { rows } = await pool.query(
      `
      WITH eventos AS (
        SELECT we.id,
               we.payload_json->>'id' AS order_id,
               COALESCE(we.payload_json->>'__shopDomain', '') AS shop_domain,
               we.payload_json,
               we.received_at,
               we.event_type
        FROM webhook_events we
        WHERE we.organization_id = $1
          AND we.source = 'shopify'
          AND we.event_type IN ('orders/create', 'orders/updated', 'orders/paid')
          AND we.status IN ('pending', 'failed')
          AND we.payload_json->>'id' IS NOT NULL
      ),
      huerfanos AS (
        SELECT e.*, count(*) OVER (PARTITION BY e.order_id) AS eventos
        FROM eventos e
        LEFT JOIN orders o
               ON o.organization_id = $1
              AND o.shopify_order_id = e.order_id
        WHERE o.shopify_order_id IS NULL
      )
      SELECT DISTINCT ON (order_id) order_id, shop_domain, payload_json, eventos
      FROM huerfanos
      WHERE ($2::text IS NULL OR shop_domain = $2::text)
      ORDER BY order_id,
               (event_type = 'orders/paid') DESC,
               (event_type = 'orders/create') DESC,
               received_at DESC
      LIMIT $3
      `,
      [orgId, opciones.tienda || null, opciones.limite]
    );

    if (!rows.length) {
      console.log("No hay pedidos perdidos: todos los webhooks de pedido tienen su fila en la plataforma.");
      return;
    }

    console.log(
      `${rows.length} pedido(s) llegaron por webhook y NO están en la plataforma.` +
        (APLICAR ? " Registrándolos…" : " Modo informe: no se escribe nada. Use --aplicar para registrarlos.")
    );

    const resumen = { registrados: 0, facturables: 0, bloqueados: 0, descartados: 0 };
    const porMotivo = new Map<string, number>();

    for (const cruda of rows) {
      const parsed = filaSchema.safeParse(cruda);
      if (!parsed.success) {
        resumen.descartados += 1;
        console.error(`  ! webhook ilegible (pedido ${String(cruda?.order_id)}): ${parsed.error.issues[0]?.message}`);
        continue;
      }
      const fila: Fila = parsed.data;
      const payload = fila.payload_json;
      const meta = buildOrderMetaFromPayload(payload as never);
      const veredicto = diagnosticoDelPayload(payload);

      for (const bloqueo of veredicto.bloqueos) {
        porMotivo.set(bloqueo.codigo, (porMotivo.get(bloqueo.codigo) || 0) + 1);
      }
      if (veredicto.facturable) resumen.facturables += 1;
      else resumen.bloqueados += 1;

      const etiqueta = `${meta.orderNumber || fila.order_id} (${fila.shop_domain}, ${fila.eventos} webhook(s))`;
      if (!APLICAR) {
        console.log(
          `  · ${etiqueta} → ${veredicto.facturable ? "facturable" : `BLOQUEADO: ${veredicto.bloqueos.map((b: { codigo: string }) => b.codigo).join(", ")}`}`
        );
        continue;
      }

      try {
        await upsertOrder({
          shopDomain: fila.shop_domain,
          shopifyId: fila.order_id,
          orderNumber: meta.orderNumber,
          customerName: meta.customerName,
          customerEmail: meta.customerEmail,
          productsSummary: meta.productsSummary,
          processedAt: meta.processedAt,
          status: texto(payload.financial_status) || null,
          total: Number(payload.total_price) || null,
          currency: texto(payload.currency) || null,
        });
        // NO se marca `no_facturable` aquí. El veredicto definitivo lo da el
        // motor, que sí puede consultar si el cliente ya existe en Alegra con
        // su cédula. El pedido queda `pending`: entró, y está a la espera de
        // que alguien decida o de que los workers lo evalúen.
        resumen.registrados += 1;
        console.log(`  ✓ ${etiqueta}`);
      } catch (error) {
        resumen.descartados += 1;
        console.error(`  ✗ ${etiqueta}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log("");
    console.log(`Pedidos encontrados: ${rows.length}`);
    if (APLICAR) console.log(`  registrados en la plataforma: ${resumen.registrados}`);
    console.log(`  cumplen requisitos para facturar: ${resumen.facturables}`);
    console.log(`  bloqueados (falta un dato obligatorio): ${resumen.bloqueados}`);
    if (resumen.descartados) console.log(`  no se pudieron procesar: ${resumen.descartados}`);
    if (porMotivo.size) {
      console.log("  motivos de bloqueo:");
      for (const [codigo, n] of [...porMotivo].sort((a, b) => b[1] - a[1])) {
        console.log(`    ${codigo}: ${n}`);
      }
    }
    console.log("");
    console.log("Ningún pedido se facturó: eso lo decide una persona o las reglas de los workers.");
    console.log(
      "El recuento de bloqueos es orientativo: no se consultó Alegra, y un cliente ya dado de alta allí" +
        " puede aportar la cédula que falta en el pedido."
    );
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
