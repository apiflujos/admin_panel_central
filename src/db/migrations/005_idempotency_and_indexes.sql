CREATE TABLE IF NOT EXISTS idempotency_keys (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, key)
);

CREATE UNIQUE INDEX IF NOT EXISTS retry_queue_sync_log_id_idx
  ON retry_queue (sync_log_id);

CREATE INDEX IF NOT EXISTS retry_queue_status_next_idx
  ON retry_queue (status, next_run_at);

CREATE INDEX IF NOT EXISTS sync_logs_order_id_idx
  ON sync_logs (organization_id, (request_json->>'orderId'), created_at DESC);

CREATE INDEX IF NOT EXISTS sync_logs_entity_dir_idx
  ON sync_logs (organization_id, entity, direction, created_at DESC);
