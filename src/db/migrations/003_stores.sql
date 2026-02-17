CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

ALTER TABLE shopify_stores
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id);

ALTER TABLE shopify_store_configs
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id);

ALTER TABLE alegra_accounts
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id);

ALTER TABLE shopify_oauth_states
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id);

-- Backfill stores from existing Shopify connections.
INSERT INTO stores (organization_id, name)
SELECT DISTINCT organization_id, COALESCE(NULLIF(store_name, ''), shop_domain)
FROM shopify_stores
ON CONFLICT (organization_id, name) DO NOTHING;

-- Link Shopify stores to stores by name.
UPDATE shopify_stores s
SET store_id = st.id
FROM stores st
WHERE st.organization_id = s.organization_id
  AND st.name = COALESCE(NULLIF(s.store_name, ''), s.shop_domain)
  AND s.store_id IS NULL;

-- Link store configs to stores via Shopify stores.
UPDATE shopify_store_configs c
SET store_id = s.store_id
FROM shopify_stores s
WHERE c.organization_id = s.organization_id
  AND c.shop_domain = s.shop_domain
  AND c.store_id IS NULL;

-- Link Alegra accounts to stores via store configs (latest wins).
UPDATE alegra_accounts a
SET store_id = sub.store_id
FROM (
  SELECT DISTINCT ON (c.alegra_account_id) c.alegra_account_id, c.store_id
  FROM shopify_store_configs c
  WHERE c.alegra_account_id IS NOT NULL AND c.store_id IS NOT NULL
  ORDER BY c.alegra_account_id, c.created_at DESC
) sub
WHERE a.id = sub.alegra_account_id
  AND a.store_id IS NULL;
