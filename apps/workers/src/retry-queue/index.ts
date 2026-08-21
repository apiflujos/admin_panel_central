import { processRetryQueue } from "../../../../src/services/retry-queue.service";
import { isWorkerEnabled } from "../../../../src/services/worker-settings.service";

const DEFAULT_POLL_MS = 60_000;

export function startRetryQueueWorker() {
  // Explícitamente deshabilitar con RETRY_QUEUE_POLL_MS=0. Sin var: usar default 60s.
  const raw = process.env.RETRY_QUEUE_POLL_MS;
  let intervalMs: number;
  if (raw === undefined || raw === "") {
    intervalMs = DEFAULT_POLL_MS;
    console.warn(
      `[retry-queue] RETRY_QUEUE_POLL_MS no está seteado — usando default ${DEFAULT_POLL_MS}ms. ` +
        `Setealo explícitamente en .env para silenciar este mensaje o en 0 para deshabilitar.`
    );
  } else {
    intervalMs = Number(raw);
  }
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    console.warn(`[retry-queue] worker deshabilitado (RETRY_QUEUE_POLL_MS=${raw})`);
    return;
  }
  console.log(`[retry-queue] worker activo — poll cada ${intervalMs}ms`);

  let running = false;
  const run = async () => {
    // Interruptor de Super Admin. Se consulta en CADA pasada (no sólo al
    // arrancar) para que encender o apagar surta efecto sin reiniciar.
    if (!(await isWorkerEnabled("retry-queue"))) return;
    if (running) return;
    running = true;
    try {
      await processRetryQueue();
    } catch (error) {
      console.error("Retry queue poll failed:", error);
    } finally {
      running = false;
    }
  };

  void run();
  setInterval(() => {
    void run();
  }, intervalMs);
}
