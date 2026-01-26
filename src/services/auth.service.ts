import crypto from "crypto";
import { decryptString, encryptString } from "../utils/crypto";
import { ensureOrganization, getOrgId, getPool } from "../db";

let sessionToken: string | null = null;

export const AUTH_COOKIE_NAME = "os_session";

const AUTH_PROVIDER = "auth";

export async function authenticateUser(email: string, password: string) {
  const allowedEmail = process.env.ADMIN_EMAIL || "admin@olivashoes.com";
  const allowedPassword = await getAllowedPassword();
  if (email === allowedEmail && password === allowedPassword) {
    sessionToken = crypto.randomBytes(24).toString("hex");
    return sessionToken;
  }
  return null;
}

export function clearSession() {
  sessionToken = null;
}

export function isValidSession(token: string | undefined | null) {
  if (!token || !sessionToken) return false;
  return token === sessionToken;
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const allowedPassword = await getAllowedPassword();
  if (currentPassword !== allowedPassword) {
    return { ok: false, message: "Contrasena actual incorrecta." };
  }
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  const payload = encryptString(JSON.stringify({ password: newPassword }));
  await upsertCredential(pool, orgId, AUTH_PROVIDER, payload);
  return { ok: true };
}

async function getAllowedPassword() {
  try {
    const stored = await readCredential(AUTH_PROVIDER);
    if (stored?.password) {
      return stored.password;
    }
  } catch {
    // fall back to env/default if DB is not available
  }
  return process.env.ADMIN_PASSWORD || "Olivia2026*";
}

async function readCredential(provider: string) {
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
    [orgId, provider]
  );
  if (!result.rows.length) {
    return null;
  }
  const decrypted = decryptString(result.rows[0].data_encrypted);
  return JSON.parse(decrypted) as { password?: string };
}

async function upsertCredential(
  pool: ReturnType<typeof getPool>,
  orgId: number,
  provider: string,
  dataEncrypted: string
) {
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id FROM credentials
    WHERE organization_id = $1 AND provider = $2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, provider]
  );
  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE credentials
      SET data_encrypted = $1
      WHERE id = $2
      `,
      [dataEncrypted, existing.rows[0].id]
    );
    return;
  }
  await pool.query(
    `
    INSERT INTO credentials (organization_id, provider, data_encrypted)
    VALUES ($1, $2, $3)
    `,
    [orgId, provider, dataEncrypted]
  );
}
