import crypto from "crypto";
import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../db";
import { getSuperAdminEmail, getSuperAdminPassword } from "../sa/sa.bootstrap";

export const AUTH_COOKIE_NAME = "os_session";

const DEFAULT_ADMIN_EMAIL = "sebastian@apiflujos.com";
const DEFAULT_ADMIN_PASSWORD = "Poderoso1980";
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_DIGEST = "sha512";

type UserRecord = {
  id: number;
  organization_id: number;
  email: string;
  password_hash: string;
  role: "admin" | "agent" | "super_admin";
  is_super_admin: boolean;
  name: string | null;
  phone: string | null;
  photo_base64: string | null;
};

export async function authenticateUser(email: string, password: string, remember = false) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  await ensureSuperAdmin(pool);
  await ensureDefaultAdmin(pool, orgId);

  const normalizedEmail = email.trim();
  const isSuperAdminLogin = normalizedEmail.toLowerCase() === getSuperAdminEmail();

  const result = await pool.query<UserRecord>(
    `
    SELECT id, organization_id, email, password_hash, role, is_super_admin, name, phone, photo_base64
    FROM users
    WHERE lower(email) = lower($1)
      AND ($2::boolean = true OR organization_id = $3)
    ORDER BY is_super_admin DESC, id ASC
    LIMIT 1
    `,
    [normalizedEmail, isSuperAdminLogin, orgId]
  );
  if (!result.rows.length) {
    return null;
  }
  const user = result.rows[0];
  if (!verifyPassword(password, user.password_hash)) {
    return null;
  }
  // Super admin must match both flags (email + is_super_admin).
  if (isSuperAdminLogin && !user.is_super_admin) {
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

export async function createTempToken(userId: number, ttlMinutes = 30) {
  const pool = getPool();
  await ensureUsersTables(pool);
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await pool.query(
    `
    INSERT INTO user_sessions (user_id, token, expires_at)
    VALUES ($1, $2, $3)
    `,
    [userId, token, expiresAt]
  );
  return { token, expiresAt };
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
    SELECT u.id, u.organization_id, u.email, u.password_hash, u.role, u.is_super_admin, u.name, u.phone, u.photo_base64, s.expires_at
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
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && (!adminEmail || !adminPassword)) {
    console.warn("WARNING: Falta ADMIN_EMAIL/ADMIN_PASSWORD para bootstrap de admin en producción. Se omite creación de admin.");
    return;
  }
  const effectiveEmail = adminEmail || DEFAULT_ADMIN_EMAIL;
  const effectivePassword = adminPassword || DEFAULT_ADMIN_PASSWORD;
  if (!isProd && (!adminEmail || !adminPassword)) {
    console.warn(
      "WARNING: Usando credenciales admin por defecto (dev). Define ADMIN_EMAIL y ADMIN_PASSWORD antes de desplegar."
    );
  }
  const passwordHash = hashPassword(effectivePassword);
  await pool.query(
    `
    INSERT INTO users (organization_id, email, password_hash, role, name)
    VALUES ($1, $2, $3, 'admin', $4)
    `,
    [orgId, effectiveEmail, passwordHash, "Sebastian"]
  );
}

async function ensureSuperAdmin(pool: ReturnType<typeof getPool>) {
  const email = getSuperAdminEmail();
  const password = getSuperAdminPassword();
  const orgId = 1;
  await ensureOrganization(pool, orgId);

  const existing = await pool.query<{ id: number; is_super_admin: boolean }>(
    `
    SELECT id, is_super_admin
    FROM users
    WHERE organization_id = $1 AND lower(email) = lower($2)
    LIMIT 1
    `,
    [orgId, email]
  );
  const passwordHash = hashPassword(password);
  if (existing.rows.length) {
    const row = existing.rows[0];
    if (row && row.id) {
      await pool.query(
        `
        UPDATE users
        SET password_hash = $1,
            role = 'super_admin',
            is_super_admin = true,
            name = COALESCE(NULLIF(name,''), 'Super Admin')
        WHERE id = $2
        `,
        [passwordHash, row.id]
      );
      return;
    }
  }

  await pool.query(
    `
    INSERT INTO users (organization_id, email, password_hash, role, is_super_admin, name)
    VALUES ($1, $2, $3, 'super_admin', true, 'Super Admin')
    `,
    [orgId, email, passwordHash]
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
  const derivedBuffer = Buffer.from(derived, "utf8");
  const hashBuffer = Buffer.from(hash, "utf8");
  if (derivedBuffer.length !== hashBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedBuffer, hashBuffer);
}
