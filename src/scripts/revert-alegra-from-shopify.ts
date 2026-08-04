/**
 * Restaura en Alegra la REFERENCIA/EAN (y opcionalmente el PRECIO) de los ítems
 * que el sync dejó con la referencia = SKU de Shopify, tomando el dato LIMPIO
 * desde SHOPIFY:
 *   - El EAN real vive en el campo `barcode` de la variante de Shopify (el sync
 *     nunca lo tocó). Match por SKU: Alegra.reference (=SKU) -> Shopify.barcode.
 *   - Precio: Shopify trae el precio CON IVA; el precio base (neto) de Alegra =
 *     precioShopify / (1 + IVA). Solo se ajusta si el ítem tiene IVA 19% (los de
 *     otro IVA se marcan para revisar).
 *
 * Seguro: solo toca ítems cuya referencia actual es un SKU de Shopify que tiene
 * un `barcode` tipo EAN (>=8 dígitos) distinto. Así NO toca los duplicados viejos
 * (su referencia apunta a un id de Alegra, no a un SKU con barcode) ni ítems con
 * referencia ya correcta.
 *
 * Idempotente. DRY-RUN por defecto. Aplicar: --apply --yes
 *
 * Uso:
 *   node dist/src/scripts/revert-alegra-from-shopify.js --shop-domain=mut50d-tj.myshopify.com
 *   node dist/src/scripts/revert-alegra-from-shopify.js --shop-domain=mut50d-tj.myshopify.com --price
 *   node dist/src/scripts/revert-alegra-from-shopify.js --shop-domain=mut50d-tj.myshopify.com --price --apply --yes --limit=5
 *   node dist/src/scripts/revert-alegra-from-shopify.js --shop-domain=mut50d-tj.myshopify.com --price --apply --yes
 */
import "dotenv/config";
import { runWithOrg } from "../db";
import { buildSyncContext } from "../services/sync-context";

const args = process.argv.slice(2);
const has = (f: string) => args.includes(f);
const getVal = (name: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
};
const shopDomain = getVal("shop-domain") || "";
const LIMIT = getVal("limit") != null ? Number(getVal("limit")) : Infinity;
const DO_PRICE = has("--price");
const DO_APPLY = has("--apply");
const CONFIRMED = has("--yes");
const orgId = Number(process.env.APP_ORG_ID || 1);

