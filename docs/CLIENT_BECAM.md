# Cliente becam

Branch dedicado: `client/becam` (derivado de `client/olivashoes`, hereda todas las mejoras de hardening de sync y limpieza de UI).

## Archivos propios de becam

| Archivo | Para qué sirve |
|---|---|
| `docker-compose.becam.yml` | Stack local independiente (puertos, contenedores y volúmenes propios — no choca con olivashoes) |
| `.env.becam.example` | Plantilla de variables; copiar a `.env.becam` y llenar con valores reales |
| `.env.becam` | Variables reales (gitignored — NO subir al repo) |

## Puertos locales

| Servicio | Olivashoes | **Becam** |
|---|---|---|
| admin-web | 3100 | **3200** |
| app | 3006 | **3007** |

Ambos clientes pueden correr en paralelo en la misma máquina. Postgres y Redis son internos al stack de cada cliente (volúmenes `postgres_data_becam` y `redis_data_becam`).

## Base de datos

- Nombre: `admin-central-becam`
- Conexión interna: `postgresql://admin:admin@postgres:5432/admin-central-becam`
- Cambia las credenciales en `docker-compose.becam.yml` antes de exponer el stack a una red compartida.

## Comandos típicos

Levantar todo:
```bash
docker compose -f docker-compose.becam.yml up -d --build
```

Estado:
```bash
docker compose -f docker-compose.becam.yml ps
```

Migraciones:
```bash
docker compose -f docker-compose.becam.yml exec app npm run db:migrate
```

Logs:
```bash
docker compose -f docker-compose.becam.yml logs -f --tail 100 admin-web app worker
```

Bajar:
```bash
docker compose -f docker-compose.becam.yml down
```

Reset destructivo (borra BD y Redis de becam, **no toca olivashoes**):
```bash
docker compose -f docker-compose.becam.yml down -v
```

## Smoke local

```bash
curl -sS http://localhost:3007/health
curl -sS http://localhost:3200/api/health
```

Login en `http://localhost:3200/auth/login` con `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos en `.env.becam`.

## Deploy producción con PM2

### Primera instalación en servidor

```bash
sudo mkdir -p /opt/apps/admin-central-becam
sudo chown $USER /opt/apps/admin-central-becam
cd /opt/apps/admin-central-becam

git clone https://github.com/apiflujos/admin_panel_central.git .
git checkout client/becam

cp .env.becam.example .env
nano .env   # rellenar valores reales (NO usar .env.becam.example tal cual)

npm ci
npm ci --prefix apps/admin-web
npm run build
SKIP_NEXT_VALIDATION=1 npm run build:admin-web
npm run db:migrate

pm2 start ecosystem.config.js
pm2 save
pm2 startup   # seguir las instrucciones para que sobreviva reboots
```

### Procesos PM2

`ecosystem.config.js` levanta 3 procesos:

| Nombre PM2 | Puerto | Script |
|---|---|---|
| `becam-api` | 3007 | `dist/src/server.js` |
| `becam-admin-web` | 3200 | `apps/admin-web/.next/standalone/.../server.js` |
| `becam-workers` | — | `dist/apps/workers/src/bootstrap.js` |

### Despliegues posteriores

```bash
cd /opt/apps/admin-central-becam
./scripts/deploy-becam.sh
```

El script encadena: `git fetch + pull` → `npm ci` → `build` → `db:migrate` → `pm2 reload` → smoke (`/health` + `/api/health`).

### Rollback

```bash
./scripts/deploy-becam.sh rollback <COMMIT_ESTABLE>
```

### Solo smoke

```bash
./scripts/deploy-becam.sh smoke
```

### Monitoreo

```bash
pm2 status
pm2 logs becam-api --lines 200
pm2 logs becam-admin-web --lines 200
pm2 logs becam-workers --lines 200
pm2 monit                # vista TUI con CPU/memoria
```

### Reverse proxy (Nginx ejemplo)

```nginx
server {
  server_name becam.tudominio.com;
  listen 443 ssl http2;
  # ... ssl_certificate y ssl_certificate_key ...

  location /api/webhooks/ {
    proxy_pass http://127.0.0.1:3007;   # backend recibe webhooks directamente
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
  }

  location / {
    proxy_pass http://127.0.0.1:3200;   # admin-web sirve el resto
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
  }
}
```

Con esto `APP_HOST=https://becam.tudominio.com` en `.env` permite que los webhooks de Shopify lleguen con HTTPS público.

## Actualizar con cambios de olivashoes o main

Si quieres traer una mejora hecha en olivashoes:
```bash
git checkout client/becam
git merge client/olivashoes
```

Si la mejora está en main:
```bash
git checkout client/becam
git merge main
```

## Branding

Los logos y colores del cliente se configuran en runtime en `Perfil empresa` (`/api/company`), no en código. El branch becam mantiene la estructura visual de olivashoes.
