-- 015_products_store_id.sql
-- Adds a store_id column to products so the catalog can be matched/deduped per
-- store across sources (Alegra import vs Shopify sync) instead of only by
-- shop_domain. This lets an Alegra-imported product and its Shopify counterpart
-- collapse into a single row (green "Sincronizado") rather than duplicating.

ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id integer;

CREATE INDEX IF NOT EXISTS products_org_store_idx ON products (organization_id, store_id);

-- Backfill store_id for rows imported under the synthetic `alegra-store-<id>` key.
UPDATE products
SET store_id = NULLIF(regexp_replace(shop_domain, '^alegra-store-', ''), shop_domain)::integer
WHERE store_id IS NULL
  AND shop_domain ~ '^alegra-store-[0-9]+$';
