import { NextResponse } from "next/server";

import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../../../../../../src/db";
import { hashPassword } from "../../../../../../src/services/auth.service";
import { routeHandler } from "../../../../lib/route-handler";
import { requireRouteSuperAdmin } from "../../../../lib/route-auth";

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

export const GET = routeHandler(async () => {
  await requireRouteSuperAdmin();
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
    return NextResponse.json({
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
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const POST = routeHandler(async (req: Request) => {
  await requireRouteSuperAdmin();
  try {
    const pool = getPool();
    const orgId = getOrgId();
    await ensureOrganization(pool, orgId);
    await ensureUsersTables(pool);
    const body = (await req.json()) as Record<string, unknown>;
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const password = String(body.password || "");
    const name = body.name ? String(body.name).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
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
    return NextResponse.json(
      {
        ok: true,
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          phone: row.phone,
          createdAt: row.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No disponible";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});
