export type JobPayload = Record<string, unknown>;

export async function enqueueJob(name: string, payload: JobPayload) {
  // TODO: connect to Redis/RabbitMQ and enqueue.
  return { queued: true, name, payload };
}
