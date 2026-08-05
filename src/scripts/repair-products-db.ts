/**
 * REPARA la tabla `products` de ApiFlujos (PRODUCCIÓN) dejándola con los datos
 * ORIGINALES desde la copia local pre-daño (restore-from-local.data.json):
 * nombre (con prefijo), reference/EAN, y el arreglo de precios (todas las listas)
 * dentro de payload_json.
 *
 * El sync corrompió products.name, products.reference y el payload. Este script
 * los devuelve. Idempotente: solo actualiza las filas que difieren. NO borra ni
 * crea filas (no duplica). NO toca inventario ni sku/barcode (se dejan como están,
 * los refresca el sync normal).
 *
 * DRY-RUN por defecto (solo cuenta cuántas filas cambiarían). Aplicar: --apply --yes
 *
 * Uso:
 *   node dist/src/scripts/repair-products-db.js                 # dry-run (cuenta)
 *   node dist/src/scripts/repair-products-db.js --apply --yes   # aplica
 *   node dist/src/scripts/repair-products-db.js --apply --yes --limit=50
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { runWithOrg, getPool, getOrgId } from "../db";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const getVal = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};
const LIMIT = getVal("limit") != null ? Number(getVal("limit")) : Infinity;
const DO_APPLY = has("--apply");
const CONFIRMED = has("--yes");
const orgId = Number(process.env.APP_ORG_ID || 1);

type PriceEntry = { idPriceList?: string | number; price?: number | string };
type LocalItem = { id: string; name?: string | null; reference?: string | null; price?: PriceEntry[] | null };

async function main() {
  const candidates = [
    join(process.cwd(), "src/scripts/restore-from-local.data.json"),
    join(__dirname, "restore-from-local.data.json"),
  ];
  let raw = "";
  for (const p of candidates) {
    try {
      raw = readFileSync(p, "utf8");
      break;
    } catch {
      /* next */
    }
  }
  if (!raw) {
    console.error("No se encontró restore-from-local.data.json.");
    process.exit(1);
  }
  const all = (JSON.parse(raw) as LocalItem[]).filter((it) => it && it.id);
  const objetivo = all.slice(0, Number.isFinite(LIMIT) ? LIMIT : all.length);

  await runWithOrg(orgId, async () => {
    const pool = getPool();
    const org = getOrgId();

    console.log(`Reparando products (org=${org}) desde copia local: ${all.length} ítems`);
    console.log(`Modo: ${DO_APPLY ? (CONFIRMED ? "APLICAR" : "APLICAR (falta --yes)") : "DRY-RUN"}`);
    if (Number.isFinite(LIMIT)) console.log(`Límite: ${LIMIT}`);
    console.log("");

    let rowsChanged = 0;
    let itemsTouched = 0;
    const fallidos: Array<{ id: string; detail: string }> = [];

    for (let i = 0; i < objetivo.length; i += 1) {
      const it = objetivo[i];
      const name = it.name ?? null;
      const reference = it.reference ?? null;
      const priceJson = JSON.stringify(Array.isArray(it.price) ? it.price : []);
      // Solo filas que difieren en nombre, reference o el price del payload.
      const where =
        `organization_id = $1 AND alegra_item_id = $2 AND (` +
        `name IS DISTINCT FROM $3 OR reference IS DISTINCT FROM $4 OR ` +
        `COALESCE(payload_json->'price','null'::jsonb) IS DISTINCT FROM $5::jsonb)`;
      try {
        if (!DO_APPLY || !CONFIRMED) {
          const r = await pool.query<{ c: string }>(
            `SELECT count(*)::text c FROM products WHERE ${where}`,
            [org, it.id, name, reference, priceJson]
          );
          const c = Number(r.rows[0]?.c || 0);
          if (c > 0) {
            itemsTouched += 1;
            rowsChanged += c;
            if (itemsTouched <= 15) console.log(`  [dry] #${it.id} ${String(name).slice(0, 32)} (${c} fila/s)`);
          }
        } else {
          const r = await pool.query(
            `UPDATE products SET
               name = $3,
               reference = $4,
               payload_json = jsonb_set(
                 jsonb_set(
                   jsonb_set(COALESCE(payload_json, '{}'::jsonb), '{name}', to_jsonb($3::text)),
                   '{reference}', to_jsonb($4::text)
                 ),
                 '{price}', $5::jsonb
               ),
               updated_at = NOW()
             WHERE ${where}`,
            [org, it.id, name, reference, priceJson]
          );
          const c = r.rowCount || 0;
          if (c > 0) {
            itemsTouched += 1;
            rowsChanged += c;
            if (itemsTouched % 200 === 0) console.log(`  ...${itemsTouched} ítems (${rowsChanged} filas)`);
          }
        }
      } catch (error) {
        fallidos.push({ id: it.id, detail: (error as Error).message.slice(0, 140) });
      }
    }

    console.log("");
    console.log("========== RESULTADO ==========");
    console.log(`Ítems que ${DO_APPLY && CONFIRMED ? "se repararon" : "cambiarían"}: ${itemsTouched}`);
    console.log(`Filas ${DO_APPLY && CONFIRMED ? "actualizadas" : "a actualizar"}: ${rowsChanged}`);
    if (!DO_APPLY || !CONFIRMED) console.log(`(DRY-RUN: no se escribió nada. Aplicar: --apply --yes)`);
    console.log(`Fallidos: ${fallidos.length}`);
    fallidos.slice(0, 10).forEach((f) => console.log(`  #${f.id} | ${f.detail}`));
    console.log("===============================");
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
