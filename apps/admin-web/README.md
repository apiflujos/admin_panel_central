# admin-web

Destino del nuevo frontend en `Next.js + TypeScript`.

Responsabilidades objetivo:

- auth UI
- dashboard
- settings / conexiones
- productos
- pedidos / facturas
- operaciones
- logs / superadmin

Reglas:

- No contiene lógica de negocio.
- Solo consume contratos definidos en `packages/shared`.
- Todo flujo de datos debe salir de la API nueva.
- La base visual obligatoria es `Design System v4.html`.
- Toda pantalla nueva debe usar vocabulario canónico: `.btn`, `.input`, `.pill`, `.page-header-standard`, `.page-toolbar`, `.dataTable`.

Estado actual:

- App Router base creado.
- TypeScript strict configurado.
- Layout inicial y dashboard base ya existen.
- Dashboard ya consume datos reales del backend nuevo.
- Pantalla `auth/login` creada en Next.
- Pantalla `settings/connections` creada en Next.
- Pantalla `contacts` creada en Next.
- Pantalla `invoices` creada en Next.
- Pantalla `marketing` creada en Next.
- Cliente API tipado inicial en `lib/api.ts`.
- Ruta local `api/session/login` y `api/session/logout` creada para preservar cookie real del backend.
- Lectura server-side de sesión y datos reales centralizada en `lib/server-api.ts`.
- El crecimiento nuevo debe seguir entrando por `apps/admin-web`, no por `public/`.
- Scripts útiles:
  - `npm run dev:admin-web`
  - `npm run build:admin-web`
  - `npm run start:admin-web`
  - `npm run typecheck:admin-web`
  - `npm run check:reconstruction`
  - `npm run qa:admin-web`

Docker:

- `apps/admin-web/Dockerfile` construye el frontend nuevo como servicio separado.
- En `docker-compose.yml`, `admin-web` expone `3100` y consume la API interna por `APP_HOST=http://app:3006`.
