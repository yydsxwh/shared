/**
 * 登录与敏感接口的限流。
 *
 * 默认用进程内窗口。RATE_LIMIT_BACKEND=redis 时改走调用方注入的 Redis。
 * 计数和过期必须同一次完成，避免只 INCR 成功、进程在 PEXPIRE 前退出导致键永不过期。
 * Redis 出错时，普通入口退回有上限的内存计数；短信和无法保证预算的敏感写入传 failClosed，短暂拒绝。
 */

export type RateLimitDecision = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  /** Redis 不可用、已经改走内存或拒绝时为 true */
  degraded?: boolean;
  /** 后端不可用且本入口选择拒绝，而不是额度用尽 */
  unavailable?: boolean;
};

export type RateLimitConsumeInput = {
  key: string;
  limit: number;
  windowSec: number;
  now?: number;
  /** Redis 不可用时拒绝，而不是退回内存 */
  failClosed?: boolean;
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

  count(key: string, now = Date.now()): number {
    const hit = this.buckets.get(key);
    if (!hit || hit.resetAt <= now) return 0;
    return hit.count;
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

/** 只依赖 INCR / PEXPIRE / PTTL / DEL / EVAL / GET，方便接 ioredis。 */
export type RedisRateLimitClient = {
  incr(key: string): Promise<number>;
  pexpire(key: string, milliseconds: number): Promise<number>;
  pttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
  eval?(script: string, numkeys: number, ...args: Array<string | number>): Promise<unknown>;
  get?(key: string): Promise<string | null>;
};

/** INCR 与 PEXPIRE 放在同一段脚本里，TTL 丢失时补上，避免键永不过期。 */
export const RATE_LIMIT_WINDOW_SCRIPT = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local count = redis.call('INCR', key)
local ttl = redis.call('PTTL', key)
if count == 1 or ttl < 0 then
  redis.call('PEXPIRE', key, windowMs)
  ttl = windowMs
end
return {count, ttl}
`;

function decisionFromCount(count: number, limit: number, ttlMs: number, windowSec: number): RateLimitDecision {
  if (count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : windowSec * 1000) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }
  return { ok: true, remaining: Math.max(0, limit - count), retryAfterSec: 0 };
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(
    private readonly redis: RedisRateLimitClient,
    private readonly fallback: RateLimitStore,
    private readonly onDegrade?: (error: unknown) => void,
  ) {}

  async consume(input: RateLimitConsumeInput): Promise<RateLimitDecision> {
    const redisKey = `rl:${input.key}`;
    const windowMs = input.windowSec * 1000;
    try {
      const { count, ttlMs } = await this.increment(redisKey, windowMs);
      return decisionFromCount(count, input.limit, ttlMs, input.windowSec);
    } catch (error) {
      this.onDegrade?.(error);
      if (input.failClosed) {
        return { ok: false, remaining: 0, retryAfterSec: 30, degraded: true, unavailable: true };
      }
      const decision = await this.fallback.consume(input);
      return { ...decision, degraded: true };
    }
  }

  async count(key: string): Promise<number | null> {
    if (!this.redis.get) return null;
    try {
      const raw = await this.redis.get(`rl:${key}`);
      if (raw === null || raw === undefined || raw === "") return 0;
      const count = Number(raw);
      return Number.isFinite(count) ? count : 0;
    } catch (error) {
      this.onDegrade?.(error);
      return null;
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

  private async increment(redisKey: string, windowMs: number): Promise<{ count: number; ttlMs: number }> {
    if (this.redis.eval) {
      const raw = await this.redis.eval(RATE_LIMIT_WINDOW_SCRIPT, 1, redisKey, String(windowMs));
      const pair = Array.isArray(raw) ? raw : [];
      const count = Number(pair[0]);
      const ttlMs = Number(pair[1]);
      if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) {
        throw new Error("rate-limit script returned an unusable result");
      }
      return { count, ttlMs };
    }
    const count = await this.redis.incr(redisKey);
    let ttlMs = await this.redis.pttl(redisKey);
    if (count === 1 || ttlMs < 0) {
      await this.redis.pexpire(redisKey, windowMs);
      ttlMs = windowMs;
    }
    return { count, ttlMs };
  }
}

export function rateLimitBackendName(env: NodeJS.ProcessEnv = process.env): "memory" | "redis" {
  return env.RATE_LIMIT_BACKEND === "redis" && (env.REDIS_URL || "").trim()
    ? "redis"
    : "memory";
}
