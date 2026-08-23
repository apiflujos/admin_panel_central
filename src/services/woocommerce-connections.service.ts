import type { PoolClient } from "pg";

import { encryptString, decryptString } from "../utils/crypto";
import { assertPublicHostname } from "../utils/safe-host";
import { testWooCommerce } from "./connectivity.service";
import { ensureOrganization, getOrgId, getPool } from "../db";

const WOO_CONSUMER_KEY_REGEX = /^ck_[a-f0-9]{20,64}$/i;
const WOO_CONSUMER_SECRET_REGEX = /^cs_[a-f0-9]{20,64}$/i;

export type WooCommerceStoreInput = {
  shopDomain: string;
  consumerKey: string;
  consumerSecret: string;
  storeName?: string;
  storeId?: number;
};

type WooCommerceStoreRecord = {
  shopDomain: string;
  consumerKey: string;
  consumerSecret: string;
  storeName?: string;
  storeId?: number;
};

type WooCommerceCredentialPayload = {
  stores: WooCommerceStoreRecord[];
};

const PROVIDER = "woocommerce";

const normalizeShopDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

const isCryptoKeyMisconfigured = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("CRYPTO_KEY_BASE64 must be 32 bytes") ||
    message.includes("CRYPTO_KEY_BASE64") ||
    message.toLowerCase().includes("invalid key length")
  );
};

type Queryable = PoolClient | ReturnType<typeof getPool>;

function decodeCredential(rawEncrypted: string): WooCommerceCredentialPayload {
  try {
    return JSON.parse(decryptString(rawEncrypted)) as WooCommerceCredentialPayload;
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw new Error("Configuracion de seguridad invalida. Revisa CRYPTO_KEY_BASE64 en el servidor.", {
        cause: error,
      });
    }
    throw new Error("No se pudo leer la conexion de WooCommerce. Vuelve a conectar.", { cause: error });
  }
}

async function readWooCredential(runner: Queryable = getPool()) {
  const orgId = getOrgId();
  const result = await runner.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, PROVIDER]
  );
  if (!result.rows.length) return null;
  return decodeCredential(result.rows[0].data_encrypted);
}

async function readWooCredentialLocked(client: PoolClient) {
  const orgId = getOrgId();
  const result = await client.query<{ data_encrypted: string }>(
    `
    SELECT data_encrypted
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE
    `,
    [orgId, PROVIDER]
  );
  if (!result.rows.length) return null;
  return decodeCredential(result.rows[0].data_encrypted);
}

async function upsertWooCredential(payload: WooCommerceCredentialPayload, runner: Queryable = getPool()) {
  const orgId = getOrgId();
  if (runner === getPool()) {
    await ensureOrganization(getPool(), orgId);
  }
  const encrypted = encryptString(JSON.stringify(payload));

  const existing = await runner.query<{ id: number }>(
    `
    SELECT id
    FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, PROVIDER]
  );

  if (existing.rows.length) {
    await runner.query(
      `
      UPDATE credentials
      SET data_encrypted = $1
      WHERE id = $2
      `,
      [encrypted, existing.rows[0].id]
    );
    return;
  }

  await runner.query(
    `
    INSERT INTO credentials (organization_id, provider, data_encrypted)
    VALUES ($1, $2, $3)
    `,
    [orgId, PROVIDER, encrypted]
  );
}

export async function listWooConnections() {
  const credential = await readWooCredential();
  const stores = credential?.stores || [];
  if (!stores.length) {
    return { stores: [] };
  }
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const resolveOrCreateStoreId = async (name: string) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;
    const existing = await pool.query<{ id: number }>(
      `
      SELECT id
      FROM stores
      WHERE organization_id = $1 AND name = $2
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [orgId, trimmed]
    );
    if (existing.rows.length) return existing.rows[0].id;
    const created = await pool.query<{ id: number }>(
      `
      INSERT INTO stores (organization_id, name)
      VALUES ($1, $2)
      RETURNING id
      `,
      [orgId, trimmed]
    );
    return created.rows[0]?.id || null;
  };
  let mutated = false;
  const normalized = await Promise.all(
    stores.map(async (store) => {
      if (Number.isFinite(store.storeId as number)) return store;
      const fallback =
        (await resolveOrCreateStoreId(store.storeName || "")) || (await resolveOrCreateStoreId(store.shopDomain || ""));
      if (!fallback) return store;
      mutated = true;
      return { ...store, storeId: fallback };
    })
  );
  if (mutated) {
    await upsertWooCredential({ stores: normalized });
  }
  // Hidrata storeName siempre desde la tabla `stores` cuando storeId es conocido —
  // evita labels stale tras renombrar la tienda.
  const knownIds = normalized
    .map((s) => (Number.isFinite(s.storeId as number) ? Number(s.storeId) : null))
    .filter((v): v is number => v != null);
  const nameMap = new Map<number, string>();
  if (knownIds.length) {
    const rows = await pool.query<{ id: number; name: string }>(
      `SELECT id, name FROM stores WHERE organization_id = $1 AND id = ANY($2::int[])`,
      [orgId, knownIds]
    );
    rows.rows.forEach((row) => nameMap.set(row.id, row.name));
  }
  return {
    stores: normalized.map((store) => ({
      shopDomain: store.shopDomain,
      storeName:
        (Number.isFinite(store.storeId as number) ? nameMap.get(Number(store.storeId)) : "") || store.storeName || "",
      storeId: store.storeId,
      hasConsumerKey: Boolean(store.consumerKey),
      hasConsumerSecret: Boolean(store.consumerSecret),
    })),
  };
}

