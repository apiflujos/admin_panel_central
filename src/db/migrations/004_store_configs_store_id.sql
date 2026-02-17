ALTER TABLE shopify_store_configs
  ALTER COLUMN shop_domain DROP NOT NULL;

CREATE INDEX IF NOT EXISTS shopify_store_configs_store_id_idx
  ON shopify_store_configs (organization_id, store_id);

CREATE UNIQUE INDEX IF NOT EXISTS shopify_store_configs_store_unique
  ON shopify_store_configs (organization_id, store_id)
  WHERE store_id IS NOT NULL;
