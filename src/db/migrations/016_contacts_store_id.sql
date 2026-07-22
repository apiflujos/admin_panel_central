-- 016_contacts_store_id.sql
-- Mirrors 015 for contacts: a store_id column so contacts can be matched/deduped
-- per store across sources (Alegra import vs Shopify) instead of only by
-- shop_domain, collapsing an Alegra contact and its Shopify counterpart into one
-- row (green "Sincronizado") instead of duplicating.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS store_id integer;

CREATE INDEX IF NOT EXISTS contacts_org_store_idx ON contacts (organization_id, store_id);

UPDATE contacts
SET store_id = NULLIF(regexp_replace(shop_domain, '^alegra-store-', ''), shop_domain)::integer
WHERE store_id IS NULL
  AND shop_domain ~ '^alegra-store-[0-9]+$';
