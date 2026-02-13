import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";
import type Redis from "ioredis";

export type MarketingQueues = {
  sync: Queue;
  metrics: Queue;
  alerts: Queue;
};

export const defaultJobOptions: JobsOptions = {
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 50 },
};

export function buildMarketingQueues(redis: Redis): MarketingQueues {
  const connection = redis;
  return {
    sync: new Queue("marketing_sync", { connection, defaultJobOptions }),
    metrics: new Queue("marketing_metrics", { connection, defaultJobOptions }),
    alerts: new Queue("marketing_alerts", { connection, defaultJobOptions }),
  };
}

export function buildWorker(
  name: string,
  redis: Redis,
  processor: Processor
) {
  return new Worker(name, processor, {
    connection: redis,
    concurrency: Math.max(1, Number(process.env.MARKETING_WORKER_CONCURRENCY || 3)),
  });
}
