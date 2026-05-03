CREATE TABLE IF NOT EXISTS sync_runs (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  sync_id TEXT NOT NULL,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  meta_json JSONB,
  UNIQUE (organization_id, sync_id)
);

CREATE INDEX IF NOT EXISTS sync_runs_org_type_status_idx
  ON sync_runs (organization_id, sync_type, status, started_at DESC);
