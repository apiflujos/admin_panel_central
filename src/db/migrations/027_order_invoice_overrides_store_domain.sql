ALTER TABLE order_invoice_overrides
  ADD COLUMN IF NOT EXISTS shop_domain TEXT NOT NULL DEFAULT '';

-- Solo atribuimos un dominio cuando el pedido identifica una única tienda.
-- Los históricos ambiguos permanecen en '' para no asociarlos a la tienda equivocada.
WITH unambiguous_orders AS (
  SELECT organization_id, shopify_order_id, MIN(shop_domain) AS shop_domain
  FROM orders
  WHERE shopify_order_id IS NOT NULL AND shop_domain IS NOT NULL AND shop_domain <> ''
  GROUP BY organization_id, shopify_order_id
  HAVING COUNT(DISTINCT shop_domain) = 1
)
UPDATE order_invoice_overrides override_row
SET shop_domain = source.shop_domain
FROM unambiguous_orders source
WHERE override_row.organization_id = source.organization_id
  AND override_row.order_id = source.shopify_order_id
  AND override_row.shop_domain = '';

ALTER TABLE order_invoice_overrides
  DROP CONSTRAINT IF EXISTS order_invoice_overrides_organization_id_order_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS order_invoice_overrides_org_shop_order_uq
  ON order_invoice_overrides (organization_id, shop_domain, order_id);
