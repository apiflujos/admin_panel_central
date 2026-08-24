# Integración Alegra ↔ Shopify

Plataforma multi-tenant que sincroniza catálogo, inventario, contactos, órdenes y facturación entre **Shopify** y **Alegra** (más opcional WooCommerce y plataformas de Ads). Cada cliente vive en su propia rama `client/<nombre>` con su propia base de datos `admin-central-<nombre>` y su propio stack aislado.

- **Backend**: Node.js + Express + Postgres + Redis + BullMQ
- **Frontend**: Next.js 15 (App Router) bajo `apps/admin-web`
- **Workers**: BullMQ + pollers en `apps/workers`
- **Multi-tenant**: una rama por cliente, una BD por cliente

---

## Clientes en este repo

| Cliente | Rama | DB | Compose | Puertos local |
|---|---|---|---|---|
| **olivashoes** | `client/olivashoes` | `admin-central-olivashoes` | `docker-compose.yml` | app **3006**, admin-web **3100** |
| **becam** | `client/becam` | `admin-central-becam` | `docker-compose.becam.yml` | puerto único **3007** |

> Ambos clientes pueden correr a la vez en la misma máquina sin chocar (puertos, contenedores y volúmenes separados).

---

## Quick start — cliente becam (local)

```bash
# 1. Clonar y entrar
git clone https://github.com/apiflujos/admin_panel_central.git
cd admin_panel_central
git checkout client/becam

# 2. Configurar variables del cliente
cp .env.becam.example .env.becam
# Editar .env.becam con: ADMIN_EMAIL, ADMIN_PASSWORD, CRYPTO_KEY_BASE64,
# ALEGRA_WEBHOOK_SECRET, etc. Shopify se configura cifrado en la BD desde el panel.

# 3. Levantar el stack aislado
docker compose -f docker-compose.becam.yml up -d --build

# 4. Migraciones
docker compose -f docker-compose.becam.yml exec app npm run db:migrate

# 5. Smoke
curl http://localhost:3007/health
curl http://localhost:3007/health/ready     # Postgres + migraciones + Redis
curl http://localhost:3007/api/health       # admin-web embebido
```

Login en `http://localhost:3007/auth/login`.

---

## Deploy producción con PM2 — cliente becam

### Requisitos del servidor
- Node.js ≥ 22 LTS
- PM2 global (`npm i -g pm2`)
- Postgres ≥ 14 accesible (BD `admin-central-becam` creada)
- Redis ≥ 6 accesible
- HTTPS público (Nginx/Caddy/Cloudflare) apuntando al puerto único de la aplicación

### Primera instalación

```bash
# 1. Estructura recomendada
sudo mkdir -p /opt/apps/admin-central-becam
sudo chown $USER /opt/apps/admin-central-becam
cd /opt/apps/admin-central-becam

# 2. Clonar y posicionar en la rama
git clone https://github.com/apiflujos/admin_panel_central.git .
git checkout client/becam

# 3. .env productivo (NO se commitea)
cp .env.becam.example .env
nano .env   # rellenar valores reales del cliente

# 4. Instalar y compilar
npm ci
npm run build
npm run build:admin-web

# 5. Migraciones contra la BD productiva
npm run db:migrate

# 6. Arrancar PM2 con el ecosystem incluido
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # seguir las instrucciones que imprime para systemd

# 7. Verificar
curl http://localhost:3007/health
curl http://localhost:3007/health/ready
curl http://localhost:3007/api/health
pm2 status
```

### Procesos PM2

Definidos en `ecosystem.config.js`:

| Nombre PM2 | Script | Puerto | Notas |
|---|---|---|---|
| `becam-api` | `dist/src/server.js` | 3007 | Express + Next.js embebido + rutas legacy |
| `becam-workers` | `dist/apps/workers/src/bootstrap.js` | — | Pollers + BullMQ |

> `ecosystem.config.js` precarga `.env` desde la raíz y lo propaga a los dos procesos. Next.js corre dentro de `becam-api`; no existe un proceso ni puerto admin-web separado.

### Despliegues subsiguientes

```bash
cd /opt/apps/admin-central-becam
./scripts/deploy-becam.sh
```

El script prepara dependencias y builds en directorios de staging, los intercambia
atómicamente y después ejecuta `db:migrate` → `pm2 reload` → smoke. Interrumpirlo
con `Ctrl+C` antes del intercambio no altera la versión que está atendiendo
usuarios.

### Rollback

```bash
./scripts/deploy-becam.sh rollback <COMMIT_ESTABLE>
# o manualmente:
git checkout <COMMIT_ESTABLE>
npm ci && npm run build && pm2 reload ecosystem.config.js
```

---

## Migraciones

Tracker: tabla `schema_migrations` (filename + applied_at).

| # | Archivo | Descripción |
|---|---|---|
| 001 | `001_baseline.sql` | Tablas iniciales (organizations, users, mappings, sync_logs, etc) |
| 002 | `002_connection_tests.sql` | Histórico de tests de conexión |
| 003 | `003_stores.sql` | Multi-tienda por organización |
| 004 | `004_store_configs_store_id.sql` | Config por tienda |
| 005 | `005_shopify_oauth_states_alegra.sql` | OAuth Shopify + vínculo Alegra |
| 006 | `006_inventory_rules_allow_oversell.sql` | Reglas de inventario |
| 007 | `007_ai_assistants.sql` | Asistentes AI |
| 008 | `008_credentials_unique_updated_at.sql` | Unique constraint + auditoría |
| 009 | `009_missing_indexes.sql` | Indexes faltantes |
| 010 | `010_sync_runs.sql` | Tracking de runs de sync con cancel |
| 011 | `011_products_payload_json.sql` | JSONB en products |
| 012 | `012_webhook_receipts.sql` | Dedup de webhooks |

