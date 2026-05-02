import { NextResponse } from "next/server";

import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../../../../../../../src/db";
import { hashPassword } from "../../../../../../../src/services/auth.service";
import { routeHandler } from "../../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../../lib/route-auth";

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

export const PUT = routeHandler(async (req: Request, ctx) => {
  const currentUser = await requireRouteSuperAdmin();
  try {
    const pool = getPool();
    const orgId = getOrgId();
    await ensureOrganization(pool, orgId);
    await ensureUsersTables(pool);
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const userId = Number(params.userId);
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
    const body = (await req.json()) as Record<string, unknown>;
    const email = body.email ? normalizeEmail(String(body.email)) : current.email;
    const name = body.name !== undefined ? String(body.name || "").trim() || null : current.name;
    const phone = body.phone !== undefined ? String(body.phone || "").trim() || null : current.phone;
    const nextHash = body.password ? hashPassword(String(body.password)) : current.password_hash;
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
    return NextResponse.json({
      ok: true,
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        phone: row.phone,
        createdAt: row.created_at,
      },
      currentUserId: currentUser.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const DELETE = routeHandler(async (_req: Request, ctx) => {
  const currentUser = await requireRouteSuperAdmin();
  try {
    const pool = getPool();
    const orgId = getOrgId();
    await ensureOrganization(pool, orgId);
    await ensureUsersTables(pool);
    const params = (await (ctx.params ?? Promise.resolve({}))) as Record<string, string>;
    const userId = Number(params.userId);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error("Usuario no valido.");
    if (userId === currentUser.id) {
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
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
