import { getOrgId, getPool } from "../db";
import { buildSyncContext } from "./sync-context";
import { createSyncLog } from "./logs.service";

// Consolidación de productos DUPLICADOS en Alegra (cliente Becam).
//
// Contexto: por cada producto real existe un ORIGINAL (marca en el campo
// `description`, texto corto) y un DUPLICADO (frase descriptiva en `description`,
// cuyo `reference` = el alegra_item_id del original). El match Shopify y el
// inventario quedaron REPARTIDOS entre las dos fichas.
//
// Este proceso, por cada par duplicado->original:
//   1) Lee inventario FRESCO de Alegra (por bodega) de ambos.
//   2) Consolida con regla MAX: el original queda con max(orig, dup) por bodega
//      (nunca suma -> no infla si era el mismo stock contado dos veces; nunca
//      pierde stock -> el original termina >= ambos). Solo ajusta si dup > orig.
//   3) Re-apunta el match (sync_mappings) del duplicado al original, resolviendo
//      conflictos (si el original ya tenía ese shopify_id, descarta el del dup).
//   4) Neutraliza el duplicado en Alegra: intenta DELETE; si Alegra lo rechaza
//      (tiene movimientos de venta), lo DESACTIVA (status=inactive).
//   5) Borra las filas locales del duplicado en `products`.
//
// Modo simulación por defecto (apply=false): reporta el plan sin tocar nada.
// `limit` procesa por lotes. Es reanudable: al borrar/desactivar y quitar las
// filas locales, el par ya no reaparece en la siguiente corrida.

type WarehouseQty = { id: string; qty: number };
type ItemInventory = { warehouses: WarehouseQty[]; flat: number };

type PairPlan = {
  dup: string;
  orig: string;
  adjustments: Array<{ warehouseId: string; from: number; to: number; delta: number }>;
  remapped: number;
  remapConflictsDropped: number;
  alegraAction: "delete" | "deactivate" | "skip" | null;
  localRowsDeleted: number;
  error?: string;
};

type ConsolidationReport = {
  dryRun: boolean;
  pairsTotal: number;
  pairsProcessed: number;
  inventoryAdjustments: number;
  mappingsRemapped: number;
  itemsDeleted: number;
  itemsDeactivated: number;
  localRowsDeleted: number;
  errors: number;
  details: PairPlan[];
};

function extractWarehouses(item: Record<string, unknown> | null | undefined): ItemInventory {
  const inv = ((item?.inventory as Record<string, unknown>) || {}) as {
    availableQuantity?: unknown;
    quantity?: unknown;
    warehouses?: Array<{ id?: unknown; availableQuantity?: unknown; quantity?: unknown }>;
  };
  const warehouses = Array.isArray(inv.warehouses) ? inv.warehouses : [];
  const mapped: WarehouseQty[] = warehouses.map((w) => ({
    id: String(w?.id ?? "").trim(),
    qty: Number(w?.availableQuantity ?? w?.quantity ?? 0) || 0,
  }));
  const flat = Number(inv.availableQuantity ?? inv.quantity ?? 0) || 0;
  return { warehouses: mapped.filter((w) => w.id), flat };
}

async function resolveShopDomain(pool: ReturnType<typeof getPool>, orgId: number): Promise<string> {
  const res = await pool.query<{ shop_domain: string }>(
    `SELECT shop_domain FROM shopify_stores WHERE organization_id = $1 AND access_token_encrypted IS NOT NULL ORDER BY store_id ASC LIMIT 1`,
    [orgId]
  );
  const domain = res.rows[0]?.shop_domain;
  if (!domain) throw new Error("No hay ninguna tienda Shopify conectada para resolver la cuenta Alegra.");
  return domain;
}

async function loadPairs(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  limit?: number
): Promise<Array<{ dup: string; orig: string }>> {
  // dup = frase (description larga) cuyo reference apunta a un item MARCA existente.
  const res = await pool.query<{ dup: string; orig: string }>(
    `
    WITH it AS (
      SELECT DISTINCT ON (alegra_item_id)
        alegra_item_id AS aid,
        reference AS ref,
        length(payload_json::jsonb->>'description') AS dl
      FROM products
      WHERE organization_id = $1 AND alegra_item_id IS NOT NULL
    )
    SELECT dup.aid AS dup, orig.aid AS orig
    FROM it dup
    JOIN it orig ON orig.aid = dup.ref AND orig.dl <= 25
    WHERE dup.dl > 25
    ORDER BY dup.aid ASC
    ${limit && limit > 0 ? `LIMIT ${Math.floor(limit)}` : ""}
    `,
    [orgId]
  );
  return res.rows.map((r) => ({ dup: String(r.dup), orig: String(r.orig) }));
}

async function fetchInventory(
  ctx: Awaited<ReturnType<typeof buildSyncContext>>,
  itemId: string
): Promise<ItemInventory> {
  const item = (await ctx.alegra.getItemWithParams(itemId, {
    mode: "advanced",
    fields: "inventory",
    metadata: true,
  })) as Record<string, unknown>;
  return extractWarehouses(item);
}

// Ajustes de inventario para llevar el original a max(orig, dup) por bodega.
function computeAdjustments(dupInv: ItemInventory, origInv: ItemInventory) {
  const warehouseIds = new Set<string>();
  dupInv.warehouses.forEach((w) => warehouseIds.add(w.id));
  origInv.warehouses.forEach((w) => warehouseIds.add(w.id));
  const qtyIn = (inv: ItemInventory, id: string) => inv.warehouses.find((w) => w.id === id)?.qty ?? 0;
  const adjustments: PairPlan["adjustments"] = [];
  for (const id of warehouseIds) {
    const dupQty = qtyIn(dupInv, id);
    const origQty = qtyIn(origInv, id);
    const target = Math.max(dupQty, origQty);
    const delta = Math.round((target - origQty) * 1000) / 1000;
    if (delta > 0.0001) {
      adjustments.push({ warehouseId: id, from: origQty, to: target, delta });
    }
  }
  return adjustments;
}