type Variant = { sku?: string | null; barcode?: string | null; price?: string | null };
type ShopifyProduct = { variants?: { edges?: Array<{ node?: Variant }> } | { nodes?: Variant[] } };
type AlegraItem = {
  id?: string | number;
  name?: string;
  reference?: string;
  price?: unknown;
  tax?: Array<{ percentage?: unknown }> | { percentage?: unknown } | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const round2 = (n: number) => Math.round(n * 100) / 100;

function variantsOf(p: ShopifyProduct): Variant[] {
  const v = p.variants as { edges?: Array<{ node?: Variant }>; nodes?: Variant[] } | undefined;
  if (!v) return [];
  if (Array.isArray(v.nodes)) return v.nodes;
  if (Array.isArray(v.edges)) return v.edges.map((e) => e.node || {});
  return [];
}
function ivaPct(it: AlegraItem): number | null {
  const t = it.tax;
  const first = Array.isArray(t) ? t[0] : t;
  const p = Number((first as { percentage?: unknown } | undefined)?.percentage);
  return Number.isFinite(p) ? p : null;
}
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
  if (!shopDomain) {
    console.error("Falta --shop-domain=<dominio> (Becam = mut50d-tj.myshopify.com).");
    process.exit(1);
  }

  await runWithOrg(orgId, async () => {
    const ctx = await buildSyncContext(shopDomain);

    // 1) Mapa SKU -> {barcode(EAN), price} desde Shopify (limpio).
    console.log("Leyendo catálogo de Shopify...");
    const products = (await ctx.shopify.listAllProductsByQuery("")) as unknown as ShopifyProduct[];
    const bySku = new Map<string, { barcode: string; price: string }>();
    for (const p of products) {
      for (const v of variantsOf(p)) {
        const sku = (v.sku || "").trim();
        const barcode = (v.barcode || "").trim();
        if (sku) bySku.set(sku, { barcode, price: String(v.price ?? "") });
      }
    }
    console.log(`Shopify: ${products.length} productos, ${bySku.size} SKUs. Con barcode EAN: ` +
      `${[...bySku.values()].filter((x) => /^\d{8,}$/.test(x.barcode)).length}`);

    // 2) Recorrer Alegra y detectar los que hay que arreglar.
    const targets: Array<{ id: string; name: string; curRef: string; newRef: string; curPrice: number | null; newPrice: number | null; priceFlag?: string }> = [];
    let scanned = 0;
    let start = 0;
    for (;;) {
      const resp = (await ctx.alegra.searchItems({
        limit: 30,
        start,
        fields: "id,name,reference,price,tax",
        metadata: true,
      })) as { data?: AlegraItem[] } | AlegraItem[];
      const items: AlegraItem[] = Array.isArray(resp) ? resp : resp.data || [];
      if (!items.length) break;
      for (const it of items) {
        scanned += 1;
        const ref = String(it.reference ?? "").trim();
        if (!/^\d{1,7}$/.test(ref)) continue; // solo referencias numéricas cortas (sospechosas)
        const hit = bySku.get(ref);
        if (!hit) continue; // su referencia no es un SKU de Shopify -> no es este daño (o es duplicado)
        const ean = hit.barcode;
        if (!/^\d{8,}$/.test(ean) || ean === ref) continue; // sin EAN real que restaurar
        const t: { id: string; name: string; curRef: string; newRef: string; curPrice: number | null; newPrice: number | null; priceFlag?: string } = {
          id: String(it.id ?? ""),
          name: String(it.name || "").slice(0, 34),
          curRef: ref,
          newRef: ean,
          curPrice: currentPrice(it),
          newPrice: null,
        };
        if (DO_PRICE) {
          const pct = ivaPct(it);
          const shopP = Number(hit.price);
          if (Number.isFinite(shopP) && shopP > 0) {
            if (pct === 19) t.newPrice = round2(shopP / 1.19);
            else t.priceFlag = `IVA=${pct ?? "?"} (no 19%, precio sin tocar)`;
          }
        }
        targets.push(t);
      }
      if (items.length < 30) break;
      start += items.length;
      if (scanned % 600 === 0) console.log(`  ...escaneados ${scanned}`);
    }

    const objetivo = targets.slice(0, Number.isFinite(LIMIT) ? LIMIT : targets.length);
    console.log("");
    console.log(`Escaneados en Alegra: ${scanned}`);
    console.log(`A ARREGLAR (ref=SKU con EAN en Shopify): ${targets.length}`);
    console.log(`Campos: referencia${DO_PRICE ? " + precio(÷IVA 19%)" : " (precio: usa --price)"}`);
    console.log(`Modo: ${DO_APPLY ? (CONFIRMED ? "APLICAR" : "APLICAR (falta --yes)") : "DRY-RUN"}`);
    if (Number.isFinite(LIMIT)) console.log(`Límite: ${LIMIT}`);
    console.log("");

    let updated = 0;
    const fallidos: Array<{ id: string; detail: string }> = [];
    for (let i = 0; i < objetivo.length; i += 1) {
      const t = objetivo[i];
      const payload: Record<string, unknown> = { reference: t.newRef };
      if (t.newPrice != null && (t.curPrice == null || Math.abs(t.curPrice - t.newPrice) > 0.5)) {
        payload.price = t.newPrice;
      }
      if (!DO_APPLY || !CONFIRMED) {
        console.log(
          `  [dry] #${t.id} ${t.name} | ref:${t.curRef}->${t.newRef}` +
            (payload.price != null ? ` | price:${t.curPrice}->${payload.price}` : "") +
            (t.priceFlag ? ` | ${t.priceFlag}` : "")
        );
        continue;
      }
      try {
        await ctx.alegra.updateItem(t.id, payload);
        updated += 1;
        if (updated % 25 === 0 || i === objetivo.length - 1) console.log(`  aplicados ${updated}/${objetivo.length}`);
        await sleep(150);
      } catch (error) {
        const e = error as Error & { detail?: string };
        fallidos.push({ id: t.id, detail: (e.detail || e.message || "").slice(0, 140) });
        console.log(`  ✗ FALLÓ #${t.id}: ${(e.detail || e.message || "").slice(0, 110)}`);
        await sleep(200);
      }
    }

    console.log("");
    console.log("========== RESULTADO ==========");
    console.log(`Objetivo:   ${objetivo.length}`);
    if (DO_APPLY && CONFIRMED) console.log(`Arreglados: ${updated}`);
    else console.log(`(DRY-RUN: no se escribió nada. Aplicar: --apply --yes)`);
    console.log(`Fallidos:   ${fallidos.length}`);
    fallidos.forEach((f) => console.log(`  #${f.id} | ${f.detail}`));
    console.log("===============================");
    console.log("");
    console.log("NOTA: arregla referencia/EAN (y precio con IVA 19%). El NOMBRE se sigue");
    console.log("afinando con facturas/otras fuentes; este script no toca el nombre.");
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("✗ Error:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
