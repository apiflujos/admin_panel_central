import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis() {
  if (redis) return redis;
  const url = String(process.env.REDIS_URL || "").trim();
  if (!url) {
    throw new Error("REDIS_URL is required");
  }
  redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  redis.on("error", (err) => {
    console.error("Redis error:", err);
  });
  return redis;
}

