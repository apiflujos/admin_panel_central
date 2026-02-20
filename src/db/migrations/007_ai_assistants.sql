CREATE TABLE IF NOT EXISTS ai_assistants (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  description TEXT,
  n8n_url TEXT,
  politicas TEXT,
  instruccion TEXT,
  identidad TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_assistants_org ON ai_assistants(organization_id);
