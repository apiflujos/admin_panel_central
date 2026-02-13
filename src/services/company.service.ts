import { ensureOrganization, ensureUsersTables, getOrgId, getPool } from "../db";

type CompanyPayload = {
  name?: string;
  phone?: string;
  address?: string;
  logoBase64?: string;
};

type CompanyRow = {
  id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  logo_base64: string | null;
  created_at: Date;
};

export async function getCompanyProfile() {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const result = await pool.query<CompanyRow>(
    `
    SELECT id, name, phone, address, logo_base64, created_at
    FROM company_profiles
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  if (!result.rows.length) {
    return {
      name: "ApiFlujos",
      phone: "",
      address: "",
      logoBase64: "",
    };
  }
  const row = result.rows[0];
  return {
    name: row.name || "",
    phone: row.phone || "",
    address: row.address || "",
    logoBase64: row.logo_base64 || "",
  };
}

export async function saveCompanyProfile(payload: CompanyPayload) {
  const pool = getPool();
  const orgId = getOrgId();
  await ensureOrganization(pool, orgId);
  await ensureUsersTables(pool);
  const existing = await pool.query<{ id: number }>(
    `
    SELECT id
    FROM company_profiles
    WHERE organization_id = $1
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [orgId]
  );
  const name = payload.name?.trim() || null;
  const phone = payload.phone?.trim() || null;
  const address = payload.address?.trim() || null;
  const logo = payload.logoBase64 || null;
  if (existing.rows.length) {
    await pool.query(
      `
      UPDATE company_profiles
      SET name = $1,
          phone = $2,
          address = $3,
          logo_base64 = $4
      WHERE id = $5
      `,
      [name, phone, address, logo, existing.rows[0].id]
    );
  } else {
    await pool.query(
      `
      INSERT INTO company_profiles (organization_id, name, phone, address, logo_base64)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [orgId, name, phone, address, logo]
    );
  }
  return getCompanyProfile();
}
