import { ensureOrganization, getOrgId, getPool } from "../db";

export type StoreRecord = {
  id: number;
  name: string;
  createdAt: string;
};

export async function listStores(): Promise<{ stores: StoreRecord[] }> {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const result = await pool.query<{
    id: number;
    name: string;
    created_at: string;
  }>(
    `
    SELECT id, name, created_at
    FROM stores
    WHERE organization_id = $1
    ORDER BY created_at DESC
    `,
    [orgId]
  );
  return {
    stores: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    })),
  };
}

export async function getStoreById(storeId: number) {
  if (!Number.isFinite(storeId)) return null;
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const result = await pool.query<{ id: number; name: string }>(
    `
    SELECT id, name
    FROM stores
    WHERE organization_id = $1 AND id = $2
    LIMIT 1
    `,
    [orgId, storeId]
  );
  return result.rows[0] || null;
}

export async function createStore(name: string) {
  const cleaned = String(name || "").trim();
  if (!cleaned) {
    throw new Error("Nombre de tienda requerido");
  }
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  try {
    const result = await pool.query<{ id: number; name: string; created_at: string }>(
      `
      INSERT INTO stores (organization_id, name)
      VALUES ($1, $2)
      RETURNING id, name, created_at
      `,
      [orgId, cleaned]
    );
    const row = result.rows[0];
    return { id: row.id, name: row.name, createdAt: row.created_at };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "23505") {
      throw new Error("Ya existe una tienda con ese nombre.", { cause: error });
    }
    if (code === "42P01") {
      throw new Error("Falta migración de tiendas. Ejecuta npm run db:migrate.", { cause: error });
    }
    throw error;
  }
}

export async function updateStoreName(storeId: number, name: string) {
  if (!Number.isFinite(storeId)) {
    throw new Error("ID de tienda invalido");
  }
  const cleaned = String(name || "").trim();
  if (!cleaned) {
    throw new Error("Nombre de tienda requerido");
  }
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  try {
    const result = await pool.query<{ id: number; name: string; created_at: string }>(
      `
      UPDATE stores
      SET name = $3
      WHERE id = $1 AND organization_id = $2
      RETURNING id, name, created_at
      `,
      [storeId, orgId, cleaned]
    );
    if (!result.rows.length) {
      throw new Error("Tienda no encontrada.");
    }
    const row = result.rows[0];
    return { id: row.id, name: row.name, createdAt: row.created_at };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "23505") {
      throw new Error("Ya existe una tienda con ese nombre.", { cause: error });
    }
    throw error;
  }
}

export async function deleteStoreById(storeId: number) {
  if (!Number.isFinite(storeId)) {
    throw new Error("ID de tienda invalido");
  }
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
      DELETE FROM shopify_store_configs
      WHERE organization_id = $1 AND store_id = $2
      `,
      [orgId, storeId]
    );
    await client.query(
      `
      DELETE FROM shopify_oauth_states
      WHERE organization_id = $1 AND store_id = $2
      `,
      [orgId, storeId]
    );
    await client.query(
      `
      DELETE FROM alegra_accounts
      WHERE organization_id = $1 AND store_id = $2
      `,
      [orgId, storeId]
    );
    await client.query(
      `
      DELETE FROM shopify_stores
      WHERE organization_id = $1 AND store_id = $2
      `,
      [orgId, storeId]
    );
    await client.query(
      `
      DELETE FROM stores
      WHERE organization_id = $1 AND id = $2
      `,
      [orgId, storeId]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
