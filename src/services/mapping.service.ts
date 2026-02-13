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
    shopifyInventoryItemId:
      (metadata.shopifyInventoryItemId as string | undefined) || undefined,
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

export async function getMappingByAlegraId(entity: string, alegraId: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<MappingRow>(
    `
    SELECT id, entity, alegra_id, shopify_id, parent_id, metadata_json
    FROM sync_mappings
    WHERE organization_id = $1 AND entity = $2 AND alegra_id = $3
    LIMIT 1
    `,
    [orgId, entity, alegraId]
  );
  if (!result.rows.length) {
    return undefined;
  }
  return mapRow(result.rows[0]);
}

export async function getMappingByShopifyId(entity: string, shopifyId: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const candidates = buildShopifyIdCandidates(entity, shopifyId);
  if (!candidates.length) return undefined;
  const result = await pool.query<MappingRow>(
    `
    SELECT id, entity, alegra_id, shopify_id, parent_id, metadata_json
    FROM sync_mappings
    WHERE organization_id = $1 AND entity = $2 AND shopify_id = ANY($3::text[])
    LIMIT 1
    `,
    [orgId, entity, candidates]
  );
  if (!result.rows.length) {
    return undefined;
  }
  return mapRow(result.rows[0]);
}

export async function getMappingByShopifyInventoryItemId(
  entity: string,
  inventoryItemId: string
) {
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
  const metadata = {
    ...(record.metadata || {}),
    shopifyInventoryItemId: record.shopifyInventoryItemId,
  };

  const existing = await findExistingMappingId(record, orgId);
  if (existing) {
    await pool.query(
      `
      UPDATE sync_mappings
      SET shopify_id = $1, alegra_id = $2, parent_id = $3, metadata_json = $4
      WHERE id = $5
      `,
      [
        record.shopifyId || null,
        record.alegraId || null,
        record.shopifyProductId || null,
        metadata,
        existing,
      ]
    );
    return;
  }

  await pool.query(
    `
    INSERT INTO sync_mappings
      (organization_id, entity, shopify_id, alegra_id, parent_id, metadata_json)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      orgId,
      record.entity,
      record.shopifyId || null,
      record.alegraId || null,
      record.shopifyProductId || null,
      metadata,
    ]
  );
}

export async function updateMappingMetadata(
  entity: string,
  alegraId: string,
  metadata: Record<string, unknown>
) {
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
  if (record.alegraId) {
    const result = await pool.query<{ id: number }>(
      `
      SELECT id
      FROM sync_mappings
      WHERE organization_id = $1 AND entity = $2 AND alegra_id = $3
      LIMIT 1
      `,
      [orgId, record.entity, record.alegraId]
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
      LIMIT 1
      `,
      [orgId, record.entity, record.shopifyId]
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