`npm run db:migrate` aplica las pendientes en orden. **El app NO auto-aplica schema.**

---

## Variables `.env` clave

Ver `.env.becam.example` para la lista completa. Mínimas para arrancar:

| Variable | Por qué |
|---|---|
| `APP_HOST` | URL pública con esquema (`https://...`). La usan OAuth y webhooks |
| `APP_PORT` | Puerto del backend (becam: `3006` interno, expuesto en `3007`) |
| `ADMIN_WEB_URL` | URL pública del frontend |
| `DATABASE_URL` | Postgres (admin-central-becam) |
| `REDIS_URL` | **Obligatorio**, sin esto el app no arranca |
| `CRYPTO_KEY_BASE64` | 32 bytes b64. **No cambiar** una vez hay credenciales cifradas en BD |
| `OPS_ALERT_WEBHOOK_URL` | Receptor externo de alertas operativas; recomendado en producción |
| `CSRF_SECRET` | String largo aleatorio |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap del admin inicial |
| `ALEGRA_WEBHOOK_SECRET` | Verificación de webhooks Alegra |
| `RUN_WORKERS_IN_WEB` | `false` cuando los workers corren en proceso aparte |

> Generar `CRYPTO_KEY_BASE64`:
> `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

Las dos cuentas Shopify, sus tokens y las credenciales de sus apps se administran
desde **Configuración** y se guardan cifradas en PostgreSQL. No se duplican en `.env`.

---

## Smoke post-deploy

```bash
# Salud básica
curl https://<dominio-cliente>/health
curl https://<dominio-cliente>/api/health

# Sin sesión deben redirigir al login, nunca responder 500
curl -o /dev/null -w '%{http_code}\n' https://<dominio-cliente>/settings/connections
curl -o /dev/null -w '%{http_code}\n' https://<dominio-cliente>/orders

# Login + endpoints (necesita .env del cliente)
npm run qa:smoke
BASE_URL=https://<dominio-cliente> ADMIN_EMAIL=<email> ADMIN_PASSWORD=<pass> npm run qa:admin-web
```

Rutas para revisar manualmente en producción:
- `/` (dashboard)
- `/products` (tabla padre + variantes)
- `/orders`, `/invoices`, `/contacts`, `/operations`
- `/settings/connections` (estado Shopify/Alegra/Ads)
- `/logs` (sync_logs)

---

## Comandos útiles

```bash
# Estado de procesos
pm2 status
pm2 logs becam-api --lines 100
pm2 logs becam-workers --lines 100

# Recargar sin downtime
pm2 reload ecosystem.config.js

# Ver memoria/CPU
pm2 monit

# Apagado total (mantenimiento)
pm2 stop ecosystem.config.js
```

---

## Hardenings de producción ya aplicados

La rama `client/becam` (derivada de `client/olivashoes`) incluye:

- **Advisory lock por orden** en webhooks Shopify (`pg_advisory_lock`) — sin races entre entregas concurrentes.
- **Dedup de webhooks** por `x-shopify-webhook-id` / `x-alegra-webhook-id` (tabla `webhook_receipts`).
- **`verifyAlegraSignature` endurecido**: rechaza sin firma a menos que `ALLOW_UNVERIFIED_ALEGRA_WEBHOOKS=true`.
- **Backoff exponencial** (2s→4s→8s→16s) en búsquedas Alegra ante 429.
- **Checkpoints** cada 25 productos en bulk products→alegra (resume tras cancel/error).
- **Restart unless-stopped** en todos los contenedores Docker.

---

## Estructura

```
/
├── apps/
│   ├── admin-web/          Next.js 15 frontend
│   └── workers/            BullMQ + pollers
├── packages/
│   ├── domain/             Lógica de dominio pura (pricing, matching)
│   └── shared/             DTOs entre backend y frontend
├── src/
│   ├── api/                Rutas Express legacy
│   ├── services/           Lógica de sync Shopify ↔ Alegra
│   ├── connectors/         Clientes Shopify/Alegra/WooCommerce
│   ├── jobs/               BullMQ jobs
│   ├── db/migrations/      SQL migrations numeradas
│   └── scripts/            db-migrate + helpers CLI
├── docs/
│   ├── DEPLOY.md           Guía multi-tenant general
│   ├── CLIENT_BECAM.md     Guía específica de becam
│   └── INTEGRATIONS.md     Integraciones Shopify/Alegra
├── docker-compose.yml      Stack local olivashoes (3006/3100)
├── docker-compose.becam.yml Stack local becam (puerto único 3007)
├── ecosystem.config.js     Configuración PM2 para becam
├── scripts/deploy-becam.sh Script de deploy + rollback
└── .env.becam.example      Template de variables becam
```

---

## Documentación adicional

- [docs/DEPLOY.md](docs/DEPLOY.md) — Guía multi-tenant general
- [docs/CLIENT_BECAM.md](docs/CLIENT_BECAM.md) — Operación día a día becam
- [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) — Detalles Shopify/Alegra
- [docs/QA.md](docs/QA.md) — Smoke checks
- [docs/TRANSITION_STATUS.md](docs/TRANSITION_STATUS.md) — Estado del rework admin-web

---

## Para agentes IA

Antes de tocar código, leer:
- `AGENTS.md`
- `docs/DEPLOY.md`
- `.env.example` (template general) o `.env.becam.example` (becam)

Y **preguntar al humano** si el cambio va en:
- `main` (base común — no se despliega)
- `client/olivashoes`
- `client/becam`
- u otra rama de cliente
