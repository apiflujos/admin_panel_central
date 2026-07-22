import { isAlegraStatusInactive, resolveAlegraAvailableQuantity } from "../../packages/domain/src";
import { AlegraClient } from "../connectors/alegra";
import { getOrgId, getPool } from "../db";
import { getAlegraBaseUrl } from "../utils/alegra-env";
import { decryptString } from "../utils/crypto";
import type { AlegraItem } from "./alegra-to-shopify.service";
import { upsertProduct } from "./products.service";

/**
 * Import products directly from Alegra into the local catalog, scoped to a store
 * by `store_id` (via `alegra_accounts`). Unlike the Alegra→Shopify sync, this does
 * NOT require Shopify to be connected: it simply pulls the Alegra item catalog and
 * upserts it into the `products` table so it shows up in the Productos view.
 */
export async function resolveAlegraClientForStore(storeId: number): Promise<AlegraClient> {
  const pool = getPool();
  const orgId = getOrgId();
  const account = await pool.query<{
    user_email: string;
    api_key_encrypted: string;
    environment: string | null;
  }>(
    `
    SELECT user_email, api_key_encrypted, environment
    FROM alegra_accounts
    WHERE organization_id = $1 AND store_id = $2
    ORDER BY id DESC
    LIMIT 1
    `,
    [orgId, storeId]
  );
  if (!account.rows.length) {
    throw new Error("Alegra no conectado para esta tienda. Ve a Configuración → Conexiones y conecta Alegra.");
  }
  const decrypted = JSON.parse(decryptString(account.rows[0].api_key_encrypted));
  return new AlegraClient({
    email: account.rows[0].user_email,
    apiKey: decrypted.apiKey,
    baseUrl: getAlegraBaseUrl(account.rows[0].environment || "prod"),
  });
}

export type AlegraImportOptions = {
  onlyActive?: boolean;
  onlyWithImages?: boolean;
};

export type AlegraImportEvent =
  | { type: "start" }
  | { type: "progress"; processed: number; failed: number; skipped: number; scanned: number }
  | { type: "done"; processed: number; failed: number; skipped: number; scanned: number }
  | { type: "error"; error: string };

const itemHasImages = (item: AlegraItem) =>
  Array.isArray(item.images) &&
  item.images.some((image) => (typeof image === "string" ? image.length > 0 : Boolean(image?.url)));

export async function importAlegraProductsForStore(
  storeId: number,
  options: AlegraImportOptions,
  onEvent?: (event: AlegraImportEvent) => void,
  shouldCancel?: () => boolean
): Promise<{ processed: number; failed: number; skipped: number; scanned: number }> {
  const alegra = await resolveAlegraClientForStore(storeId);
  // Synthetic per-store catalog key so re-imports dedupe and stores don't collide.
  const shopDomainKey = `alegra-store-${storeId}`;
  const pageSize = 30;
  let start = 0;
  let processed = 0;
  let failed = 0;
  let skipped = 0;
  let scanned = 0;

  onEvent?.({ type: "start" });

  for (;;) {
    if (shouldCancel?.()) break;
    const batch = (await alegra.listItems({ limit: pageSize, start })) as AlegraItem[] | null;
    const items = Array.isArray(batch) ? batch : [];
    if (!items.length) break;

    for (const item of items) {
      if (shouldCancel?.()) break;
      scanned += 1;
      if (options.onlyActive && isAlegraStatusInactive(item.status)) {
        skipped += 1;
        continue;
      }
      if (options.onlyWithImages && !itemHasImages(item)) {
        skipped += 1;
        continue;
      }
      try {
        const availableQuantity = resolveAlegraAvailableQuantity(item.inventory, []);
        await upsertProduct({
          shopDomain: shopDomainKey,
          storeId,
          alegraId: item.id,
          name: item.name ?? null,
          reference: item.reference ?? null,
          sku: item.reference ?? item.code ?? null,
          barcode: item.barcode ?? null,
          statusAlegra: item.status ?? null,
          inventoryQuantity: typeof availableQuantity === "number" ? availableQuantity : null,
          source: "alegra",
          sourceUpdatedAt: Date.now(),
          payloadJson: item,
        });
        processed += 1;
      } catch {
        failed += 1;
      }
    }

    onEvent?.({ type: "progress", processed, failed, skipped, scanned });
    if (items.length < pageSize) break;
    start += pageSize;
  }

  const result = { processed, failed, skipped, scanned };
  onEvent?.({ type: "done", ...result });
  return result;
}
