import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../db";
import { hashPassword } from "./auth.service";

type UserRole = "admin" | "agent";

type UserPayload = {
  email?: string;
  password?: string;
  role?: UserRole;
  name?: string;
  phone?: string;
  photoBase64?: string;
};

type UserRow = {
  id: number;
  email: string;
  role: UserRole;
  name: string | null;
  phone: string | null;
  photo_base64: string | null;
  created_at: Date;
};

const normalizeEmail = (value?: string) => String(value || "").trim().toLowerCase();

const normalizeRole = (value?: string): UserRole =>
  value === "admin" ? "admin" : "agent";

export async function listUsers() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const result = await pool.query<UserRow>(
    `
    SELECT id, email, role, name, phone, photo_base64, created_at
    FROM users
    WHERE organization_id = $1
    ORDER BY created_at DESC
    `,
    [orgId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    phone: row.phone,
    photoBase64: row.photo_base64,
    createdAt: row.created_at,
  }));
}

export async function createUser(payload: UserPayload) {
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
  const role = normalizeRole(payload.role);
  const passwordHash = hashPassword(payload.password);
  const name = payload.name?.trim() || null;
  const phone = payload.phone?.trim() || null;
  const photo = payload.photoBase64 || null;
  const result = await pool.query<UserRow>(
    `
    INSERT INTO users (organization_id, email, password_hash, role, name, phone, photo_base64)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, email, role, name, phone, photo_base64, created_at
    `,
    [orgId, email, passwordHash, role, name, phone, photo]
  );
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    phone: row.phone,
    photoBase64: row.photo_base64,
    createdAt: row.created_at,
  };
}

export async function updateUser(userId: number, payload: UserPayload) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const result = await pool.query<UserRow & { password_hash: string }>(
    `
    SELECT id, email, role, name, phone, photo_base64, password_hash
    FROM users
    WHERE id = $1 AND organization_id = $2
    LIMIT 1
    `,
    [userId, orgId]
  );
  if (!result.rows.length) {
    throw new Error("Usuario no encontrado.");
  }
  const current = result.rows[0];
  const email = payload.email ? normalizeEmail(payload.email) : current.email;
  const role = payload.role ? normalizeRole(payload.role) : current.role;
  if (current.role === "admin" && role !== "admin") {
    const adminCount = await pool.query<{ total: string }>(
      `
      SELECT COUNT(*) as total
      FROM users
      WHERE organization_id = $1 AND role = 'admin'
      `,
      [orgId]
    );
    if (Number(adminCount.rows[0]?.total || 0) <= 1) {
      throw new Error("Debe existir al menos un administrador.");
    }
  }
  const name = payload.name !== undefined ? payload.name.trim() || null : current.name;
  const phone = payload.phone !== undefined ? payload.phone.trim() || null : current.phone;
  const photo = payload.photoBase64 !== undefined ? payload.photoBase64 || null : current.photo_base64;
  const nextHash = payload.password ? hashPassword(payload.password) : current.password_hash;
  const updated = await pool.query<UserRow>(
    `
    UPDATE users
    SET email = $1,
        role = $2,
        name = $3,
        phone = $4,
        photo_base64 = $5,
        password_hash = $6
    WHERE id = $7 AND organization_id = $8
    RETURNING id, email, role, name, phone, photo_base64, created_at
    `,
    [email, role, name, phone, photo, nextHash, userId, orgId]
  );
  const row = updated.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    phone: row.phone,
    photoBase64: row.photo_base64,
    createdAt: row.created_at,
  };
}

export async function deleteUser(userId: number, currentUserId: number) {
  if (userId === currentUserId) {
    throw new Error("No puedes eliminar tu propio usuario.");
  }
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const roleResult = await pool.query<{ role: UserRole }>(
    `
    SELECT role
    FROM users
    WHERE id = $1 AND organization_id = $2
    LIMIT 1
    `,
    [userId, orgId]
  );
  if (roleResult.rows[0]?.role === "admin") {
    const adminCount = await pool.query<{ total: string }>(
      `
      SELECT COUNT(*) as total
      FROM users
      WHERE organization_id = $1 AND role = 'admin'
      `,
      [orgId]
    );
    if (Number(adminCount.rows[0]?.total || 0) <= 1) {
      throw new Error("Debe existir al menos un administrador.");
    }
  }
  await pool.query(
    `
    DELETE FROM users
    WHERE id = $1 AND organization_id = $2
    `,
    [userId, orgId]
  );
}

export async function updateProfile(userId: number, payload: UserPayload) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const result = await pool.query<UserRow & { password_hash: string }>(
    `
    SELECT id, email, role, name, phone, photo_base64, password_hash
    FROM users
    WHERE id = $1 AND organization_id = $2
    LIMIT 1
    `,
    [userId, orgId]
  );
  if (!result.rows.length) {
    throw new Error("Usuario no encontrado.");
  }
  const current = result.rows[0];
  const email = payload.email ? normalizeEmail(payload.email) : current.email;
  const name = payload.name !== undefined ? payload.name.trim() || null : current.name;
  const phone = payload.phone !== undefined ? payload.phone.trim() || null : current.phone;
  const photo = payload.photoBase64 !== undefined ? payload.photoBase64 || null : current.photo_base64;
  const updated = await pool.query<UserRow>(
    `
    UPDATE users
    SET email = $1,
        name = $2,
        phone = $3,
        photo_base64 = $4
    WHERE id = $5 AND organization_id = $6
    RETURNING id, email, role, name, phone, photo_base64, created_at
    `,
    [email, name, phone, photo, userId, orgId]
  );
  const row = updated.rows[0];
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    phone: row.phone,
    photoBase64: row.photo_base64,
    createdAt: row.created_at,
  };
}
