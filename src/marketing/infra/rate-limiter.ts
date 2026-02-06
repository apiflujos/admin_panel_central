import { setTimeout as sleep } from "timers/promises";
import type Redis from "ioredis";

export type RateLimiterOptions = {
  keyPrefix: string;
  maxPerSecond: number;
  maxWaitMs: number;
};

export class RedisPerSecondRateLimiter {
  constructor(
    private redis: Redis,
    private options: RateLimiterOptions
  ) {}

  async acquire(keySuffix: string) {
    const maxPerSecond = Math.max(1, Math.floor(this.options.maxPerSecond || 1));
    const maxWaitMs = Math.max(0, Math.floor(this.options.maxWaitMs || 0));
    const start = Date.now();

    // Simple limiter: INCR bucket per second, wait next second if exceeded.
    while (true) {
      const now = Date.now();
      if (maxWaitMs && now - start > maxWaitMs) {
        throw new Error("rate_limited");
      }
      const secondKey = Math.floor(now / 1000);
      const key = `${this.options.keyPrefix}:${keySuffix}:${secondKey}`;
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, 2);
      }
      if (count <= maxPerSecond) {
        return;
      }
      const waitMs = 1000 - (now % 1000);
      await sleep(Math.max(25, waitMs));
    }
  }
}

