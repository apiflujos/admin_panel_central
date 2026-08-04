/**
 * REVIERTE en Alegra los campos (nombre / referencia-EAN / precio) que el sync
 * automático Shopify->Alegra sobreescribió, dejándolos como estaban ANTES del
 * daño.
 *
 * FUENTE LIMPIA = LAS FACTURAS (alegra_invoices.payload_json->'items'). Cada
 * línea de factura guarda, inmutable, el ítem tal como estaba al momento de la
 * venta: { id, name, reference(EAN), price(neto) }. Tomamos, por ítem, la última
 * factura ANTES del corte (--cutoff), que es data pre-daño y confiable.
 *
 * El sync (webhook products/update, updateInAlegra) escribía { name: título
 * Shopify, reference: SKU, price: precio Shopify con IVA }. Efectos: EAN pisado
 * por el SKU, nombre sin prefijos, y precio inflado ~19% (el precio de Shopify ya
 * trae IVA y se guardó en el precio base neto). El sync ya quedó apagado
 * (sync.products.updateInAlegra=false).
 *
 * Idempotente: lee cada ítem y escribe SOLO los campos que hoy difieren del
 * original. DRY-RUN por defecto. Para aplicar: --apply --yes
 *
 * Uso:
 *   node dist/src/scripts/revert-alegra-fields.js --store-id=1 --cutoff=2026-07-18            # dry-run
 *   node dist/src/scripts/revert-alegra-fields.js --store-id=1 --cutoff=2026-07-18 --limit=5  # dry-run 5
 *   node dist/src/scripts/revert-alegra-fields.js --store-id=1 --cutoff=2026-07-18 --apply --yes --limit=5
 *   node dist/src/scripts/revert-alegra-fields.js --store-id=1 --cutoff=2026-07-18 --apply --yes
 *
 * --cutoff=YYYY-MM-DD  : solo usa facturas con fecha < cutoff (data pre-daño).
 *                        Ajusta según cuándo empezó el sync a escribir.
 * --fields=name,reference,price : qué campos revertir (default: los tres).
 */
import "dotenv/config";
import { runWithOrg, getPool, getOrgId } from "../db";
import { resolveAlegraClientForStore } from "../services/alegra-product-import.service";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const getVal = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};
const storeId = getVal("store-id") != null ? Number(getVal("store-id")) : null;
const cutoff = getVal("cutoff"); // YYYY-MM-DD
const LIMIT = getVal("limit") != null ? Number(getVal("limit")) : Infinity;
const fieldsArg = (getVal("fields") || "name,reference,price").split(",").map((s) => s.trim());
const wantName = fieldsArg.includes("name");
const wantRef = fieldsArg.includes("reference");
const wantPrice = fieldsArg.includes("price");
const DO_APPLY = has("--apply");
const CONFIRMED = has("--yes");
const orgId = Number(process.env.APP_ORG_ID || 1);

