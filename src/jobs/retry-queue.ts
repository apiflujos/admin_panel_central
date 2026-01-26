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
    } finally {
      running = false;
    }
  };

  void run();
  setInterval(run, intervalMs);
}
