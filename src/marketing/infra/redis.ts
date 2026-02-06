import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis() {
  if (redis) return redis;
  const url = String(process.env.REDIS_URL || "").trim();
  if (!url) {
    return null;
  }
  redis = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  redis.on("error", (err) => {
    console.error("Redis error:", err);
  });
  return redis;
}

