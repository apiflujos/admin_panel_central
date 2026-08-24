import { getOrgId, getPool } from "../db";

type MappingKey = {
  entity: string;
  alegraId?: string;
  shopifyId?: string;
};

type MappingRecord = {
  entity: string;
  alegraId?: string;
  shopifyId?: string;
  shopifyInventoryItemId?: string;
  shopifyProductId?: string;
  /** Tienda a la que pertenece el mapeo. Imprescindible en multi-tienda. */
  shopDomain?: string;
  metadata?: Record<string, unknown>;
};

type MappingRow = {
  id: number;
  entity: string;
  alegra_id: string | null;
  shopify_id: string | null;
  parent_id: string | null;
  metadata_json: Record<string, unknown> | null;
};

function mapRow(row: MappingRow): MappingRecord {
  const metadata = row.metadata_json || {};
  return {
    entity: row.entity,
    alegraId: row.alegra_id || undefined,
    shopifyId: row.shopify_id || undefined,
    shopifyProductId: row.parent_id || undefined,
    shopifyInventoryItemId: (metadata.shopifyInventoryItemId as string | undefined) || undefined,
    metadata,
  };
}

function buildKey(key: MappingKey) {
  return `${key.entity}:${key.alegraId || ""}:${key.shopifyId || ""}`;
}

function extractNumericShopifyId(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw;
  const match = raw.match(/^gid:\/\/shopify\/[^/]+\/(\d+)$/);
  return match ? match[1] : "";
}

function resolveShopifyGidType(entity: string) {
  if (entity === "item") return "ProductVariant";
  if (entity === "order") return "Order";
  if (entity === "product") return "Product";
  return "";
}

function buildShopifyIdCandidates(entity: string, shopifyId: string) {
  const raw = String(shopifyId || "").trim();
  if (!raw) return [];
  const candidates = new Set<string>();
  candidates.add(raw);
  const numeric = extractNumericShopifyId(raw);
  if (numeric) candidates.add(numeric);
  const type = resolveShopifyGidType(entity);
  if (type && numeric) candidates.add(`gid://shopify/${type}/${numeric}`);
  return Array.from(candidates);
}

/**
 * Busca el mapeo de un recurso de Alegra.
 *
 * `sync_mappings` NO tiene columna de tienda ni índice único, así que una
 * organización con varias tiendas Shopify acumula un mapeo por tienda para el
 * mismo `alegra_id` (en producción: 985 identificadores con más de uno). La
 * versión anterior hacía `LIMIT 1` sin filtrar ni ordenar, de modo que devolvía
 * un mapeo arbitrario: al sincronizar hacia una tienda se usaba a menudo el id
 * de la OTRA, y Shopify respondía "Product does not exist".
 *
 * Al pasar `shopDomain` se prefiere el mapeo de esa tienda. Los mapeos
 * históricos sin `shopDomain` en su metadata siguen sirviendo como respaldo,
 * pero sólo si no hay uno específico.
 */
export async function getMappingByAlegraId(entity: string, alegraId: string, shopDomain?: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = String(shopDomain || "").trim();
  const result = await pool.query<MappingRow>(
    `
    SELECT id, entity, alegra_id, shopify_id, parent_id, metadata_json
    FROM sync_mappings
    WHERE organization_id = $1 AND entity = $2 AND alegra_id = $3
      -- Si se pide una tienda concreta, se descartan los mapeos que declaran
      -- pertenecer a OTRA. Los que no declaran ninguna se conservan.
      AND (
        $4 = ''
        OR metadata_json->>'shopDomain' = $4
        OR ($2 <> 'order' AND metadata_json->>'shopDomain' IS NULL)
      )
    ORDER BY
      -- Primero el de la tienda pedida, después el genérico, y ante empate el
      -- más reciente.
      CASE WHEN metadata_json->>'shopDomain' = $4 THEN 0 ELSE 1 END,
      id DESC
    LIMIT 1
    `,
    [orgId, entity, alegraId, domain]
  );
  if (!result.rows.length) {
    return undefined;
  }
  return mapRow(result.rows[0]);
}

/**
 * Descarta un mapeo que apunta a un recurso que ya no existe en Shopify.
 *
 * Sin esto, un producto borrado en Shopify deja el mapeo apuntando al vacío
 * para siempre y el ítem no vuelve a sincronizarse nunca: cada pasada repite
 * "Product does not exist". Al borrarlo, el flujo normal lo reencuentra por
 * SKU o código de barras en la siguiente vuelta y guarda el mapeo correcto.
 */
export async function deleteMappingByAlegraId(entity: string, alegraId: string, shopDomain?: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const domain = String(shopDomain || "").trim();
  const result = await pool.query(
    `
    DELETE FROM sync_mappings
    WHERE organization_id = $1 AND entity = $2 AND alegra_id = $3
      AND (
        $4 = ''
        OR metadata_json->>'shopDomain' = $4
        OR ($2 <> 'order' AND metadata_json->>'shopDomain' IS NULL)
      )
    `,
    [orgId, entity, alegraId, domain]
  );
  return result.rowCount || 0;
}

