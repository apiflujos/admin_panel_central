import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../db";
import { hashPassword } from "./auth.service";

type SuperAdminPayload = {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  photoBase64?: string;
};

type SuperAdminRow = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  photo_base64: string | null;
  created_at: Date;
};

const normalizeEmail = (value?: string) => String(value || "").trim().toLowerCase();

export async function listSuperAdmins() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const result = await pool.query<SuperAdminRow>(
    `
    SELECT id, email, name, phone, photo_base64, created_at
    FROM users
    WHERE organization_id = $1 AND is_super_admin = true
    ORDER BY created_at DESC
    `,
    [orgId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    photoBase64: row.photo_base64,
    createdAt: row.created_at,
  }));
}

export async function createSuperAdmin(payload: SuperAdminPayload) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const email = normalizeEmail(payload.email);
  if (!email) {
    throw new Error("Email requerido.");
  }
  if (!payload.password) {
    throw new Error("Contrasena requerida.");
  }
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM users
    WHERE organization_id = $1 AND lower(email) = lower($2)
    LIMIT 1
    `,
    [orgId, email]
  );
  if (existing.rows.length) {
    throw new Error("El email ya existe.");
  }
  const passwordHash = hashPassword(payload.password);
  const name = payload.name?.trim() || null;
  const phone = payload.phone?.trim() || null;
  const photo = payload.photoBase64 || null;
  const result = await pool.query<SuperAdminRow>(
    `
    INSERT INTO users (organization_id, email, password_hash, role, is_super_admin, name, phone, photo_base64)
    VALUES ($1, $2, $3, 'super_admin', true, $4, $5, $6)
    RETURNING id, email, name, phone, photo_base64, created_at
    `,
    [orgId, email, passwordHash, name, phone, photo]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    photoBase64: row.photo_base64,
    createdAt: row.created_at,
  };
}

export async function updateSuperAdmin(userId: number, payload: SuperAdminPayload) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const result = await pool.query<SuperAdminRow & { password_hash: string }>(
    `
    SELECT id, email, name, phone, photo_base64, password_hash
    FROM users
    WHERE id = $1 AND organization_id = $2 AND is_super_admin = true
    LIMIT 1
    `,
    [userId, orgId]
  );
  if (!result.rows.length) {
    throw new Error("Usuario no encontrado.");
  }
  const current = result.rows[0];
  const email = payload.email ? normalizeEmail(payload.email) : current.email;
  if (email !== current.email) {
    const existing = await pool.query<{ id: number }>(
      `
      SELECT id
      FROM users
      WHERE organization_id = $1 AND lower(email) = lower($2)
      LIMIT 1
      `,
      [orgId, email]
    );
    if (existing.rows.length) {
      throw new Error("El email ya existe.");
    }
  }
  const name = payload.name !== undefined ? payload.name.trim() || null : current.name;
  const phone = payload.phone !== undefined ? payload.phone.trim() || null : current.phone;
  const photo = payload.photoBase64 !== undefined ? payload.photoBase64 || null : current.photo_base64;
  const nextHash = payload.password ? hashPassword(payload.password) : current.password_hash;
  const updated = await pool.query<SuperAdminRow>(
    `
    UPDATE users
    SET email = $1,
        name = $2,
        phone = $3,
        photo_base64 = $4,
        password_hash = $5
    WHERE id = $6 AND organization_id = $7 AND is_super_admin = true
    RETURNING id, email, name, phone, photo_base64, created_at
    `,
    [email, name, phone, photo, nextHash, userId, orgId]
  );
  const row = updated.rows[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    photoBase64: row.photo_base64,
    createdAt: row.created_at,
  };
}

export async function deleteSuperAdmin(userId: number, currentUserId: number) {
  if (userId === currentUserId) {
    throw new Error("No puedes eliminar tu propio usuario.");
  }
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const count = await pool.query<{ total: string }>(
    `
    SELECT COUNT(*) as total
    FROM users
    WHERE organization_id = $1 AND is_super_admin = true
    `,
    [orgId]
  );
  if (Number(count.rows[0]?.total || 0) <= 1) {
    throw new Error("Debe existir al menos un super admin.");
  }
  const result = await pool.query(
    `
    DELETE FROM users
    WHERE id = $1 AND organization_id = $2 AND is_super_admin = true
    `,
    [userId, orgId]
  );
  if (!result.rowCount) {
    throw new Error("Usuario no encontrado.");
  }
}
