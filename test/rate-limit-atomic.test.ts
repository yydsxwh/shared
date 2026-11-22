import assert from "node:assert/strict";
import test from "node:test";
import { RATE_LIMIT_WINDOW_SCRIPT, RedisRateLimitStore, type RedisRateLimitClient } from "../src/security/rate-limit";

test("shared limiter script sets a ttl on the first hit", async () => {
  const values = new Map<string, number>();
  const redis: RedisRateLimitClient = {
    async incr(key) {
      values.set(key, (values.get(key) || 0) + 1);
      return values.get(key) || 0;
    },
    async pexpire() {
      return 1;
    },
    async pttl(key) {
      return values.has(key) ? 1000 : -1;
    },
    async del(key) {
      values.delete(key);
      return 1;
    },
    async eval(script, _numkeys, key) {
      assert.match(script, /PEXPIRE/);
      assert.equal(script, RATE_LIMIT_WINDOW_SCRIPT);
      const count = await redis.incr(String(key));
      if (count === 1) await redis.pexpire(String(key), 1000);
      return [count, 1000];
    },
  };
  const store = new RedisRateLimitStore(redis, { consume: () => ({ ok: true, remaining: 0, retryAfterSec: 0 }), reset: () => undefined });
  const decision = await store.consume({ key: "pair", limit: 1, windowSec: 60 });
  assert.equal(decision.ok, true);
  assert.equal(values.get("rl:pair"), 1);
});
