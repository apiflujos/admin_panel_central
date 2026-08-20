import { StatusPill } from "./ui/status-pill";

type CronKind = "cron" | "poller";

type CronTask = {
  name: string;
  kind: CronKind;
  schedule: string;
  envVar: string;
  enabledByDefault: boolean;
  detail: string;
};

// Static reference of the scheduled tasks that run in the workers process
// (apps/workers). Schedules shown are the defaults; each is configurable via the
// listed environment variable. This panel is read-only — it exists so the whole
// automation surface is visible in one place instead of being hidden in code/env.
const CRON_TASKS: CronTask[] = [
  {
    name: "Reporte de facturación",
    kind: "cron",
    schedule: "Día 1 de cada mes · 00:05 (America/Bogota)",
    envVar: "BILLING_REPORT_CRON",
    enabledByDefault: true,
    detail: "Genera el reporte mensual de facturación por organización y lo envía por webhook o log.",
  },
  {
    name: "Sync de pedidos (Shopify → Alegra)",
    kind: "poller",
    schedule: "Cada ~5 min",
    envVar: "ORDERS_SYNC_POLL_SECONDS",
    enabledByDefault: true,
    detail: "Revisa pedidos de Shopify actualizados y los sincroniza hacia Alegra.",
  },
  {
    name: "Sync de productos (Alegra → Shopify)",
    kind: "poller",
    schedule: "Cada ~15 min",
    envVar: "PRODUCTS_SYNC_POLL_SECONDS",
    enabledByDefault: true,
    detail: "Sincroniza ítems/inventario de Alegra hacia Shopify.",
  },
  {
    name: "Ajustes de inventario",
    kind: "poller",
    schedule: "Por tienda · mín. 5 min (def. 30 min)",
    envVar: "por-tienda / INVENTORY_ADJUSTMENTS_POLL_DISABLED",
    enabledByDefault: true,
    detail: "Sincroniza ajustes de inventario de Alegra hacia Shopify según el intervalo de cada tienda.",
  },
  {
    name: "Cola de reintentos",
    kind: "poller",
    schedule: "Configurable (desactivada por defecto)",
    envVar: "RETRY_QUEUE_POLL_MS",
    enabledByDefault: false,
    detail: "Reprocesa operaciones fallidas con backoff.",
  },
];

export function CronScheduleReferencePanel() {
  return (
    <div className="settings-subsection">
      <div className="settings-subsection-head">
        <div>
          <strong>Tareas programadas (crones)</strong>
          <span>
            Referencia de la automatización que corre en el proceso de workers. Los horarios son los valores por
            defecto; cada tarea se ajusta con su variable de entorno y requiere reinicio del worker.
          </span>
        </div>
      </div>

      <div className="cron-reference-list">
        {CRON_TASKS.map((task) => (
          <div className="cron-reference-row" key={task.name}>
            <div className="cron-reference-main">
              <strong>{task.name}</strong>
              <small>{task.detail}</small>
            </div>
            <div className="cron-reference-meta">
              <span className="pill pill-mini">{task.kind === "cron" ? "Cron" : "Poller"}</span>
              <span className="pill pill-mini">{task.schedule}</span>
              <code className="cron-reference-env">{task.envVar}</code>
              <StatusPill tone={task.enabledByDefault ? "success" : "warning"} small>
                {task.enabledByDefault ? "Activa por defecto" : "Desactivada"}
              </StatusPill>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
