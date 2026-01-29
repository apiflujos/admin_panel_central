import crypto from "crypto";
import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../db";

export const AUTH_COOKIE_NAME = "os_session";

const DEFAULT_ADMIN_EMAIL = "sebastian@apiflujos.com";
const DEFAULT_ADMIN_PASSWORD = "Poderoso1980";
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_DIGEST = "sha512";

type UserRecord = {
  id: number;
  email: string;
  password_hash: string;
  role: "admin" | "agent";
  name: string | null;
  phone: string | null;
  photo_base64: string | null;
};

export async function authenticateUser(email: string, password: string, remember = false) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  await ensureDefaultAdmin(pool, orgId);
  const result = await pool.query<UserRecord>(
    `
    SELECT id, email, password_hash, role, name, phone, photo_base64
    FROM users
    WHERE organization_id = $1 AND lower(email) = lower($2)
    LIMIT 1
    `,
    [orgId, email.trim()]
  );
  if (!result.rows.length) {
    return null;
  }
  const user = result.rows[0];
  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }
  const token = crypto.randomBytes(24).toString("hex");
  const maxAgeMs = remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8;
  const expiresAt = new Date(Date.now() + maxAgeMs);
  await pool.query(
    `
    INSERT INTO user_sessions (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    `,
    [user.id, token, expiresAt]
  );
  return { token, user, maxAgeMs };
}

export async function clearSession(token: string) {
  const pool = getPool();
  await ensureUsersTables(pool);
  await pool.query(
    `
    DELETE FROM user_sessions
    WHERE token = $1
    `,
    [token]
  );
}

export async function getSessionUser(token: string | undefined | null) {
  if (!token) return null;
  const pool = getPool();
  await ensureUsersTables(pool);
  const result = await pool.query<
    UserRecord & { expires_at: Date }
  >(
    `
    SELECT u.id, u.email, u.password_hash, u.role, u.name, u.phone, u.photo_base64, s.expires_at
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = $1
    LIMIT 1
    `,
    [token]
  );
  if (!result.rows.length) {
    return null;
  }
  const session = result.rows[0];
  if (session.expires_at.getTime() < Date.now()) {
    await clearSession(token);
    return null;
  }
  await pool.query(
    `
    UPDATE user_sessions
    SET last_seen = NOW()
    WHERE token = $1
    `,
    [token]
  );
  return session;
}

export async function updatePassword(userId: number, currentPassword: string, newPassword: string) {
  const pool = getPool();
  await ensureUsersTables(pool);
  const result = await pool.query<{ password_hash: string }>(
    `
    SELECT password_hash
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  );
  if (!result.rows.length) {
    return { ok: false, message: "Usuario no encontrado." };
  }
  const stored = result.rows[0].password_hash;
  if (!verifyPassword(currentPassword, stored)) {
    return { ok: false, message: "Contrasena actual incorrecta." };
  }
  const nextHash = hashPassword(newPassword);
  await pool.query(
    `
    UPDATE users
    SET password_hash = $1
    WHERE id = $2
    `,
    [nextHash, userId]
  );
  return { ok: true };
}

async function ensureDefaultAdmin(pool: ReturnType<typeof getPool>, orgId: number) {
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM users
    WHERE organization_id = $1
    LIMIT 1
    `,
    [orgId]
  );
  if (existing.rows.length) {
    return;
  }
  const passwordHash = hashPassword(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD);
  await pool.query(
    `
    INSERT INTO users (organization_id, email, password_hash, role, name)
    VALUES ($1, $2, $3, 'admin', $4)
    `,
    [orgId, process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL, passwordHash, "Sebastian"]
  );
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 64, PASSWORD_DIGEST)
    .toString("hex");
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [prefix, iterationsStr, salt, hash] = stored.split("$");
  if (prefix !== "pbkdf2" || !iterationsStr || !salt || !hash) {
    return false;
  }
  const iterations = Number(iterationsStr);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }
  const derived = crypto
    .pbkdf2Sync(password, salt, iterations, 64, PASSWORD_DIGEST)
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
}
