/**
 * RESTAURA en Alegra el estado ORIGINAL de los ítems desde la copia LOCAL de la
 * base de datos (products.payload_json del entorno local, 22-23 jul), que la
 * integración NUNCA tocó y conserva: nombre original (con prefijo), EAN, y el
 * ARREGLO COMPLETO de listas de precio (General, Mayoristas, Caribe, etc.).
 *
 * El sync (y un revert anterior que escribió `price` como número) colapsó las
 * listas de muchos ítems a solo "General". Este script las devuelve enviando el
 * arreglo completo `price: [{idPriceList, price}, ...]` — así NO colapsa, restaura.
 *
 * SEGURIDAD: solo procesa ítems que en la copia local tienen MÁS DE UNA lista de
 * precio. Eso garantiza que en local NO estaban colapsados/corruptos (el sync
 * colapsa a 1 lista), así que su nombre/EAN/precios locales son limpios. Los de
 * 1 sola lista se dejan para los otros reverts (facturas/Shopify), para no
 * arriesgar a re-corromper un nombre.
 *
 * Idempotente: lee cada ítem en Alegra y escribe SOLO lo que difiere. DRY-RUN por
 * defecto. Aplicar: --apply --yes.  Campos: --fields=name,reference,price (default todos).
 *
 * Uso:
 *   node dist/src/scripts/restore-from-local.js --store-id=1
 *   node dist/src/scripts/restore-from-local.js --store-id=1 --limit=5
 *   node dist/src/scripts/restore-from-local.js --store-id=1 --apply --yes --limit=5
 *   node dist/src/scripts/restore-from-local.js --store-id=1 --apply --yes
 *   node dist/src/scripts/restore-from-local.js --store-id=1 --fields=price --apply --yes   # solo listas
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { runWithOrg } from "../db";
import { resolveAlegraClientForStore } from "../services/alegra-product-import.service";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const getVal = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};
const storeId = getVal("store-id") != null ? Number(getVal("store-id")) : null;
const LIMIT = getVal("limit") != null ? Number(getVal("limit")) : Infinity;
const fieldsArg = (getVal("fields") || "name,reference,price").split(",").map((s) => s.trim());
const wantName = fieldsArg.includes("name");
const wantRef = fieldsArg.includes("reference");
const wantPrice = fieldsArg.includes("price");
const DO_APPLY = has("--apply");
const CONFIRMED = has("--yes");
const orgId = Number(process.env.APP_ORG_ID || 1);

type PriceEntry = { idPriceList?: string | number; price?: number | string };
type LocalItem = { id: string; name?: string | null; reference?: string | null; price?: PriceEntry[] | null };
type AlegraItem = { id?: string | number; name?: string; reference?: string; price?: unknown };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function priceMap(arr: unknown): Map<string, number> {
  const m = new Map<string, number>();
  if (Array.isArray(arr)) {
    for (const p of arr as PriceEntry[]) {
      const id = String(p?.idPriceList ?? "");
      const val = Number(p?.price);
      if (id && Number.isFinite(val)) m.set(id, val);
    }
  }
  return m;
}
function samePrices(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w == null || Math.abs(w - v) > 0.5) return false;
  }
  return true;
}

async function main() {
  if (storeId == null || !Number.isFinite(storeId)) {
    console.error("Falta --store-id=<n> (Becam = 1).");
    process.exit(1);
  }
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
    console.error("No se encontró restore-from-local.data.json. Rutas:\n  " + candidates.join("\n  "));
    process.exit(1);
  }
  const all = JSON.parse(raw) as LocalItem[];
  // La copia local es del 22-23 jul, ANTES del inicio del daño (24-jul, confirmado en
  // sync_logs), así que TODOS sus ítems son pre-daño (limpios). Por defecto se procesan
  // todos; con --multilist-only se limita a los que tienen >1 lista (modo conservador).
  const multilistOnly = has("--multilist-only");
  const clean = multilistOnly
    ? all.filter((it) => Array.isArray(it.price) && it.price.length > 1)
    : all.filter((it) => it && it.id);

  await runWithOrg(orgId, async () => {
    const alegra = await resolveAlegraClientForStore(storeId);
    console.log(`Alegra store_id=${storeId} (org=${orgId})`);
    console.log(
      `Ítems en data local: ${all.length} | a procesar: ${clean.length}${multilistOnly ? " (solo >1 lista)" : " (todos, copia pre-daño)"}`
    );
    console.log(`Campos: ${["name", "reference", "price"].filter((f) => fieldsArg.includes(f)).join(", ")}`);
    console.log(`Modo: ${DO_APPLY ? (CONFIRMED ? "APLICAR" : "APLICAR (falta --yes)") : "DRY-RUN"}`);
    if (Number.isFinite(LIMIT)) console.log(`Límite: ${LIMIT}`);
    console.log("");

    const objetivo = clean.slice(0, Number.isFinite(LIMIT) ? LIMIT : clean.length);
    let updated = 0;
    let noDiff = 0;
    const fallidos: Array<{ id: string; detail: string }> = [];

    for (let i = 0; i < objetivo.length; i += 1) {
      const it = objetivo[i];
      try {
        const cur = (await alegra.getItem(it.id)) as AlegraItem;
        const payload: Record<string, unknown> = {};

        if (wantName && it.name && String(cur.name ?? "") !== String(it.name)) payload.name = it.name;
        if (wantRef && it.reference && String(cur.reference ?? "") !== String(it.reference)) {
          payload.reference = String(it.reference);
        }
        if (wantPrice && Array.isArray(it.price)) {
          const localM = priceMap(it.price);
          const curM = priceMap(cur.price);
          if (!samePrices(localM, curM)) {
            payload.price = it.price.map((p) => ({ idPriceList: p.idPriceList, price: Number(p.price) }));
          }
        }

        if (Object.keys(payload).length === 0) {
          noDiff += 1;
          continue;
        }

        const parts: string[] = [];
        if (payload.name) parts.push(`name`);
        if (payload.reference) parts.push(`ref->${payload.reference}`);
        if (payload.price) parts.push(`price(${(payload.price as unknown[]).length} listas)`);

        if (!DO_APPLY || !CONFIRMED) {
          console.log(`  [dry] #${it.id} ${String(cur.name || "").slice(0, 30)} | ${parts.join(", ")}`);
          continue;
        }
        await alegra.updateItem(it.id, payload);
        updated += 1;
        if (updated % 25 === 0 || i === objetivo.length - 1) console.log(`  aplicados ${updated}/${objetivo.length}`);
        await sleep(150);
      } catch (error) {
        const e = error as Error & { detail?: string };
        fallidos.push({ id: it.id, detail: (e.detail || e.message || "").slice(0, 140) });
        console.log(`  ✗ FALLÓ #${it.id}: ${(e.detail || e.message || "").slice(0, 110)}`);
        await sleep(200);
      }
    }

    console.log("");
    console.log("========== RESULTADO ==========");
    console.log(`Objetivo:            ${objetivo.length}`);
    if (DO_APPLY && CONFIRMED) console.log(`Restaurados:         ${updated}`);
    else console.log(`(DRY-RUN: no se escribió nada. Aplicar: --apply --yes)`);
    console.log(`Sin cambios (ya OK): ${noDiff}`);
    console.log(`Fallidos:            ${fallidos.length}`);
    fallidos.forEach((f) => console.log(`  #${f.id} | ${f.detail}`));
    console.log("===============================");
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
