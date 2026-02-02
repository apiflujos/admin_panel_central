import { processRetryQueue } from "../services/retry-queue.service";

export function startRetryQueuePoller() {
  const intervalMs = Number(process.env.RETRY_QUEUE_POLL_MS || 0);
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return;
  }

  let running = false;
  const run = async () => {
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
