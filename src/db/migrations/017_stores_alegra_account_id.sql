-- 017_stores_alegra_account_id.sql
-- Permite compartir UNA cuenta de Alegra entre VARIAS tiendas.
--
-- Antes: la cuenta se ligaba a una sola tienda vía alegra_accounts.store_id, así
-- que asociar la misma cuenta a una segunda tienda la "movía" (rompía la primera)
-- y la resolución por tienda quedaba inconsistente. Ahora cada tienda apunta a su
-- cuenta con stores.alegra_account_id, y varias tiendas pueden apuntar a la misma.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS alegra_account_id integer;

CREATE INDEX IF NOT EXISTS stores_alegra_account_idx ON stores (alegra_account_id);

-- Backfill: conserva los vínculos existentes (alegra_accounts.store_id -> stores).
UPDATE stores s
SET alegra_account_id = a.id
FROM alegra_accounts a
WHERE a.store_id = s.id
  AND s.alegra_account_id IS NULL;
