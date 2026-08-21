-- Índice que faltaba para el listado de registros.
--
-- `listSyncLogs` ordena por `created_at DESC` filtrando sólo por organización.
-- El índice existente es (organization_id, status, created_at): sin `status` en
-- el WHERE no sirve, así que Postgres hacía un escaneo secuencial con ordenación
-- sobre 53.000 filas / 215 MB (medido: 41 ms y 7.175 bloques leídos de disco).
CREATE INDEX IF NOT EXISTS sync_logs_org_created_idx
  ON sync_logs (organization_id, created_at DESC);

-- Índice DUPLICADO: `sync_logs_entity_dir_idx` y `sync_logs_org_entity_direction_idx`
-- tienen exactamente las mismas columnas en el mismo orden. Mantener los dos sólo
-- encarece cada escritura en la tabla que más escribe el sistema.
DROP INDEX IF EXISTS sync_logs_entity_dir_idx;
