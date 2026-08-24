# Deploy multi‑cliente

## Branches

- `main`: base común (**no se despliega**).
- `client/<cliente>`: cambios específicos del cliente (branch de producción).

## Nota para agentes IA

- Antes de modificar código, preguntar si el cambio va en `main` o en `client/<cliente>`.
- Ver `docs/TRANSITION_STATUS.md` antes de asumir que `admin-web` ya reemplazó al legacy.

## Base de datos

- Convención: `admin-central-<CLIENTE>`.
- Cada cliente apunta su `DATABASE_URL` a su propia BD.

## Migraciones

- Cambios globales (para todos): migraciones en `main`.
- Cambios específicos (solo un cliente): migraciones en `client/<cliente>`.
- (Los módulos MIM Postgres y Mongo se retiraron — sin importers reales.)

## Despliegue por carpeta (servidor)

Estructura recomendada:

```
/srv/apiflujos/
  <cliente>/
    admin_panel_central/
```

### Despliegue automatizado

Cada cliente puede tener su propio script de deploy. Para **Becam** existe `scripts/deploy-becam.sh` que automatiza todo el flujo: pull, instalación, creación de base de datos, generación de `.env`, build, migraciones y recarga PM2.

Ver instrucciones detalladas en [`docs/CLIENT_BECAM.md`](CLIENT_BECAM.md#deploy-producción-con-pm2).

Resumen:

```bash
cd /srv/apiflujos/becam/admin_panel_central
./scripts/deploy-becam.sh
```

La primera ejecución crea `/srv/apiflujos/becam/.deploy.env`; complétalo y vuelve a ejecutar. Después, cada deploy es:

```bash
./scripts/deploy-becam.sh
```

### Despliegue manual

Si prefieres no usar el script automatizado:

```
cd /srv/apiflujos/<cliente>/admin_panel_central
git fetch
git checkout client/<cliente>
git pull
npm ci
npm run build
npm run db:migrate
# reiniciar servicio con PM2 o systemd
```

## Despliegue con PM2

Flujo recomendado:

```
cd /opt/apps/admin-central-<cliente>
git fetch
git checkout client/<cliente>
git pull
npm ci
npm run build
npm run db:migrate
pm2 restart admin-central-<cliente>
```

Si manejas frontend nuevo y backend como procesos separados:

```
pm2 restart admin-central-api-<cliente>
pm2 restart admin-central-admin-web-<cliente>
```

Si separas también los jobs en un proceso dedicado:

```
pm2 restart admin-central-workers-<cliente>
```

Checks mínimos después del restart:

```
GET /health
GET /api/profile
GET /api/health   # si admin-web está desplegado
```

## Preflight (antes de subir)

- Confirmar rama: `client/<cliente>`.
- `.env` completo (usar `.env.example` como fuente de verdad).
- `APP_HOST` apunta al dominio correcto del cliente.
- `REDIS_URL` configurado (obligatorio).
- `OPS_ALERT_WEBHOOK_URL` configurado para que una avería avise fuera del propio panel.
- `DATABASE_URL` apunta a `admin-central-<CLIENTE>`.
- Si despliegas workers dedicados, el web debe llevar `RUN_WORKERS_IN_WEB=false`.

## Smoke básico (post-deploy)

- `GET /health` → ok
- Si `admin-web` está desplegado: `GET /api/health` en el frontend Next → ok
- `POST /api/auth/login` con admin
- `GET /api/profile`
- `GET /api/users`
- `GET /api/connections`
- `GET /api/woocommerce/connections`
- Si eres super admin: `GET /api/modules`

Luego correr:

```
npm run qa:smoke
```

Y si `admin-web` está desplegado:

```
BASE_URL=http://localhost:3100 ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass> npm run qa:admin-web
```

## Rollback rápido

```
git checkout client/<cliente>
git log --oneline -n 5
git checkout <COMMIT_ANTERIOR_ESTABLE>
npm ci
npm run build
# reiniciar servicio
```

## Actualizar con cambios de main

```
git checkout main
git pull
git checkout client/<cliente>
git merge main
```

## Dos capas de credenciales — importante para entender qué va en env vars y qué NO

**Capa 1 (env vars) — credenciales de LA APP, una vez por deploy, seteadas por el equipo dev.**
Son constantes por deploy: la Shopify App que TU equipo publicó en Shopify Partners, el secret de webhooks, la clave de cifrado, la conexión a la DB.

**Capa 2 (wizard de conexiones, cifradas en DB) — credenciales POR CLIENTE / TIENDA.**
El operador carga desde el UI: `access_token` de la tienda del cliente, email + API key Alegra, consumer key/secret Woo. Se cifran con `CRYPTO_KEY_BASE64` y viven en `shopify_stores.access_token_encrypted` / `alegra_accounts.api_key_encrypted` / tabla `credentials`. **NADA de esto se pone en env vars.**

## Variables de entorno (capa 1)

### Estrictamente obligatorias — fail-fast al startup

Solo estas dos. Sin ellas la app literalmente no puede persistir datos:

- `DATABASE_URL` — Postgres principal
- `CRYPTO_KEY_BASE64` — clave AES-256-GCM (32 bytes en base64) para cifrar credenciales de tenants

### Configuración Shopify — exclusivamente en base de datos

Los access tokens, Client ID, Client secret, scopes y secretos usados para validar
webhooks se guardan cifrados por tienda —o como respaldo global— desde el panel de
Configuración. Ninguna credencial Shopify se configura en `.env`.

`APP_HOST` sigue siendo configuración general del despliegue: sólo define la URL
pública usada como callback, no contiene credenciales Shopify.

### Opcionales por feature — el server arranca sin ellas, pero la feature no funciona

**Para recibir webhooks Alegra:**
- `ALEGRA_WEBHOOK_SECRET` — mismo criterio.

### Recomendadas (warning en prod si faltan, con defaults)

- `APP_PORT` — único puerto (default 10000)
- `ADMIN_WEB_URL` — URL pública del frontend nuevo
- `RUN_WORKERS_IN_WEB` — `true` por compatibilidad; poner `false` cuando exista proceso `worker` dedicado
- `APP_ORG_ID` — org fallback cuando NO hay sesión (AsyncLocalStorage tiene prioridad — desde Etapa 1)
- `REDIS_URL` — obligatorio si marketing/BullMQ está habilitado
- `RETRY_QUEUE_POLL_MS` — default `60000`. Setear `0` para deshabilitar el worker de retry-queue
- `MARKETING_CRON_TIMEZONE` — default `America/Bogota` (desde Etapa 9)
- `MARKETING_SYNC_MAX_MS` — default `300000` (5 min); time budget del sync marketing (desde Etapa 14)
- `SYNC_ORDERS_MAX_BULK` — default `5000`; cap duro de `POST /api/sync/orders` (desde Etapa 11)
- `INVENTORY_ADJUSTMENTS_MAX_DAYS_PER_TICK` — default `30`; cap del loop de días por tick (desde Etapa 9)

### Bypasses (solo dev)

Estas se ignoran en `NODE_ENV=production` con warning en logs:

- `ALLOW_UNVERIFIED_ALEGRA_WEBHOOKS=true` — idem Alegra (solo dev)
- `ALLOW_INTERNAL_HOSTS=true` — permite Woo a hostnames privados/localhost (solo dev)
- `ALEGRA_ITEM_CACHE_BOOTSTRAP_ON_WEBHOOK=true` — siembra cache Alegra items al recibir webhook aunque no estén tracked (útil al arrancar tenant nuevo)

### Migraciones a aplicar

Antes del primer restart tras estas etapas:

```
npm run db:migrate     # aplica 014_shopify_oauth_states_initiator.sql
```

## Cutover a una sola capa frontend

Esto sigue siendo un objetivo, no una suposición global. En `client/olivashoes`, hoy todavía opera el runtime legacy restaurado. El cutover correcto será:

1. desplegar `admin-web`
2. validar `GET /api/health` del frontend nuevo
3. definir:

```
ADMIN_WEB_URL=https://<frontend-nuevo>
```

4. reiniciar backend
5. validar que:
   - `/` redirige a `admin-web`
   - `/dashboard` redirige a `admin-web`
   - `/settings` redirige a `admin-web`
   - `/__sa` redirige a `admin-web`

Mientras eso no ocurra, el smoke funcional debe ejecutarse contra el backend legacy restaurado (`app`).

## Pool de Postgres (opcional)

- `DB_POOL_MAX` (default: 5)
- `DB_POOL_IDLE_TIMEOUT_MS` (default: 30000)
- `DB_POOL_CONNECTION_TIMEOUT_MS` (default: 5000)
- `DB_APP_NAME` (para identificar conexiones en Postgres)

## Variables de scripts (no runtime)

- `WEBHOOK_BASE_URL` se usa solo por `scripts/create-shopify-webhooks.js`.

## Docker Compose local

Servicios expuestos:

- `app` → `http://localhost:3006`
- `worker` → runtime de pollers/cron sin puerto HTTP
- `admin-web` → `http://localhost:3100` (cuando se use en transición o QA)

Comandos:

```
docker compose down
docker compose run --rm app npm run db:migrate
docker compose up -d --build app worker admin-web
docker compose ps
docker compose logs --tail=200
```

Checks:

```
GET http://localhost:3006/health
GET http://localhost:3100/api/health   # si admin-web está levantado
```

## Branding por cliente

- Estado actual en `client/olivashoes`: el branding operativo también se sirve desde `public/*`.
- Logo del cliente se configura en `Perfil empresa` (`/api/company`) y se muestra junto al logo de ApiFlujos.
- El retiro de esa superficie solo se hace cuando `admin-web` replique branding y flujos críticos.

## Super Admin (ApiFlujos)

- La primera cuenta se bootstrappea con `DEFAULT_SUPER_ADMIN_EMAIL/PASSWORD` (ver `src/sa/sa.bootstrap.ts`).
- Se pueden crear más super admins desde `Super Admin > Usuarios ApiFlujos` (`/api/sa/users`).
