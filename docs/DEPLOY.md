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
- MIM Postgres y Mongo **no** usan migraciones (solo lectura/escritura sobre estructuras existentes).

## Despliegue por carpeta (servidor)

Estructura recomendada:

```
/srv/apiflujos/
  <cliente>/
    admin_panel_central/
```

### Despliegue automatizado

El repo incluye `scripts/deploy.sh` para desplegar/actualizar un cliente con un solo comando.

Requisitos previos:

- PM2 instalado globalmente (`npm i -g pm2`).
- Base de datos Postgres creada previamente (convención: `admin-central-<CLIENTE>`).
- Variables requeridas exportadas la primera vez (para generar `.env`).

Variables requeridas la primera ejecución:

- `APP_HOST`: URL pública del cliente (ej. `https://admin-becam.ejemplo.com`).
- `DATABASE_URL`: URL de Postgres (ej. `postgresql://user:pass@host:5432/admin-central-becam`).
- `ADMIN_EMAIL`: email del super admin inicial.
- `ADMIN_PASSWORD`: password del super admin inicial.

Ejemplo para Becam:

```bash
cd /srv/apiflujos/becam/admin_panel_central

APP_HOST=https://admin-becam.ejemplo.com \
DATABASE_URL=postgresql://user:password@localhost:5432/admin-central-becam \
ADMIN_EMAIL=admin@becam.com \
ADMIN_PASSWORD='CambiaMe123!' \
  ./scripts/deploy.sh
```

El script realiza:

1. Verifica que esté en la branch `client/<cliente>`.
2. Hace `git pull origin client/<cliente>`.
3. Instala dependencias con `npm ci`.
4. Genera `.env` si no existe (con secrets aleatorios) o lo conserva si ya existe.
5. Compila con `npm run build`.
6. Ejecuta migraciones con `npm run db:migrate`.
7. Inicia o recarga el proceso en PM2 (`admin-central-<cliente>`).
8. Guarda la lista de PM2 (`pm2 save`).

En despliegues posteriores basta con exportar las mismas variables o, si `.env` ya existe, ejecutar directamente:

```bash
./scripts/deploy.sh
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

## Variables clave

- `APP_PORT` (único puerto)
- `APP_HOST` (única URL pública base, incluye esquema; usada por OAuth y webhooks)
- `ADMIN_WEB_URL` (URL pública del frontend nuevo)
- `RUN_WORKERS_IN_WEB` (`true` por compatibilidad; poner `false` cuando exista proceso `worker`)
- `DATABASE_URL` (Postgres principal)
- `REDIS_URL` (**obligatorio**)
- `MIM_DATABASE_URL` (opcional, sin migraciones)
- `MONGO_URL` (opcional, sin migraciones)

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
