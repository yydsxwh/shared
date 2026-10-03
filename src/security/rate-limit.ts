/**
 * 登录与敏感接口的限流。
 *
 * 默认用进程内窗口，单机 systemd 够用。
 * RATE_LIMIT_BACKEND=redis 时改走调用方注入的 Redis 客户端。
 * Redis 出错必须退回内存计数，不能让登录接口一直 500。
 */

export type RateLimitDecision = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  /** Redis 不可用、已经改走内存时为 true，供安全概览展示 */
  degraded?: boolean;
};

export type RateLimitConsumeInput = {
  key: string;
  limit: number;
  windowSec: number;
  now?: number;
};

export interface RateLimitStore {
  consume(input: RateLimitConsumeInput): RateLimitDecision | Promise<RateLimitDecision>;
  reset(key: string): void | Promise<void>;
}

type Hit = { count: number; resetAt: number };

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Hit>();
  constructor(private readonly maxKeys = 20_000) {}

  consume(input: RateLimitConsumeInput): RateLimitDecision {
    const now = input.now ?? Date.now();
    this.sweep(now);
    const current = this.buckets.get(input.key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(input.key, {
        count: 1,
        resetAt: now + input.windowSec * 1000,
      });
      return { ok: true, remaining: Math.max(0, input.limit - 1), retryAfterSec: 0 };
    }
    current.count += 1;
    if (current.count > input.limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }
    return {
      ok: true,
      remaining: Math.max(0, input.limit - current.count),
      retryAfterSec: 0,
    };
  }

  reset(key: string) {
    this.buckets.delete(key);
  }

  clear() {
    this.buckets.clear();
  }

  private sweep(now: number) {
    if (this.buckets.size < this.maxKeys) return;
    for (const [key, hit] of this.buckets) {
      if (hit.resetAt <= now) this.buckets.delete(key);
    }
  }
}

/** 只依赖 INCR / PEXPIRE / PTTL / DEL，方便接 ioredis，不把客户端打进公共包。 */
export type RedisRateLimitClient = {
  incr(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<number>;
  pttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
};

export class RedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly redis: RedisRateLimitClient,
    private readonly fallback: RateLimitStore,
    private readonly onDegrade?: (error: unknown) => void,
  ) {}

  async consume(input: RateLimitConsumeInput): Promise<RateLimitDecision> {
    const redisKey = `rl:${input.key}`;
    try {
      const count = await this.redis.incr(redisKey);
      if (count === 1) {
        await this.redis.pexpire(redisKey, input.windowSec * 1000);
      }
      if (count > input.limit) {
        const ttl = await this.redis.pttl(redisKey);
        const retryAfterSec = Math.max(1, Math.ceil((ttl > 0 ? ttl : input.windowSec * 1000) / 1000));
        return { ok: false, remaining: 0, retryAfterSec };
      }
      return { ok: true, remaining: Math.max(0, input.limit - count), retryAfterSec: 0 };
    } catch (error) {
      this.onDegrade?.(error);
      const decision = await this.fallback.consume(input);
      return { ...decision, degraded: true };
    }
  }

  async reset(key: string) {
    try {
      await this.redis.del(`rl:${key}`);
    } catch (error) {
      this.onDegrade?.(error);
    }
    await this.fallback.reset(key);
  }
}

export function rateLimitBackendName(env: NodeJS.ProcessEnv = process.env): "memory" | "redis" {
  return env.RATE_LIMIT_BACKEND === "redis" && (env.REDIS_URL || "").trim()
    ? "redis"
    : "memory";
}
