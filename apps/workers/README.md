# workers

Destino del runtime background.

Responsabilidades objetivo:

- cron
- pollers
- retry queue
- backfills
- reprocesos

Reglas:

- Sin UI.
- Sin lógica HTTP.
- Usa casos de uso y contratos compartidos.

Layout actual:

- `src/bootstrap.ts`: entrypoint del runtime background
- `src/pollers`: pollers Shopify/Alegra
- `src/retry-queue`: retry queue
- `src/cron`: billing report y mantenimiento
- `src/index.ts`: runtime indexado y grupos de workers

Estado actual:

- `inventory-adjustments`, `orders-sync`, `products-sync`, `retry-queue`, `webhook-dispatch` y `billing-report` ya corren desde `apps/workers`.
- `src/jobs/*` queda como compatibilidad por reexport mientras existan tests o imports heredados.
- `src/runtime/start-workers.ts` ya arranca el runtime nuevo y no depende de lógica operativa en `src/jobs/*`.

El siguiente paso es seguir empujando lógica reusable hacia `packages/domain` y recortar los bridges de `src/jobs/*` cuando ya no sean necesarios.
