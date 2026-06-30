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

## Deploy en servidor

Sigue el flujo de `docs/DEPLOY.md`, ajustando:
- `cd /opt/apps/admin-central-becam`
- `git checkout client/becam`
- `.env` apunta a la BD productiva de becam (no usar `.env.becam` del repo de dev)
- PM2: `pm2 restart admin-central-becam`

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
