# AI Agent Guide (Codex/Gemini/Claude)

## Required reading (must read before coding)
- `README.md`
- `AGENTS.md`
- `docs/DEPLOY.md`
- `docs/INTEGRATIONS.md`
- `docs/QA.md`
- `.env.example`

## Obligatorio antes de cambiar codigo
- Preguntar al humano si el cambio va en **main** (base comun) o en un **cliente** (`client/<cliente>`).
- Si no hay respuesta clara, **no** modificar archivos.

This repo is a Node.js + TypeScript backend for a Shopify ↔ Alegra middleware, plus marketing/analytics modules.
Use this guide to generate correct code changes and documentation.

## Quick start (local)
- Copy `.env.example` to `.env` and fill values.
- Install deps: `npm install`
- Run dev: `npm run dev`
- Migrate DB: `npm run db:migrate:dev`

## Production workflow
- Build: `npm run build`
- Migrate: `npm run db:migrate`
- Start: `npm start`

## Environment variables
- Source of truth: `.env.example`
- Port: **only** `APP_PORT`
- Redis: **required** (`REDIS_URL` must exist or app fails to start)
- Primary Postgres: `DATABASE_URL`
- Secondary Postgres (MIM): `MIM_DATABASE_URL` (no migrations)
- MongoDB: `MONGO_URL` (no migrations)

## Database & migrations
- Only migrations in `src/db/migrations/` should change the main schema.
- No runtime auto‑repair.
- Current baseline: `001_baseline.sql`.
- MIM Postgres + Mongo: **read/write only** on existing structures; **never** run CREATE/ALTER/DROP.

## Redis
- Required for queues and marketing jobs.
- No fallback to in‑process execution when Redis is missing.

## Project structure (high level)
- `src/server.ts`: app entrypoint
- `src/db/`: primary Postgres access + migrations runner
- `src/db/mim.ts`: MIM Postgres pool (secondary DB)
- `src/mongo/`: Mongo client helpers
- `src/jobs/`: cron/pollers (marketing, sync, billing)
- `src/api/`: HTTP controllers
- `src/services/`: domain services
- `public/`: assets usados por la app (versionados)
- `recursos/`: material no usado por el código (gitignored)
- Future integrations: WooCommerce and other order sources (design for extensibility).

## Multi‑client strategy
- `main` is **never deployed**; it is the shared base only.
- Deploy **only** from `client/<cliente>` branches (they inherit `main` + client changes).
- DB naming: `admin-central-<CLIENTE>`.
- Each client deploys from its branch into its own folder with its own `.env`.

### Migration policy (multi‑cliente)
- Shared improvements for **all** clients → add migrations in `main`.
- Client‑specific schema changes → add migrations **only** in that client's branch.
- Do not run migrations against MIM Postgres or Mongo.

## Coding rules for agents
- Keep changes minimal and targeted.
- Do not add new env vars without updating `.env.example`.
- Avoid destructive git commands.
- Prefer `rg` for search.
- Add comments only if logic is not obvious.

## Documentation rules
- Update `README.md` or a doc in `docs/` if behavior or setup changes.
- If adding a new datastore or service, document the env vars and usage.

## Seguridad y escalabilidad (guidelines)
- No subir tokens/keys al repo ni dejar credenciales hardcodeadas.
- Validar y sanitizar entradas en endpoints nuevos.
- Si se implementan uploads en `public/data/`, validar tipo/tamaño y nombres de archivo.
- Evitar operaciones pesadas en requests sin colas o paginación.
- Cambios de rol de usuarios: solo super admin ApiFlujos.

## Branding por cliente
- Editar `public/brand.json` en la branch del cliente para textos y títulos.
- ApiFlujos siempre visible; logo del cliente se muestra como secundario.

## Super Admin (ApiFlujos)
- Existe un **grupo de super admins** para empleados ApiFlujos (no es un solo usuario fijo).
- Se gestionan en UI: `Super Admin > Usuarios ApiFlujos` (usa `GET/POST/PUT/DELETE /api/sa/users`).
- Los super admins pueden intervenir configuraciones del cliente sin cambiar código.
- Auditoría: las acciones sobre super admins se registran en `sync_logs` (`entity=super_admin_user`, `direction=sa`).