export async function getWooConnectionByDomain(shopDomain: string) {
  const domain = normalizeShopDomain(shopDomain || "");
  if (!domain) {
    throw new Error("Dominio WooCommerce requerido");
  }
  const credential = await readWooCredential();
  const store = credential?.stores?.find((entry) => normalizeShopDomain(entry.shopDomain) === domain);
  if (!store) {
    throw new Error("Conexion WooCommerce no encontrada");
  }
  const consumerKey = String(store.consumerKey || "").trim();
  const consumerSecret = String(store.consumerSecret || "").trim();
  if (!consumerKey || !consumerSecret) {
    throw new Error("Credenciales WooCommerce requeridas");
  }
  return {
    shopDomain: normalizeShopDomain(store.shopDomain),
    consumerKey,
    consumerSecret,
    storeName: store.storeName || "",
    storeId: Number.isFinite(store.storeId as number) ? Number(store.storeId) : undefined,
  };
}

export async function getWooConnectionByStoreId(storeId: number) {
  if (!Number.isFinite(storeId)) {
    throw new Error("ID de tienda invalido");
  }
  const credential = await readWooCredential();
  const store = credential?.stores?.find((entry) => Number(entry.storeId) === Number(storeId));
  if (!store) {
    throw new Error("Conexion WooCommerce no encontrada para esta tienda");
  }
  const consumerKey = String(store.consumerKey || "").trim();
  const consumerSecret = String(store.consumerSecret || "").trim();
  if (!consumerKey || !consumerSecret) {
    throw new Error("Credenciales WooCommerce requeridas");
  }
  return {
    shopDomain: normalizeShopDomain(store.shopDomain),
    consumerKey,
    consumerSecret,
    storeName: store.storeName || "",
    storeId: Number(storeId),
  };
}

export async function upsertWooConnection(input: WooCommerceStoreInput) {
  const domain = normalizeShopDomain(input.shopDomain || "");
  if (!domain) {
    throw new Error("Dominio WooCommerce requerido");
  }
  await assertPublicHostname(domain);
  const consumerKey = String(input.consumerKey || "").trim();
  const consumerSecret = String(input.consumerSecret || "").trim();
  if (!consumerKey || !consumerSecret) {
    throw new Error("Consumer key y secret requeridos");
  }
  if (!WOO_CONSUMER_KEY_REGEX.test(consumerKey)) {
    throw new Error("Consumer key inválida (debe empezar con 'ck_' seguido de caracteres hex).");
  }
  if (!WOO_CONSUMER_SECRET_REGEX.test(consumerSecret)) {
    throw new Error("Consumer secret inválido (debe empezar con 'cs_' seguido de caracteres hex).");
  }
  if (!Number.isFinite(input.storeId as number)) {
    throw new Error("Selecciona una tienda para conectar WooCommerce.");
  }
  try {
    await testWooCommerce({ shopDomain: domain, consumerKey, consumerSecret });
  } catch (error) {
    const upstream = error instanceof Error ? error.message : "";
    throw new Error(
      `WooCommerce rechazó las credenciales antes de guardar. ${upstream ? `Detalle: ${upstream}` : ""}`.trim(),
      { cause: error }
    );
  }

  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const credential = (await readWooCredentialLocked(client)) || { stores: [] };
    const stores = Array.isArray(credential.stores) ? credential.stores : [];
    const existingIndex = stores.findIndex((entry) => normalizeShopDomain(entry.shopDomain) === domain);
    const record: WooCommerceStoreRecord = {
      shopDomain: domain,
      consumerKey,
      consumerSecret,
      storeName: input.storeName || "",
      storeId: input.storeId,
    };
    if (existingIndex >= 0) {
      stores[existingIndex] = record;
    } else {
      stores.push(record);
    }
    await upsertWooCredential({ stores }, client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  return { saved: true, shopDomain: domain };
}

export async function deleteWooConnectionByDomain(shopDomain: string) {
  const domain = normalizeShopDomain(shopDomain || "");
  if (!domain) {
    throw new Error("Dominio WooCommerce requerido");
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const credential = await readWooCredentialLocked(client);
    if (!credential?.stores?.length) {
      await client.query("COMMIT");
      return { deleted: false };
    }
    const stores = credential.stores.filter((entry) => normalizeShopDomain(entry.shopDomain) !== domain);
    if (stores.length === credential.stores.length) {
      await client.query("COMMIT");
      return { deleted: false };
    }
    await upsertWooCredential({ stores }, client);
    await client.query("COMMIT");
    return { deleted: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteWooConnectionsByStoreId(storeId: number) {
  if (!Number.isFinite(storeId)) {
    throw new Error("ID de tienda invalido");
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const credential = await readWooCredentialLocked(client);
    if (!credential?.stores?.length) {
      await client.query("COMMIT");
      return { deleted: false };
    }
    const stores = credential.stores.filter((entry) => Number(entry.storeId) !== Number(storeId));
    if (stores.length === credential.stores.length) {
      await client.query("COMMIT");
      return { deleted: false };
    }
    await upsertWooCredential({ stores }, client);
    await client.query("COMMIT");
    return { deleted: true };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
