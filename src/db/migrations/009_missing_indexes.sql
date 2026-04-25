-- Missing indexes for production performance

-- shopify_stores: lookups by organization + domain
CREATE INDEX IF NOT EXISTS shopify_stores_org_domain_idx
  ON shopify_stores (organization_id, shop_domain);

-- credentials: already has unique constraint from 008, add covering index
CREATE INDEX IF NOT EXISTS credentials_org_provider_idx
  ON credentials (organization_id, provider);

-- users: unique email per organization + fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS users_org_email_idx
  ON users (organization_id, lower(email));

-- user_sessions: token lookups must be fast
CREATE INDEX IF NOT EXISTS user_sessions_token_idx
  ON user_sessions (token);

-- idempotency_keys: cleanup by updated_at for stale-key purge
CREATE INDEX IF NOT EXISTS idempotency_keys_updated_at_idx
  ON idempotency_keys (organization_id, updated_at)
  WHERE status = 'processing';

-- contacts: org-level listing
CREATE INDEX IF NOT EXISTS contacts_org_idx
  ON contacts (organization_id);

-- orders: org + shopify_order_id for lookups and status filter
CREATE INDEX IF NOT EXISTS orders_org_shopify_idx
  ON orders (organization_id, shopify_order_id);

-- sync_logs: already indexed but add direction for filtered queries
CREATE INDEX IF NOT EXISTS sync_logs_org_entity_direction_idx
  ON sync_logs (organization_id, entity, direction, created_at DESC);
