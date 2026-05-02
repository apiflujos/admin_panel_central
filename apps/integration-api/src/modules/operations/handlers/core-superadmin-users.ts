import type { Request, Response } from "express";

import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../../../../../../src/db";
import { hashPassword } from "../../../../../../src/services/auth.service";

type SaUserRow = {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  created_at: Date;
};

const normalizeEmail = (value?: string) =>
  String(value || "")
    .trim()
    .toLowerCase();

function getCurrentUserId(req: Request) {
  return Number(req.user?.id || 0);
}

export async function saListUsersHandler(_req: Request, res: Response) {
  try {
    const pool = getPool();
    const orgId = getOrgId();
    await ensureOrganization(pool, orgId);
    await ensureUsersTables(pool);
    const result = await pool.query<SaUserRow>(
      `
      SELECT id, email, name, phone, created_at
      FROM users
      WHERE organization_id = $1 AND is_super_admin = true
      ORDER BY created_at DESC
      `,
      [orgId]
    );
    res.status(200).json({
      items: result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function saCreateUserHandler(req: Request, res: Response) {
  try {
    const pool = getPool();
    const orgId = getOrgId();
    await ensureOrganization(pool, orgId);
    await ensureUsersTables(pool);
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const name = req.body?.name ? String(req.body.name).trim() : null;
    const phone = req.body?.phone ? String(req.body.phone).trim() : null;
    if (!email) throw new Error("Email requerido.");
    if (!password) throw new Error("Contrasena requerida.");
    const passwordHash = hashPassword(password);
    const created = await pool.query<SaUserRow>(
      `
      INSERT INTO users (organization_id, email, password_hash, role, is_super_admin, name, phone)
      VALUES ($1, $2, $3, 'super_admin', true, $4, $5)
      RETURNING id, email, name, phone, created_at
      `,
      [orgId, email, passwordHash, name, phone]
    );
    const row = created.rows[0]!;
    res.status(201).json({
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function saUpdateUserHandler(req: Request, res: Response) {
  try {
    const pool = getPool();
    const orgId = getOrgId();
    await ensureOrganization(pool, orgId);
    await ensureUsersTables(pool);
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error("Usuario no valido.");
    const result = await pool.query<SaUserRow & { password_hash: string }>(
      `
      SELECT id, email, name, phone, created_at, password_hash
      FROM users
      WHERE id = $1 AND organization_id = $2 AND is_super_admin = true
      LIMIT 1
      `,
      [userId, orgId]
    );
    if (!result.rows.length) throw new Error("Usuario no encontrado.");
    const current = result.rows[0]!;
    const email = req.body?.email ? normalizeEmail(req.body.email) : current.email;
    const name = req.body?.name !== undefined ? String(req.body.name || "").trim() || null : current.name;
    const phone = req.body?.phone !== undefined ? String(req.body.phone || "").trim() || null : current.phone;
    const nextHash = req.body?.password ? hashPassword(String(req.body.password)) : current.password_hash;
    const updated = await pool.query<SaUserRow>(
      `
      UPDATE users
      SET email = $1,
          name = $2,
          phone = $3,
          password_hash = $4,
          role = 'super_admin',
          is_super_admin = true
      WHERE id = $5 AND organization_id = $6
      RETURNING id, email, name, phone, created_at
      `,
      [email, name, phone, nextHash, userId, orgId]
    );
    const row = updated.rows[0]!;
    res.status(200).json({
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone,
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}

export async function saDeleteUserHandler(req: Request, res: Response) {
  try {
    const pool = getPool();
    const orgId = getOrgId();
    await ensureOrganization(pool, orgId);
    await ensureUsersTables(pool);
    const userId = Number(req.params.userId);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error("Usuario no valido.");
    const currentUserId = getCurrentUserId(req);
    if (userId === currentUserId) {
      throw new Error("No puedes eliminar tu propio usuario.");
    }
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
    await pool.query(
      `
      DELETE FROM users
      WHERE id = $1 AND organization_id = $2 AND is_super_admin = true
      `,
      [userId, orgId]
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    res.status(400).json({ error: message });
  }
}