async function remapMatch(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  dup: string,
  orig: string
): Promise<{ remapped: number; conflictsDropped: number }> {
  // Descarta los mapeos del dup cuyo shopify_id ya existe en el original.
  const dropped = await pool.query(
    `
    DELETE FROM sync_mappings d
    WHERE d.organization_id = $1 AND d.entity = 'item' AND d.alegra_id = $2
      AND EXISTS (
        SELECT 1 FROM sync_mappings o
        WHERE o.organization_id = $1 AND o.entity = 'item'
          AND o.alegra_id = $3 AND o.shopify_id = d.shopify_id
      )
    `,
    [orgId, dup, orig]
  );
  // Re-apunta el resto al original.
  const moved = await pool.query(
    `UPDATE sync_mappings SET alegra_id = $3 WHERE organization_id = $1 AND entity = 'item' AND alegra_id = $2`,
    [orgId, dup, orig]
  );
  return { remapped: moved.rowCount || 0, conflictsDropped: dropped.rowCount || 0 };
}

export async function consolidateDuplicates(options?: {
  apply?: boolean;
  limit?: number;
}): Promise<ConsolidationReport> {
  const apply = options?.apply === true;
  const limit = options?.limit;
  const pool = getPool();
  const orgId = getOrgId();
  const shopDomain = await resolveShopDomain(pool, orgId);
  const ctx = await buildSyncContext(shopDomain);
  const today = new Date().toISOString().slice(0, 10);

  const pairs = await loadPairs(pool, orgId, limit);
  const report: ConsolidationReport = {
    dryRun: !apply,
    pairsTotal: pairs.length,
    pairsProcessed: 0,
    inventoryAdjustments: 0,
    mappingsRemapped: 0,
    itemsDeleted: 0,
    itemsDeactivated: 0,
    localRowsDeleted: 0,
    errors: 0,
    details: [],
  };

  for (const pair of pairs) {
    const plan: PairPlan = {
      dup: pair.dup,
      orig: pair.orig,
      adjustments: [],
      remapped: 0,
      remapConflictsDropped: 0,
      alegraAction: null,
      localRowsDeleted: 0,
    };
    try {
      const [dupInv, origInv] = await Promise.all([
        fetchInventory(ctx, pair.dup),
        fetchInventory(ctx, pair.orig),
      ]);
      plan.adjustments = computeAdjustments(dupInv, origInv);

      if (apply) {
        // 1) Ajustes de inventario en el original (regla MAX).
        for (const adj of plan.adjustments) {
          const warehouseNumeric = Number(adj.warehouseId);
          if (!Number.isFinite(warehouseNumeric)) continue;
          await ctx.alegra.createInventoryAdjustment({
            date: today,
            observations: `Consolidación duplicado ${pair.dup} -> original ${pair.orig}`,
            items: [
              {
                id: Number(pair.orig),
                quantity: adj.delta,
                observations: `Consolidación duplicado ${pair.dup}`,
                warehouse: { id: warehouseNumeric },
              },
            ],
          });
        }
        // 2) Re-apuntar el match.
        const remap = await remapMatch(pool, orgId, pair.dup, pair.orig);
        plan.remapped = remap.remapped;
        plan.remapConflictsDropped = remap.conflictsDropped;
        // 3) Borrar o desactivar el duplicado en Alegra.
        try {
          await ctx.alegra.deleteItem(pair.dup);
          plan.alegraAction = "delete";
          report.itemsDeleted += 1;
        } catch {
          try {
            await ctx.alegra.updateItem(pair.dup, { status: "inactive" });
            plan.alegraAction = "deactivate";
            report.itemsDeactivated += 1;
          } catch (e) {
            plan.alegraAction = "skip";
            plan.error = `No se pudo borrar ni desactivar en Alegra: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
        // 4) Borrar filas locales del duplicado.
        const del = await pool.query(
          `DELETE FROM products WHERE organization_id = $1 AND alegra_item_id = $2`,
          [orgId, pair.dup]
        );
        plan.localRowsDeleted = del.rowCount || 0;
        report.localRowsDeleted += plan.localRowsDeleted;
        report.mappingsRemapped += plan.remapped;
      }

      report.inventoryAdjustments += plan.adjustments.length;
      report.pairsProcessed += 1;
    } catch (error) {
      plan.error = error instanceof Error ? error.message : String(error);
      report.errors += 1;
    }
    report.details.push(plan);
  }

  if (apply) {
    await createSyncLog({
      entity: "product",
      direction: "alegra->shopify",
      status: report.errors ? "warn" : "success",
      message: `Consolidación duplicados: ${report.pairsProcessed} pares, ${report.itemsDeleted} borrados, ${report.itemsDeactivated} desactivados, ${report.errors} errores`,
      request: { limit: limit ?? null },
      response: {
        itemsDeleted: report.itemsDeleted,
        itemsDeactivated: report.itemsDeactivated,
        mappingsRemapped: report.mappingsRemapped,
        inventoryAdjustments: report.inventoryAdjustments,
      },
    });
  }

  // Acota el detalle para no saturar la respuesta.
  report.details = report.details.slice(0, 200);
  return report;
}
