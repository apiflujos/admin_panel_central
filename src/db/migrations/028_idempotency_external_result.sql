ALTER TABLE idempotency_keys
  ADD COLUMN IF NOT EXISTS result_json JSONB;
