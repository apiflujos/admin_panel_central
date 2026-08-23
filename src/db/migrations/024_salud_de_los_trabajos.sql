-- Si un trabajo automático falla, tiene que VERSE.
--
-- `log-retention` falló en TODAS sus pasadas durante un mes —unas 120 veces—
-- y nadie se enteró. El `catch` escribía un `console.error` y ahí moría: el
-- único testigo era un fichero de log que nadie lee, y encima la propia
-- retención rotaba los logs, así que la evidencia desaparecía sola.
--
-- El resultado fue quedarnos ciegos: `sync_logs` creció hasta 188 MB y 52.312
-- filas sin que ninguna pantalla lo dijera. El monitor de salud tampoco lo
-- vio, porque vigila métricas del negocio pero no si los propios trabajos
-- están funcionando.
--
-- A partir de aquí cada trabajo deja constancia de su última ejecución en la
-- base de datos, que sobrevive a los reinicios y a la rotación de logs.
ALTER TABLE worker_settings
  -- Cuándo corrió por última vez, terminara bien o mal. Si esto se queda
  -- viejo, el trabajo ha dejado de correr: también es una avería.
  ADD COLUMN IF NOT EXISTS ultima_ejecucion_at TIMESTAMPTZ,
  -- 'ok' | 'fallo'
  ADD COLUMN IF NOT EXISTS ultimo_resultado    TEXT,
  -- El mensaje del error, para no tener que ir a buscarlo al log.
  ADD COLUMN IF NOT EXISTS ultimo_error        TEXT,
  -- Cuándo terminó bien por última vez. Junto al contador dice desde cuándo
  -- está roto, que es la pregunta que de verdad importa.
  ADD COLUMN IF NOT EXISTS ultimo_exito_at     TIMESTAMPTZ,
  -- Fallos SEGUIDOS. Uno suelto es ruido; ciento veinte es una avería que
  -- lleva un mes. Vuelve a cero en cuanto una pasada termina bien.
  ADD COLUMN IF NOT EXISTS fallos_seguidos     INTEGER NOT NULL DEFAULT 0;

-- Para encontrar de un vistazo los trabajos averiados.
CREATE INDEX IF NOT EXISTS worker_settings_fallos_idx
  ON worker_settings (fallos_seguidos DESC)
  WHERE fallos_seguidos > 0;
