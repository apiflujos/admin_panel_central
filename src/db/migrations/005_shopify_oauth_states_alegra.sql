ALTER TABLE shopify_oauth_states
ADD COLUMN IF NOT EXISTS alegra_account_id INTEGER;