type Orig = { id: string; name: string | null; reference: string | null; price: string | null };
type AlegraItem = { id?: string | number; name?: string; reference?: string; price?: unknown };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function currentPrice(it: AlegraItem): number | null {
  const p = it.price as unknown;
  if (Array.isArray(p)) {
    const n = Number((p[0] as { price?: unknown } | undefined)?.price);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(p);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  if (storeId == null || !Number.isFinite(storeId)) {
    console.error("Falta --store-id=<n> (Becam = 1).");
    process.exit(1);
  }
  if (!cutoff || !/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) {
    console.error("Falta --cutoff=YYYY-MM-DD (solo facturas antes de esa fecha = data pre-daño).");
    process.exit(1);
  }

  await runWithOrg(orgId, async () => {
    const pool = getPool();
    const org = getOrgId();
    const alegra = await resolveAlegraClientForStore(storeId);

    // Mapa ORIGINAL desde facturas pre-corte: por ítem, la última factura < cutoff.
    const res = await pool.query<Orig>(
      `
      SELECT DISTINCT ON (li->>'id')
        li->>'id'        AS id,
        li->>'name'      AS name,
        li->>'reference' AS reference,
        li->>'price'     AS price
      FROM alegra_invoices inv,
           jsonb_array_elements(inv.payload_json->'items') li
      WHERE inv.organization_id = $1
        AND inv.date < $2::date
        AND (li->>'id') IS NOT NULL
      ORDER BY li->>'id', inv.date DESC
      `,
      [org, cutoff]
    );
    const originals = res.rows;

    console.log(`Alegra store_id=${storeId} (org=${org})`);
    console.log(`Facturas usadas: fecha < ${cutoff}`);
    console.log(`Ítems con original recuperado de facturas: ${originals.length}`);
    console.log(`Campos a revertir: ${fieldsArg.filter((f) => ["name", "reference", "price"].includes(f)).join(", ")}`);
    console.log(`Modo: ${DO_APPLY ? (CONFIRMED ? "APLICAR" : "APLICAR (falta --yes)") : "DRY-RUN"}`);
    if (Number.isFinite(LIMIT)) console.log(`Límite: ${LIMIT}`);
    console.log("");

    const objetivo = originals.slice(0, Number.isFinite(LIMIT) ? LIMIT : originals.length);
    let updated = 0;
    let skippedNoDiff = 0;
    const fallidos: Array<{ id: string; detail: string }> = [];

    for (let i = 0; i < objetivo.length; i += 1) {
      const o = objetivo[i];
      try {
        const cur = (await alegra.getItem(o.id)) as AlegraItem;
        const payload: Record<string, unknown> = {};

        if (wantName && o.name && String(cur.name ?? "") !== String(o.name)) {
          payload.name = o.name;
        }
        if (wantRef && o.reference && String(cur.reference ?? "") !== String(o.reference)) {
          payload.reference = String(o.reference);
        }
        if (wantPrice && o.price != null && o.price !== "") {
          const target = Number(o.price);
          const cp = currentPrice(cur);
          if (Number.isFinite(target) && target > 0 && (cp == null || Math.abs(cp - target) > 0.5)) {
            payload.price = target;
          }
        }

        if (Object.keys(payload).length === 0) {
          skippedNoDiff += 1;
          continue;
        }

        if (!DO_APPLY || !CONFIRMED) {
          console.log(
            `  [dry] #${o.id} ${String(cur.name || "").slice(0, 30)}` +
              (payload.name ? ` | name->"${String(payload.name).slice(0, 30)}"` : "") +
              (payload.reference ? ` | ref:${cur.reference}->${payload.reference}` : "") +
              (payload.price != null ? ` | price:${currentPrice(cur)}->${payload.price}` : "")
          );
        } else {
          await alegra.updateItem(o.id, payload);
          updated += 1;
          if (updated % 25 === 0 || i === objetivo.length - 1) console.log(`  aplicados ${updated}/${objetivo.length}`);
          await sleep(150);
        }
      } catch (error) {
        const e = error as Error & { status?: number; detail?: string };
        fallidos.push({ id: o.id, detail: (e.detail || e.message || "").slice(0, 160) });
        console.log(`  ✗ FALLÓ #${o.id}: ${(e.detail || e.message || "").slice(0, 120)}`);
        await sleep(200);
      }
    }

    console.log("");
    console.log("========== RESULTADO ==========");
    console.log(`Objetivo:              ${objetivo.length}`);
    if (DO_APPLY && CONFIRMED) console.log(`Revertidos:            ${updated}`);
    else console.log(`(DRY-RUN: no se escribió nada. Aplicar: --apply --yes)`);
    console.log(`Sin cambios (ya OK):   ${skippedNoDiff}`);
    console.log(`Fallidos:              ${fallidos.length}`);
    fallidos.forEach((f) => console.log(`  #${f.id} | ${f.detail}`));
    console.log("===============================");
    console.log("");
    console.log("NOTA: esto cubre ítems que se VENDIERON antes del corte (están en facturas).");
    console.log("Ítems nunca vendidos no salen de aquí; para esos se revisa aparte.");
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
