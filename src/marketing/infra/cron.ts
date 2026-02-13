import cron from "node-cron";

export function startCron(
  spec: string,
  fn: () => void | Promise<void>,
  options?: { timezone?: string }
) {
  if (!cron.validate(spec)) {
    throw new Error(`Invalid cron spec: ${spec}`);
  }
  return cron.schedule(
    spec,
    () => {
    Promise.resolve()
      .then(fn)
      .catch((err) => console.error("Cron error:", err));
    },
    options && options.timezone ? { timezone: options.timezone } : undefined
  );
}
