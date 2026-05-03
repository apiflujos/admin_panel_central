ALTER TABLE products
ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE products
SET payload_json = '{}'::jsonb
WHERE payload_json IS NULL;
