# integration-api

Destino de la nueva API HTTP.

Responsabilidades objetivo:

- auth
- settings
- conexiones
- sync manual
- webhooks
- operaciones
- reportes operativos

Fuera de alcance del target architecture:

- `assistant`
- `ai-assistants`

Reglas:

- Controllers delgados.
- Casos de uso en `packages/domain`.
- DTOs y schemas en `packages/shared`.

Layout actual de Sprint 2:

- `src/server.ts`: entrypoint HTTP nuevo
- `src/modules/auth`: ownership de auth y OAuth legacy
- `src/modules/settings`: ownership de settings, company, connections y stores
- `src/modules/sync`: ownership de productos, pedidos, invoices sync y checkpoints
- `src/modules/webhooks`: ownership de webhooks inbound
- `src/modules/operations`: ownership de operaciones, invoices, reports y marketing

Estado actual:

- `sync` ya quedó drenado fuera de `src/api/*` a nivel operativo; los archivos viejos son bridges.
- `settings`, `webhooks` y gran parte de `operations` ya siguen el mismo patrón.
- `src/api/*` queda como compatibilidad pública mientras el runtime primario vive en `apps/integration-api`.

En esta fase los módulos conservan bridges de compatibilidad sobre `src/api/*`.
El siguiente paso es seguir retirando esos bridges donde ya no aporten valor y empujar más lógica a módulos/casos de uso nuevos.
