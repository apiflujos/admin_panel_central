-- Los mapeos históricos de pedidos no guardaban tienda. En una organización
-- con Becam y Belia eso hacía que una búsqueda por orderId pudiera devolver el
-- mapeo de la otra tienda. Sólo se rellenan casos inequívocos: mismo pedido y,
-- cuando existe, misma factura de Alegra.
WITH candidatos AS (
  SELECT sm.id, min(o.shop_domain) AS shop_domain
    FROM sync_mappings sm
    JOIN orders o
      ON o.organization_id = sm.organization_id
     AND o.shopify_order_id = regexp_replace(sm.shopify_id, '^.*/', '')
     AND (sm.alegra_id IS NULL OR o.alegra_invoice_id IS NULL OR o.alegra_invoice_id = sm.alegra_id)
   WHERE sm.entity = 'order'
     AND sm.metadata_json->>'shopDomain' IS NULL
     AND o.shop_domain <> ''
   GROUP BY sm.id
  HAVING count(DISTINCT o.shop_domain) = 1
)
UPDATE sync_mappings sm
   SET metadata_json = coalesce(sm.metadata_json, '{}'::jsonb)
                       || jsonb_build_object('shopDomain', candidatos.shop_domain)
  FROM candidatos
 WHERE sm.id = candidatos.id;

CREATE INDEX IF NOT EXISTS sync_mappings_order_store_shopify_idx
  ON sync_mappings (organization_id, (metadata_json->>'shopDomain'), shopify_id)
  WHERE entity = 'order';
