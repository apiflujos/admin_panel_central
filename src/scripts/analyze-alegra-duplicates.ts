/**
 * Analiza los productos DUPLICADOS consultando ALEGRA directamente por API.
 *
 * Regla (confirmada con el cliente):
 *   - DUPLICADO  = descripción LARGA (texto de marketing, > umbral).
 *   - CORRECTO   = descripción CORTA (= una marca, p.ej. "Vogue", "Igora").
 *
 * El inventario SOLO es confiable desde Alegra, así que se lee de la respuesta
 * del API (item.inventory.availableQuantity), NO de la BD local. Los duplicados
 * CON inventario NO deben borrarse.
 *
 * Este script NO borra nada — solo cuenta y reporta:
 *   - total de ítems en Alegra
 *   - duplicados (descripción larga)
 *   - duplicados CON inventario (no borrar)
 *   - duplicados SIN inventario (borrables)
 *
 * Uso (necesita DATABASE_URL + CRYPTO_KEY_BASE64 para resolver la cuenta Alegra):
 *   ts-node-dev --transpile-only src/scripts/analyze-alegra-duplicates.ts --store-id=3
 *   node dist/src/scripts/analyze-alegra-duplicates.js --store-id=3 --min-desc=30 --csv
 */
import "dotenv/config";
import { runWithOrg } from "../db";
import { resolveAlegraClientForStore } from "../services/alegra-product-import.service";

const args = process.argv.slice(2);
const getVal = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};
const storeIdArg = getVal("store-id");
const storeId = storeIdArg != null ? Number(storeIdArg) : null;
const MIN_DESC = getVal("min-desc") != null ? Number(getVal("min-desc")) : 30;
const CSV = args.includes("--csv");
const orgId = Number(process.env.APP_ORG_ID || 1);

type AlegraItem = {
  id?: string | number;
  name?: string;
  reference?: string;
  description?: string;
  inventory?: { availableQuantity?: number | string; unit?: string } | null;
};

const availableQty = (item: AlegraItem): number => {
  const q = item.inventory?.availableQuantity;
  const n = typeof q === "number" ? q : Number(q);
  return Number.isFinite(n) ? n : 0;
};

async function main() {
  if (storeId == null || !Number.isFinite(storeId)) {
    console.error("Falta --store-id=<n> (la tienda cuya cuenta Alegra se consulta).");
    process.exit(1);
  }

  await runWithOrg(orgId, async () => {
    const alegra = await resolveAlegraClientForStore(storeId);
    console.log(`Consultando Alegra para store_id=${storeId} (org=${orgId})…`);
    console.log(`Regla: descripción > ${MIN_DESC} chars = DUPLICADO; <= ${MIN_DESC} = correcto (marca).`);
    console.log("");

    const pageSize = 30;
    let start = 0;
    let total = 0;
    let duplicados = 0;
    let dupConInventario = 0;
    let dupSinInventario = 0;
    const dupsBorrables: Array<{ id: string; name: string; ref: string; len: number; qty: number }> = [];

    for (;;) {
      const batch = (await alegra.listItems({ limit: pageSize, start })) as AlegraItem[] | null;
      const items = Array.isArray(batch) ? batch : [];
      if (!items.length) break;

      for (const item of items) {
        total += 1;
        const desc = String(item.description || "");
        const isDup = desc.length > MIN_DESC;
        if (!isDup) continue;
        duplicados += 1;
        const qty = availableQty(item);
        if (qty > 0) {
          dupConInventario += 1;
        } else {
          dupSinInventario += 1;
          dupsBorrables.push({
            id: String(item.id ?? ""),
            name: String(item.name || "").slice(0, 45),
            ref: String(item.reference || ""),
            len: desc.length,
            qty,
          });
        }
      }

      if (items.length < pageSize) break;
      start += items.length;
      if (total % 300 === 0) console.log(`  …escaneados ${total}`);
    }

    console.log("");
    console.log("========== RESULTADO (desde Alegra) ==========");
    console.log(`Total ítems en Alegra:            ${total}`);
    console.log(`Duplicados (descripción larga):   ${duplicados}`);
    console.log(`  · CON inventario (NO borrar):   ${dupConInventario}`);
    console.log(`  · SIN inventario (borrables):   ${dupSinInventario}`);
    console.log("==============================================");

    if (CSV) {
      console.log("");
      console.log("id,name,reference,desc_len,available_qty");
      dupsBorrables.forEach((d) => console.log(`${d.id},"${d.name}",${d.ref},${d.len},${d.qty}`));
    } else if (dupsBorrables.length) {
      console.log("");
      console.log("Muestra de duplicados SIN inventario (borrables, hasta 20):");
      dupsBorrables.slice(0, 20).forEach((d) => console.log(`  #${d.id} | ${d.name} | ref=${d.ref} | len=${d.len}`));
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
