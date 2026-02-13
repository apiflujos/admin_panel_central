import { encryptString, decryptString } from "../utils/crypto";
import { ensureOrganization, getOrgId, getPool } from "../db";

export type WooCommerceStoreInput = {
  shopDomain: string;
  consumerKey: string;
  consumerSecret: string;
  storeName?: string;
};

type WooCommerceStoreRecord = {
  shopDomain: string;
  consumerKey: string;
  consumerSecret: string;
  storeName?: string;
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

async function readWooCredential() {
  const pool = getPool();
  const orgId = getOrgId();
  const result = await pool.query<{ data_encrypted: string }>(
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
  try {
    return JSON.parse(decryptString(result.rows[0].data_encrypted)) as WooCommerceCredentialPayload;
  } catch (error) {
    if (isCryptoKeyMisconfigured(error)) {
      throw new Error("Configuracion de seguridad invalida. Revisa CRYPTO_KEY_BASE64 en el servidor.");
    }
    throw new Error("No se pudo leer la conexion de WooCommerce. Vuelve a conectar.");
  }
}

async function upsertWooCredential(payload: WooCommerceCredentialPayload) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const encrypted = encryptString(JSON.stringify(payload));

  const existing = await pool.query<{ id: number }>(
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
    await pool.query(
      `
      UPDATE credentials
      SET data_encrypted = $1
      WHERE id = $2
      `,
      [encrypted, existing.rows[0].id]
    );
    return;
  }

  await pool.query(
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
  return {
    stores: stores.map((store) => ({
      shopDomain: store.shopDomain,
      storeName: store.storeName || "",
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
  };
}

export async function upsertWooConnection(input: WooCommerceStoreInput) {
  const domain = normalizeShopDomain(input.shopDomain || "");
  if (!domain) {
    throw new Error("Dominio WooCommerce requerido");
  }
  const consumerKey = String(input.consumerKey || "").trim();
  const consumerSecret = String(input.consumerSecret || "").trim();
  if (!consumerKey || !consumerSecret) {
    throw new Error("Consumer key y secret requeridos");
  }

  const credential = (await readWooCredential()) || { stores: [] };
  const stores = Array.isArray(credential.stores) ? credential.stores : [];
  const existingIndex = stores.findIndex((entry) => normalizeShopDomain(entry.shopDomain) === domain);
  const record: WooCommerceStoreRecord = {
    shopDomain: domain,
    consumerKey,
    consumerSecret,
    storeName: input.storeName || "",
  };
  if (existingIndex >= 0) {
    stores[existingIndex] = record;
  } else {
    stores.push(record);
  }

  await upsertWooCredential({ stores });
  return { saved: true, shopDomain: domain };
}

export async function deleteWooConnectionByDomain(shopDomain: string) {
  const domain = normalizeShopDomain(shopDomain || "");
  if (!domain) {
    throw new Error("Dominio WooCommerce requerido");
  }
  const credential = await readWooCredential();
  if (!credential?.stores?.length) {
    return { deleted: false };
  }
  const stores = credential.stores.filter(
    (entry) => normalizeShopDomain(entry.shopDomain) !== domain
  );
  if (stores.length === credential.stores.length) {
    return { deleted: false };
  }
  await upsertWooCredential({ stores });
  return { deleted: true };
}
