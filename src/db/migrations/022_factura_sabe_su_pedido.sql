-- De qué pedido salió cada factura de Alegra.
--
-- `alegra_invoices` no tenía forma de saberlo: 660 facturas registradas y
-- ninguna apuntaba a su pedido. El vínculo sólo existía en el otro sentido
-- (`orders.alegra_invoice_id`), y sólo para los pedidos que llegaron a
-- facturarse desde aquí.
--
-- Sin esto, ante una factura en Alegra no hay manera de responder a "¿de qué
-- pedido es?", que es justo lo que hace falta cuando algo no cuadra.
ALTER TABLE alegra_invoices
  ADD COLUMN IF NOT EXISTS shopify_order_id TEXT;

CREATE INDEX IF NOT EXISTS alegra_invoices_org_order_idx
  ON alegra_invoices (organization_id, shopify_order_id)
  WHERE shopify_order_id IS NOT NULL;

-- Se recupera el vínculo de lo que ya hay: los pedidos que sí guardaron su
-- número de factura. No inventa nada; sólo copia lo conocido.
UPDATE alegra_invoices ai
   SET shopify_order_id = o.shopify_order_id
  FROM orders o
 WHERE o.organization_id = ai.organization_id
   AND o.alegra_invoice_id IS NOT NULL
   AND o.alegra_invoice_id = ai.alegra_invoice_id
   AND ai.shopify_order_id IS NULL;
