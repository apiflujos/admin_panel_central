-- Interruptor por worker, controlado desde la vista de Super Admin.
--
-- Es GLOBAL a propósito (sin organization_id): los workers son procesos del
-- servidor, no viven dentro de una organización. Apagar uno lo apaga entero.
CREATE TABLE IF NOT EXISTS worker_settings (
  worker_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Se siembran los nueve EXPLÍCITAMENTE en lugar de dejarlos a un valor por
-- omisión del código.
--
-- Motivo: tras el despliegue el estado tiene que poder MIRARSE
-- (`SELECT * FROM worker_settings`), no deducirse leyendo TypeScript. Un
-- catálogo sin fila es un worker cuyo estado nadie puede comprobar antes de
-- arrancar, y este cliente ya perdió 1.028 publicaciones por dar por buena una
-- configuración que nadie había verificado.
--
-- ON CONFLICT DO NOTHING: si la tabla ya tenía decisiones tomadas, esta
-- migración NO las pisa.
INSERT INTO worker_settings (worker_key, enabled, updated_by) VALUES
  -- Facturación: encendida. Es lo único que el cliente pidió dejar corriendo.
  ('webhook-dispatch',      TRUE,  'migracion 019'),
  ('orders-sync',           TRUE,  'migracion 019'),
  ('retry-queue',           TRUE,  'migracion 019'),
  ('alegra-reconcile',      TRUE,  'migracion 019'),
  -- Mantenimiento: encendido. No toca las tiendas.
  ('billing-report',        TRUE,  'migracion 019'),
  ('log-retention',         TRUE,  'migracion 019'),
  ('health-monitor',        TRUE,  'migracion 019'),
  -- Los dos que MODIFICAN el catálogo de las tiendas: APAGADOS.
  -- Encenderlos es una decisión del cliente, no un efecto de desplegar.
  ('products-sync',         FALSE, 'migracion 019'),
  ('inventory-adjustments', FALSE, 'migracion 019')
ON CONFLICT (worker_key) DO NOTHING;
