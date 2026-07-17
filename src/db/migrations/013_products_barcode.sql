-- Add barcode to products so Alegra<->Shopify matching can merge rows by
-- reference OR sku OR barcode (previously barcode was only used at variant
-- level during sync and never persisted for product-row merging).
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE INDEX IF NOT EXISTS products_org_barcode_idx
  ON products (organization_id, barcode)
  WHERE barcode IS NOT NULL;
