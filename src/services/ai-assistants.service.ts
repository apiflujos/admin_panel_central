import { getPool, getOrgId } from "../db";

export type AiAssistant = {
  id: number;
  organization_id: number;
  name: string;
  avatar_url: string | null;
  description: string | null;
  n8n_url: string | null;
  politicas: string | null;
  instruccion: string | null;
  identidad: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listAiAssistants(orgId?: number) {
  const pool = getPool();
  const organization_id = orgId || getOrgId();
  const result = await pool.query<AiAssistant>(
    `
    SELECT * FROM ai_assistants
    WHERE organization_id = $1
    ORDER BY created_at DESC
    `,
    [organization_id]
  );
  return result.rows;
}

export async function createAiAssistant(data: Partial<AiAssistant>, orgId?: number) {
  const pool = getPool();
  const organization_id = orgId || getOrgId();
  const result = await pool.query<AiAssistant>(
    `
    INSERT INTO ai_assistants (
      organization_id, name, avatar_url, description, n8n_url,
      politicas, instruccion, identidad, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
    `,
    [
      organization_id,
      data.name || "Nuevo Asistente",
      data.avatar_url || null,
      data.description || null,
      data.n8n_url || null,
      data.politicas || null,
      data.instruccion || null,
      data.identidad || null,
      data.is_active !== undefined ? data.is_active : true,
    ]
  );
  return result.rows[0];
}

export async function updateAiAssistant(id: number, data: Partial<AiAssistant>, orgId?: number) {
  const pool = getPool();
  const organization_id = orgId || getOrgId();
  const result = await pool.query<AiAssistant>(
    `
    UPDATE ai_assistants
    SET
      name = COALESCE($1, name),
      avatar_url = COALESCE($2, avatar_url),
      description = COALESCE($3, description),
      n8n_url = COALESCE($4, n8n_url),
      politicas = COALESCE($5, politicas),
      instruccion = COALESCE($6, instruccion),
      identidad = COALESCE($7, identidad),
      is_active = COALESCE($8, is_active),
      updated_at = NOW()
    WHERE id = $9 AND organization_id = $10
    RETURNING *
    `,
    [
      data.name,
      data.avatar_url,
      data.description,
      data.n8n_url,
      data.politicas,
      data.instruccion,
      data.identidad,
      data.is_active,
      id,
      organization_id,
    ]
  );
  return result.rows[0];
}

export async function deleteAiAssistant(id: number, orgId?: number) {
  const pool = getPool();
  const organization_id = orgId || getOrgId();
  await pool.query(
    `
    DELETE FROM ai_assistants
    WHERE id = $1 AND organization_id = $2
    `,
    [id, organization_id]
  );
  return { ok: true };
}
