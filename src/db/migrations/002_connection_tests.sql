CREATE TABLE IF NOT EXISTS connection_tests (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  request_json JSONB,
  response_json JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS connection_tests_org_provider_idx
  ON connection_tests (organization_id, provider);
