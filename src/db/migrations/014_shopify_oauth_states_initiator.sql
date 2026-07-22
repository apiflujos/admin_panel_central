ALTER TABLE shopify_oauth_states
ADD COLUMN IF NOT EXISTS initiated_by_user_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_org_shop
  ON shopify_oauth_states (organization_id, shop_domain);
