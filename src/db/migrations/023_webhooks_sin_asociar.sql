-- Lo que recibimos y NO pudimos asociar a nada.
--
-- Si nos suscribimos a un webhook, recibirlo ya es un compromiso: no se puede
-- escuchar y luego hacer como si no hubiera pasado nada. Hasta ahora había
-- cinco puntos en la entrada que respondían 200 y no guardaban NADA:
-- tienda desconocida, tienda eliminada, cuenta de Alegra sin resolver, cuerpo
-- ilegible y firma inválida. Sólo quedaba un `console.warn`.
--
-- La consecuencia práctica: no se recibió jamás un webhook de Alegra, y no
-- había forma de saber si es que no llegan o si llegan y los tiramos. Eso se
-- acaba aquí.
--
-- Esta tabla NO tiene organization_id obligatorio a propósito. Precisamente el
-- caso que no podíamos guardar era el de un webhook cuya organización no
-- sabemos resolver: meterlo en `webhook_events` es imposible porque allí la
-- columna es NOT NULL con clave foránea.
CREATE TABLE IF NOT EXISTS webhooks_sin_asociar (
  id               SERIAL PRIMARY KEY,
  -- Se guarda si se logró resolver; NULL es un caso válido y esperado.
  organization_id  INTEGER REFERENCES organizations(id),
  source           TEXT NOT NULL,
  event_type       TEXT NOT NULL DEFAULT '',
  shop_domain      TEXT NOT NULL DEFAULT '',
  account_id       TEXT NOT NULL DEFAULT '',
  -- Código estable para agrupar, contar y explicar en la pantalla.
  motivo           TEXT NOT NULL,
  detalle          TEXT,
  -- El cuerpo tal cual llegó. NULL cuando la firma es inválida: ese endpoint
  -- lo puede llamar cualquiera, y guardar cuerpos no autenticados es una vía
  -- para llenarnos el disco.
  payload_json     JSONB,
  -- Los repetidos se agregan en vez de crear una fila por cada uno: una tienda
  -- mal configurada puede mandar miles y lo que importa es el hecho y cuántos.
  veces            INTEGER NOT NULL DEFAULT 1,
  primera_vez      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_vez       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Gestión humana: quién lo revisó y qué decidió.
  atendido_at      TIMESTAMPTZ,
  atendido_por     INTEGER,
  notas            TEXT
);

-- Clave de agregación. Un mismo problema (misma tienda, mismo evento, mismo
-- motivo) es UNA fila con su contador, no mil filas iguales.
CREATE UNIQUE INDEX IF NOT EXISTS webhooks_sin_asociar_clave_idx
  ON webhooks_sin_asociar (source, motivo, shop_domain, account_id, event_type);

-- Para la pantalla: primero lo no atendido, y lo más reciente arriba.
CREATE INDEX IF NOT EXISTS webhooks_sin_asociar_pendientes_idx
  ON webhooks_sin_asociar (atendido_at, ultima_vez DESC);

-- Por qué falló un webhook que SÍ pudimos asociar.
--
-- El motivo vivía sólo en `sync_logs`, mezclado con todo lo demás y sin forma
-- barata de cruzarlo con el evento. Al ponerlo aquí, la pantalla puede listar
-- «esto llegó, esto falló, por esto» sin recorrer el histórico de registros.
ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS error_motivo  TEXT,
  ADD COLUMN IF NOT EXISTS error_detalle TEXT;

-- Para listar rápido lo que quedó pendiente o falló.
CREATE INDEX IF NOT EXISTS webhook_events_org_status_idx
  ON webhook_events (organization_id, status, received_at DESC);
