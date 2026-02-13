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

## Preflight (antes de subir)
- Confirmar rama: `client/<cliente>`.
- `.env` completo (usar `.env.example` como fuente de verdad).
- `APP_HOST` apunta al dominio correcto del cliente.
- `REDIS_URL` configurado (obligatorio).
- `DATABASE_URL` apunta a `admin-central-<CLIENTE>`.

## Smoke básico (post-deploy)
- `GET /health` → ok
- `POST /api/auth/login` con admin
- `GET /api/profile`
- `GET /api/users`
- `GET /api/connections`
- `GET /api/woocommerce/connections`
- Si eres super admin: `GET /api/modules`

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
- `DATABASE_URL` (Postgres principal)
- `REDIS_URL` (**obligatorio**)
- `MIM_DATABASE_URL` (opcional, sin migraciones)
- `MONGO_URL` (opcional, sin migraciones)

## Variables de scripts (no runtime)
- `WEBHOOK_BASE_URL` se usa solo por `scripts/create-shopify-webhooks.js`.

## Branding por cliente
- Archivo base: `public/brand.json` (versionado por branch).
- Se usa para títulos y textos (login, dashboard, asistente).
- Logo del cliente se configura en `Perfil empresa` (`/api/company`) y se muestra junto al logo de ApiFlujos.

## Super Admin (ApiFlujos)
- La primera cuenta se bootstrappea con `DEFAULT_SUPER_ADMIN_EMAIL/PASSWORD` (ver `src/sa/sa.bootstrap.ts`).
- Se pueden crear más super admins desde `Super Admin > Usuarios ApiFlujos` (`/api/sa/users`).
