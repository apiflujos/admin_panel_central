export type WorkerRuntimeGroup = {
  key: "pollers" | "retry-queue" | "webhook-dispatch" | "cron";
  label: string;
  jobs: string[];
};
