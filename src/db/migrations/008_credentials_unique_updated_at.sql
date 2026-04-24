-- Deduplicar credenciales manteniendo la más reciente por (organization_id, provider)
DELETE FROM credentials
WHERE id NOT IN (
  SELECT DISTINCT ON (organization_id, provider) id
  FROM credentials
  ORDER BY organization_id, provider, created_at DESC
);

-- Constraint único para evitar filas duplicadas al reconectar
ALTER TABLE credentials
  ADD CONSTRAINT credentials_org_provider_unique UNIQUE (organization_id, provider);

-- Columna updated_at para ON CONFLICT DO UPDATE
ALTER TABLE credentials
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
