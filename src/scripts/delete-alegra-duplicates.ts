/**
 * Borra en ALEGRA los productos DUPLICADOS (los que se duplicaron con la
 * descripción de marketing de Shopify, sin la marca).
 *
 * Reglas de seguridad (confirmadas con el cliente):
 *   - DUPLICADO           = descripción LARGA (> umbral). CORRECTO = descripción
 *                           corta (una marca, p.ej. "Vogue").
 *   - SOLO se borra lo NUNCA VENDIDO. "Vendido" (stock comprometido) se detecta
 *     porque availableQuantity < initialQuantity (hubo salidas). Esos NO se tocan.
 *   - DRY-RUN por defecto: cuenta y lista, no borra. Para borrar: --delete --yes.
 *   - --limit=<n>: procesa solo los primeros n (para probar un lote chico).
 *   - El borrado en Alegra es IRREVERSIBLE. El CSV de auditoría es el respaldo.
 *
 * Uso:
 *   node dist/src/scripts/delete-alegra-duplicates.js --store-id=2                 # dry-run
 *   node dist/src/scripts/delete-alegra-duplicates.js --store-id=2 --delete --yes --limit=5   # test 5
 *   node dist/src/scripts/delete-alegra-duplicates.js --store-id=2 --delete --yes             # todos
 */
import "dotenv/config";
import { runWithOrg } from "../db";
import { resolveAlegraClientForStore } from "../services/alegra-product-import.service";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const getVal = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};
const storeIdArg = getVal("store-id");
const storeId = storeIdArg != null ? Number(storeIdArg) : null;
const MIN_DESC = getVal("min-desc") != null ? Number(getVal("min-desc")) : 30;
const LIMIT = getVal("limit") != null ? Number(getVal("limit")) : Infinity;
const DO_DELETE = has("--delete");
const CONFIRMED = has("--yes");
const orgId = Number(process.env.APP_ORG_ID || 1);

type AlegraItem = {
  id?: string | number;
  name?: string;
  reference?: string;
  description?: string;
  inventory?: { availableQuantity?: number | string; initialQuantity?: number | string } | null;
};

const num = (q: unknown): number => {
  const n = typeof q === "number" ? q : Number(q);
  return Number.isFinite(n) ? n : 0;
};
const isSold = (it: AlegraItem): boolean => num(it.inventory?.availableQuantity) < num(it.inventory?.initialQuantity);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(
  alegra: { listItems: (o: { limit: number; start: number }) => Promise<unknown> },
  start: number,
  pageSize: number
): Promise<AlegraItem[]> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const batch = (await alegra.listItems({ limit: pageSize, start })) as AlegraItem[] | null;
      return Array.isArray(batch) ? batch : [];
    } catch (error) {
      const wait = 1000 * 2 ** attempt;
      console.log(`  retry start=${start} intento=${attempt + 1} (${(error as Error).message}) esperando ${wait}ms`);
      await sleep(wait);
    }
  }
  throw new Error(`Fallo persistente al leer Alegra en start=${start}`);
}

async function main() {
  if (storeId == null || !Number.isFinite(storeId)) {
    console.error("Falta --store-id=<n> (la tienda cuya cuenta Alegra se consulta).");
    process.exit(1);
  }

  await runWithOrg(orgId, async () => {
    const alegra = await resolveAlegraClientForStore(storeId);
    console.log(`Alegra store_id=${storeId} (org=${orgId})`);
    console.log(`Regla: descripción > ${MIN_DESC} = duplicado; se borra SOLO lo nunca vendido.`);
    console.log(`Modo: ${DO_DELETE ? (CONFIRMED ? "BORRAR" : "BORRAR (falta --yes)") : "DRY-RUN"}`);
    if (Number.isFinite(LIMIT)) console.log(`Límite: ${LIMIT} ítems`);
    console.log("");

    // 1) Escanear y recolectar borrables (duplicado + nunca vendido).
    const pageSize = 30;
    let start = 0;
    let total = 0;
    let dupTotal = 0;
    let vendidosExcluidos = 0;
    const borrables: Array<{ id: string; name: string; ini: number; avail: number }> = [];

    for (;;) {
      const items = await fetchPage(alegra, start, pageSize);
      if (!items.length) break;
      for (const item of items) {
        total += 1;
        const desc = String(item.description || "");
        if (desc.length <= MIN_DESC) continue; // no es duplicado
        dupTotal += 1;
        if (isSold(item)) {
          vendidosExcluidos += 1;
          console.log(`  · EXCLUIDO (vendido) #${item.id} ${String(item.name || "").slice(0, 45)}`);
          continue;
        }
        borrables.push({
          id: String(item.id ?? ""),
          name: String(item.name || ""),
          ini: num(item.inventory?.initialQuantity),
          avail: num(item.inventory?.availableQuantity),
        });
      }
      if (items.length < pageSize) break;
      start += items.length;
      if (total % 600 === 0) console.log(`  …escaneados ${total}`);
    }

    const objetivo = borrables.slice(0, Number.isFinite(LIMIT) ? LIMIT : borrables.length);
    console.log("");
    console.log("========== PLAN DE BORRADO ==========");
    console.log(`Total ítems Alegra:            ${total}`);
    console.log(`Duplicados:                    ${dupTotal}`);
    console.log(`  · vendidos (excluidos):      ${vendidosExcluidos}`);
    console.log(`  · nunca vendidos (borrables): ${borrables.length}`);
    console.log(`A borrar en esta corrida:      ${objetivo.length}`);
    console.log("=====================================");
    console.log("");

    if (!DO_DELETE || !CONFIRMED) {
      console.log("Muestra (hasta 15):");
      objetivo
        .slice(0, 15)
        .forEach((d) => console.log(`  #${d.id} | ${d.name.slice(0, 50)} | ini=${d.ini} disp=${d.avail}`));
      console.log("");
      console.log(
        DO_DELETE ? "Falta --yes para confirmar el borrado." : "DRY-RUN: no se borró nada. Para borrar: --delete --yes"
      );
      return;
    }

    // 2) Borrar uno a uno, capturando el error real de Alegra por ítem.
    let ok = 0;
    const fallidos: Array<{ id: string; name: string; status?: number; detail?: string }> = [];
    for (let i = 0; i < objetivo.length; i += 1) {
      const it = objetivo[i];
      try {
        await alegra.deleteItem(it.id);
        ok += 1;
        if (ok % 50 === 0 || i === objetivo.length - 1) console.log(`  borrados ${ok}/${objetivo.length}`);
      } catch (error) {
        const e = error as Error & { status?: number; detail?: string };
        fallidos.push({
          id: it.id,
          name: it.name,
          status: e.status,
          detail: (e.detail || e.message || "").slice(0, 160),
        });
        console.log(
          `  ✗ FALLÓ #${it.id} (${e.status || "?"}) ${it.name.slice(0, 40)}: ${(e.detail || e.message || "").slice(0, 120)}`
        );
      }
      await sleep(120); // respetar rate-limit de Alegra
    }

    console.log("");
    console.log("========== RESULTADO ==========");
    console.log(`Borrados OK:  ${ok}`);
    console.log(`Fallidos:     ${fallidos.length}`);
    if (fallidos.length) {
      console.log("Fallidos (id | status | detalle):");
      fallidos.forEach((f) => console.log(`  #${f.id} | ${f.status || "?"} | ${f.detail}`));
    }
    console.log("===============================");
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
