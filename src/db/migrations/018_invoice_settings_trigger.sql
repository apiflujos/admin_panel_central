-- Trigger de facturación: cuándo emitir la factura de un pedido.
--   'on_create'    -> al entrar el pedido (default, comportamiento previo)
--   'on_fulfilled' -> solo cuando el pedido está preparado (fulfilled) en Shopify
ALTER TABLE invoice_settings
  ADD COLUMN IF NOT EXISTS invoice_trigger TEXT DEFAULT 'on_create';
