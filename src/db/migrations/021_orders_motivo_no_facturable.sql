-- Por qué un pedido NO se puede facturar, y desde cuándo.
--
-- Los requisitos de una factura los pone la DIAN, no la configuración: sin
-- identificación del cliente la factura no puede existir. Antes eso se
-- descubría al recibir un 400 de Alegra, y el pedido volvía a intentarse en
-- cada pasada: 37 pedidos generaron 611 intentos fallidos en una semana.
--
-- Ahora el veredicto se guarda aquí. `sync_status = 'no_facturable'` hace que
-- el worker NO vuelva a intentarlo, y `sync_block_reason` explica qué falta y
-- cómo se arregla, para poder mostrarlo en la pantalla de operaciones.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS sync_block_reason JSONB;

-- Para listar rápido los pedidos atascados por falta de datos.
CREATE INDEX IF NOT EXISTS orders_org_sync_status_idx
  ON orders (organization_id, sync_status);
