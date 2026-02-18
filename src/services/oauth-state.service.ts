import crypto from "crypto";
import { getOrgId, getPool } from "../db";

type OAuthStatePayload = Record<string, unknown> | null;

export async function createOAuthState(provider: string, payload: OAuthStatePayload = null) {
  const pool = getPool();
  const orgId = getOrgId();
  const nonce = crypto.randomBytes(16).toString("hex");
  await pool.query(
    `
    INSERT INTO oauth_states (organization_id, provider, nonce, payload_json)
    VALUES ($1, $2, $3, $4)
    `,
    [orgId, provider, nonce, payload || {}]
  );
  return nonce;
}

export async function consumeOAuthState(provider: string, nonce: string) {
  const pool = getPool();
  const orgId = getOrgId();
  const res = await pool.query<{ id: number; payload_json: OAuthStatePayload }>(
    `
    SELECT id, payload_json
    FROM oauth_states
    WHERE organization_id = $1 AND provider = $2 AND nonce = $3
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId, provider, nonce]
  );
  if (!res.rows.length) {
    return { ok: false as const, payload: null };
  }
  const row = res.rows[0];
  await pool.query(`DELETE FROM oauth_states WHERE id = $1`, [row.id]);
  return { ok: true as const, payload: row.payload_json || {} };
}
