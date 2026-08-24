-- Un proceso PM2 puede figurar "online" aunque el runtime de trabajos no haya
-- arrancado correctamente. Este latido permite que /health/ready compruebe que
-- el proceso de workers sigue ejecutando su bucle, no sólo que existe un PID.
CREATE TABLE IF NOT EXISTS worker_runtime_heartbeat (
  runtime_key TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  process_id INTEGER
);