export async function getMappingByShopifyId(entity: string, shopifyId: string, shopDomain?: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const candidates = buildShopifyIdCandidates(entity, shopifyId);
  if (!candidates.length) return undefined;
  const domain = String(shopDomain || "").trim();
  const result = await pool.query<MappingRow>(
    `
    SELECT id, entity, alegra_id, shopify_id, parent_id, metadata_json
    FROM sync_mappings
    WHERE organization_id = $1 AND entity = $2 AND shopify_id = ANY($3::text[])
      AND (
        $4 = ''
        OR metadata_json->>'shopDomain' = $4
        OR ($2 <> 'order' AND metadata_json->>'shopDomain' IS NULL)
      )
    ORDER BY
      CASE WHEN metadata_json->>'shopDomain' = $4 THEN 0 ELSE 1 END,
      id DESC
    LIMIT 1
    `,
    [orgId, entity, candidates, domain]
  );
  if (!result.rows.length) {
    return undefined;
  }
  return mapRow(result.rows[0]);
}

export async function getMappingByShopifyInventoryItemId(entity: string, inventoryItemId: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<MappingRow>(
    `
    SELECT id, entity, alegra_id, shopify_id, parent_id, metadata_json
    FROM sync_mappings
    WHERE organization_id = $1
      AND entity = $2
      AND metadata_json->>'shopifyInventoryItemId' = $3
    LIMIT 1
    `,
    [orgId, entity, inventoryItemId]
  );
  if (!result.rows.length) {
    return undefined;
  }
  return mapRow(result.rows[0]);
}

export async function saveMapping(record: MappingRecord) {
  const pool = getPool();
  const orgId = getOrgId();
  // El shopDomain se persiste SIEMPRE que se conozca: es lo que permite
  // distinguir los mapeos de cada tienda en una organización multi-tienda.
  const shopDomain = record.shopDomain || (record.metadata?.shopDomain as string | undefined) || undefined;
  const metadata = {
    ...(record.metadata || {}),
    shopifyInventoryItemId: record.shopifyInventoryItemId,
    ...(shopDomain ? { shopDomain } : {}),
  };

  const existing = await findExistingMappingId(record, orgId);
  if (existing) {
    await pool.query(
      `
      UPDATE sync_mappings
      SET shopify_id = $1, alegra_id = $2, parent_id = $3, metadata_json = $4
      WHERE id = $5
      `,
      [record.shopifyId || null, record.alegraId || null, record.shopifyProductId || null, metadata, existing]
    );
    return;
  }

  await pool.query(
    `
    INSERT INTO sync_mappings
      (organization_id, entity, shopify_id, alegra_id, parent_id, metadata_json)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [orgId, record.entity, record.shopifyId || null, record.alegraId || null, record.shopifyProductId || null, metadata]
  );
}

export async function updateMappingMetadata(entity: string, alegraId: string, metadata: Record<string, unknown>) {
  const existing = await getMappingByAlegraId(entity, alegraId);
  if (!existing) {
    return;
  }
  await saveMapping({
    ...existing,
    metadata: {
      ...(existing.metadata || {}),
      ...metadata,
    },
  });
}

async function findExistingMappingId(record: MappingRecord, orgId: number) {
  const pool = getPool();
  const domain = String(record.shopDomain || (record.metadata?.shopDomain as string | undefined) || "").trim();
  if (record.alegraId) {
    // Igual que en la lectura: sin filtrar por tienda, guardar el mapeo de una
    // tienda SOBRESCRIBÍA el de la otra, y ambas se pisaban en cada pasada.
    // Un mapeo sin tienda declarada se reutiliza (y queda etiquetado al
    // guardarse); uno de otra tienda, jamás.
    const result = await pool.query<{ id: number }>(
      `
      SELECT id
      FROM sync_mappings
      WHERE organization_id = $1 AND entity = $2 AND alegra_id = $3
        AND (
          $4 = ''
          OR metadata_json->>'shopDomain' = $4
          OR ($2 <> 'order' AND metadata_json->>'shopDomain' IS NULL)
        )
      ORDER BY
        CASE WHEN metadata_json->>'shopDomain' = $4 THEN 0 ELSE 1 END,
        id DESC
      LIMIT 1
      `,
      [orgId, record.entity, record.alegraId, domain]
    );
    if (result.rows.length) {
      return result.rows[0].id;
    }
  }

  if (record.shopifyId) {
    const result = await pool.query<{ id: number }>(
      `
      SELECT id
      FROM sync_mappings
      WHERE organization_id = $1 AND entity = $2 AND shopify_id = $3
        AND (
          $4 = ''
          OR metadata_json->>'shopDomain' = $4
          OR ($2 <> 'order' AND metadata_json->>'shopDomain' IS NULL)
        )
      ORDER BY
        CASE WHEN metadata_json->>'shopDomain' = $4 THEN 0 ELSE 1 END,
        id DESC
      LIMIT 1
      `,
      [orgId, record.entity, record.shopifyId, domain]
    );
    if (result.rows.length) {
      return result.rows[0].id;
    }
  }

  return undefined;
}

export function debugMappingKey(key: MappingKey) {
  return buildKey(key);
}
