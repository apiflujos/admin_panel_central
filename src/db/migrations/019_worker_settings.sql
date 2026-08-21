-- Interruptor por worker, controlado desde la vista de Super Admin.
--
-- Es GLOBAL a propósito (sin organization_id): los workers son procesos del
-- servidor, no viven dentro de una organización. Apagar uno lo apaga entero.
--
-- Sin fila para un worker vale su valor por omisión del catálogo
-- (packages/shared/src/workers.ts). Los que escriben en la tienda nacen apagados.
CREATE TABLE IF NOT EXISTS worker_settings (
  worker_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);
