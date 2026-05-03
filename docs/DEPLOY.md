# Deploy multi‑cliente

## Branches

- `main`: base común (**no se despliega**).
- `client/<cliente>`: cambios específicos del cliente (branch de producción).

## Nota para agentes IA

- Antes de modificar código, preguntar si el cambio va en `main` o en `client/<cliente>`.

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
/opt/apps/
  admin-central-<cliente>/
```

Pasos por cliente:

```
cd /opt/apps/admin-central-<cliente>
git fetch
git checkout client/<cliente>
git pull
npm ci
npm run build
npm run db:migrate
# reiniciar servicio
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
- `DATABASE_URL` (Postgres principal)
- `REDIS_URL` (**obligatorio**)
- `MIM_DATABASE_URL` (opcional, sin migraciones)
- `MONGO_URL` (opcional, sin migraciones)

## Cutover a una sola capa frontend

El backend ya no debe servir `public/index.html`. La operación correcta es:

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
- `admin-web` → `http://localhost:3100`

Comandos:

```
docker compose down
docker compose up -d --build
docker compose ps
docker compose logs --tail=200
```

Checks:

```
GET http://localhost:3006/health
GET http://localhost:3100/api/health
```

## Branding por cliente

- El frontend operativo vive en `apps/admin-web`.
- Logo del cliente se configura en `Perfil empresa` (`/api/company`) y se muestra junto al logo de ApiFlujos.

## Super Admin (ApiFlujos)

- La primera cuenta se bootstrappea con `DEFAULT_SUPER_ADMIN_EMAIL/PASSWORD` (ver `src/sa/sa.bootstrap.ts`).
- Se pueden crear más super admins desde `Super Admin > Usuarios ApiFlujos` (`/api/sa/users`).
