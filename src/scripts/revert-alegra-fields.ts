/**
 * REVIERTE en Alegra los campos (nombre / referencia / precio) que el sync
 * automático Shopify->Alegra sobreescribió el 2026-08-03, dejándolos como
 * estaban en el snapshot "antes" (TOMAPEDIDOS_PRODUCTOS.xlsx).
 *
 * Contexto: el sync (webhook products/update, flag updateInAlegra) escribía en
 * cada ítem { name: titulo Shopify, reference: SKU Shopify, price: precio Shopify }.
 * Efectos: (a) la referencia/EAN quedó pisada por el SKU; (b) el nombre perdió
 * los prefijos de Alegra; (c) el precio quedó inflado ~19% porque el precio de
 * Shopify YA incluye IVA y se guardó en el precio base (neto) de Alegra.
 * El sync ya quedó apagado (sync.products.updateInAlegra=false).
 *
 * Este script SOLO revierte a los valores originales del snapshot. Es idempotente:
 * lee cada ítem, y escribe únicamente los campos que hoy difieren del original.
 * Los ítems con precio=0 en el snapshot NO llevan 'price' (no se toca su precio).
 *
 * DRY-RUN por defecto. Para aplicar:  --apply --yes
 *
 * Uso:
 *   node dist/src/scripts/revert-alegra-fields.js --store-id=1               # dry-run
 *   node dist/src/scripts/revert-alegra-fields.js --store-id=1 --limit=5     # dry-run 5
 *   node dist/src/scripts/revert-alegra-fields.js --store-id=1 --apply --yes --limit=5  # aplica 5
 *   node dist/src/scripts/revert-alegra-fields.js --store-id=1 --apply --yes            # aplica todos
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
const DO_APPLY = has("--apply");
const CONFIRMED = has("--yes");
const orgId = Number(process.env.APP_ORG_ID || 1);

type RevertItem = { id: string; sku?: string; name?: string; reference?: string; price?: string | number };
type AlegraItem = {
  id?: string | number;
  name?: string;
  reference?: string;
  price?: unknown;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// El precio en Alegra puede venir como número o como lista de precios.
function currentPrice(it: AlegraItem): number | null {
  const p = it.price as unknown;
  if (Array.isArray(p)) {
    const first = p[0] as { price?: unknown } | undefined;
    const n = Number(first?.price);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(p);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  if (storeId == null || !Number.isFinite(storeId)) {
    console.error("Falta --store-id=<n> (la tienda cuya cuenta Alegra se escribe). Becam = 1.");
    process.exit(1);
  }

  // tsc no copia .json a dist/, así que buscamos la data en varias rutas:
  // junto al .js compilado, o en el fuente src/scripts (presente tras git pull).
  const candidates = [
    join(__dirname, "revert-alegra-fields.data.json"),
    join(process.cwd(), "src/scripts/revert-alegra-fields.data.json"),
    join(process.cwd(), "dist/src/scripts/revert-alegra-fields.data.json"),
  ];
  let raw = "";
  let usedPath = "";
  for (const p of candidates) {
    try {
      raw = readFileSync(p, "utf8");
      usedPath = p;
      break;
    } catch {
      /* siguiente */
    }
  }
  if (!raw) {
    console.error("No se encontró revert-alegra-fields.data.json. Rutas probadas:\n  " + candidates.join("\n  "));
    process.exit(1);
  }
  const data = JSON.parse(raw) as RevertItem[];
  console.log(`Data: ${usedPath}`);

  await runWithOrg(orgId, async () => {
    const alegra = await resolveAlegraClientForStore(storeId);
    console.log(`Alegra store_id=${storeId} (org=${orgId})`);
    console.log(`Ítems a revertir en la data: ${data.length}`);
    console.log(`Modo: ${DO_APPLY ? (CONFIRMED ? "APLICAR" : "APLICAR (falta --yes)") : "DRY-RUN"}`);
    if (Number.isFinite(LIMIT)) console.log(`Límite: ${LIMIT} ítems`);
    console.log("");

    const objetivo = data.slice(0, Number.isFinite(LIMIT) ? LIMIT : data.length);
    let updated = 0;
    let skippedNoDiff = 0;
    const fallidos: Array<{ id: string; detail: string }> = [];

    for (let i = 0; i < objetivo.length; i += 1) {
      const it = objetivo[i];
      try {
        const current = (await alegra.getItem(it.id)) as AlegraItem;
        const payload: Record<string, unknown> = {};

        if (it.name != null && String(current.name ?? "") !== String(it.name)) {
          payload.name = it.name;
        }
        if (it.reference != null && String(current.reference ?? "") !== String(it.reference)) {
          payload.reference = String(it.reference);
        }
        if (it.price != null) {
          const target = Number(it.price);
          const cur = currentPrice(current);
          if (Number.isFinite(target) && (cur == null || Math.abs(cur - target) > 0.5)) {
            payload.price = target;
          }
        }

        if (Object.keys(payload).length === 0) {
          skippedNoDiff += 1;
          continue;
        }

        const fields = Object.keys(payload).join(",");
        if (!DO_APPLY || !CONFIRMED) {
          console.log(
            `  [dry] #${it.id} ${String(current.name || "").slice(0, 32)} -> {${fields}}` +
              (payload.reference ? ` ref:${current.reference}->${payload.reference}` : "") +
              (payload.price != null ? ` price:${currentPrice(current)}->${payload.price}` : "")
          );
        } else {
          await alegra.updateItem(it.id, payload);
          updated += 1;
          if (updated % 25 === 0 || i === objetivo.length - 1) {
            console.log(`  aplicados ${updated}/${objetivo.length}`);
          }
          await sleep(150); // rate-limit Alegra
        }
      } catch (error) {
        const e = error as Error & { status?: number; detail?: string };
        fallidos.push({ id: String(it.id), detail: (e.detail || e.message || "").slice(0, 160) });
        console.log(`  ✗ FALLÓ #${it.id}: ${(e.detail || e.message || "").slice(0, 120)}`);
        await sleep(200);
      }
    }

    console.log("");
    console.log("========== RESULTADO ==========");
    console.log(`Objetivo:                 ${objetivo.length}`);
    if (DO_APPLY && CONFIRMED) {
      console.log(`Revertidos (updateItem):  ${updated}`);
    } else {
      console.log(`(DRY-RUN: no se escribió nada. Para aplicar: --apply --yes)`);
    }
    console.log(`Sin cambios (ya OK):      ${skippedNoDiff}`);
    console.log(`Fallidos:                 ${fallidos.length}`);
    if (fallidos.length) {
      fallidos.forEach((f) => console.log(`  #${f.id} | ${f.detail}`));
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
