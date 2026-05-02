export type WorkerRuntimeGroup = {
  key: "pollers" | "retry-queue" | "cron";
  label: string;
  jobs: string[];
};
