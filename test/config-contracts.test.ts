import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CONFIG_CATALOG,
  CONFIG_PRODUCT_IDS,
  assertGlobalWritable,
  assertProductWritable,
  browserSafeEntries,
  catalogEntry,
  groupMode,
  productIdForClient,
  productsUsingGroup,
  validateConfigValue,
  type ResolvedConfigEntry,
} from "../src/contracts/config";
import { parseServiceScopes } from "../src/contracts/service";
import { PlatformHttpClient } from "../src/platform-client/http";
import { ConfigClient, ConfigResolver } from "../src/platform-client/config";

test("catalog：Secret 永不允许进浏览器，也没有内置默认", () => {
  for (const item of CONFIG_CATALOG) {
    if (item.sensitivity === "SECRET") {
      assert.equal(item.clientVisibility, "SERVER_ONLY", item.key);
      assert.equal(item.builtinDefault, undefined, item.key);
    }
    if (item.clientVisibility === "BROWSER_ALLOWED") {
      assert.equal(item.sensitivity, "PUBLIC", item.key);
    }
  }
  const keys = CONFIG_CATALOG.map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length, "key 不能重复");
});

test("CONFIG-10：产品唯一或中心托管的密钥不能设为全局默认", () => {
  assert.throws(() => assertGlobalWritable(catalogEntry("product.oidc.clientSecret")!), /PRODUCT_REQUIRED/);
  assert.throws(() => assertGlobalWritable(catalogEntry("platform.serviceToken")!), /CENTRAL_ONLY/);
  assert.throws(() => assertProductWritable(catalogEntry("account.oidc.signingKey")!), /CENTRAL_ONLY/);
  assert.doesNotThrow(() => assertGlobalWritable(catalogEntry("storage.oss.bucket")!));
  assert.doesNotThrow(() => assertProductWritable(catalogEntry("product.oidc.clientId")!));
  assert.equal(catalogEntry("ai.apiKey")!.runtimeDeliverable, false, "AI Key 不下发产品");
  assert.equal(catalogEntry("maps.amap.webJsKey")!.clientVisibility, "BROWSER_ALLOWED");
  assert.equal(catalogEntry("maps.amap.webServiceKey")!.clientVisibility, "SERVER_ONLY");
});

test("值校验按类型归一", () => {
  const bucket = catalogEntry("storage.oss.bucket")!;
  assert.deepEqual(validateConfigValue(bucket, "  my-bucket "), { ok: true, value: "my-bucket" });
  const enabled = catalogEntry("sms.enabled")!;
  assert.deepEqual(validateConfigValue(enabled, true), { ok: true, value: "true" });
  assert.equal(validateConfigValue(enabled, "yes").ok, false);
  const provider = catalogEntry("storage.provider")!;
  assert.equal(validateConfigValue(provider, "S3").ok, false);
  const route = catalogEntry("ai.route.translate")!;
  assert.deepEqual(validateConfigValue(route, ["dashscope/qwen-plus", " openai/gpt-4o-mini "]), {
    ok: true,
    value: "dashscope/qwen-plus,openai/gpt-4o-mini",
  });
  const url = catalogEntry("storage.oss.publicBaseUrl")!;
  assert.equal(validateConfigValue(url, "ftp://x").ok, false);
  assert.deepEqual(validateConfigValue(url, "https://cdn.example.com/"), { ok: true, value: "https://cdn.example.com" });
});

test("产品注册与影响范围", () => {
  assert.equal(productIdForClient("andyyyds"), "main");
  assert.equal(productIdForClient("ACADEMIC"), "academic");
  assert.equal(productIdForClient("unknown"), null);
  assert.ok(productsUsingGroup("storage").includes("academic"));
  assert.ok(!productsUsingGroup("storage").includes("mathcode"));
  assert.ok(CONFIG_PRODUCT_IDS.includes("rishi"));
  assert.ok(CONFIG_PRODUCT_IDS.includes("kkchat"));
  assert.equal(productIdForClient("kkchat"), "kkchat");
  assert.ok(parseServiceScopes("ai+storage+config").includes("config"));
});

function resolved(partial: Partial<ResolvedConfigEntry> & { key: string }): ResolvedConfigEntry {
  const def = catalogEntry(partial.key)!;
  return {
    group: def.group,
    label: def.label,
    valueType: def.valueType,
    sensitivity: def.sensitivity,
    sharePolicy: def.sharePolicy,
    clientVisibility: def.clientVisibility,
    source: "GLOBAL",
    value: null,
    secret: null,
    overridden: false,
    version: 1,
    globalConfigured: true,
    ...partial,
  };
}

test("组模式与浏览器安全过滤", () => {
  const entries = [
    resolved({ key: "maps.provider", value: "AMAP" }),
    resolved({ key: "maps.amap.webJsKey", value: "public-js-key" }),
    resolved({ key: "maps.amap.webServiceKey", secret: { configured: true, last4: "abc", fingerprint: "f" }, overridden: true, source: "PRODUCT_OVERRIDE" }),
  ];
  assert.equal(groupMode(entries), "MIXED");
  const safe = browserSafeEntries(entries);
  assert.deepEqual(safe.map((item) => item.key), ["maps.amap.webJsKey"]);
  assert.ok(!JSON.stringify(safe).includes("webServiceKey"));
});

type Call = { url: string; init: RequestInit };

function fakePlatform(handler: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const http = new PlatformHttpClient({
    baseUrl: "https://platform.example.com",
    serviceToken: "svc-token-for-tests-0123456789",
    clientId: "academic",
    timeoutMs: 500,
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = { url: String(input), init: init ?? {} };
      calls.push(call);
      return handler(call);
    }) as typeof fetch,
  });
  return { client: new ConfigClient(http), calls };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const GROUP = {
  productId: "academic" as const,
  group: "maps" as const,
  mode: "INHERIT" as const,
  entries: [
    resolved({ key: "maps.provider", value: "AMAP" }),
    resolved({ key: "maps.amap.webJsKey", value: "js-key-A" }),
  ],
  revision: 7,
  resolvedAt: "2026-09-27T00:00:00.000Z",
};

test("CONFIG-1：没有覆盖时有效值来自 GLOBAL，一次业务读取只打一次 Platform", async () => {
  const { client, calls } = fakePlatform((call) =>
    call.url.includes("/effective/maps") ? jsonResponse(GROUP) : jsonResponse({ revision: 7, updatedAt: "x" }),
  );
  let now = 1_000_000;
  const resolver = new ConfigResolver({ client, productId: "academic", now: () => now, ttlMs: 1000 });
  const first = await resolver.getValue("maps.amap.webJsKey");
  assert.deepEqual(first, { value: "js-key-A", source: "GLOBAL", state: "LIVE" });
  await resolver.getValue("maps.provider");
  await resolver.getValue("maps.provider");
  assert.equal(calls.length, 1, "TTL 内不再请求");
  now += 1500;
  await resolver.getValue("maps.provider");
  assert.equal(calls.length, 2, "过期后先问 revision");
  assert.ok(calls[1]!.url.endsWith("/v1/config/revision"));
  assert.equal(resolver.state("maps"), "CACHED");
});

test("CONFIG-2：revision 变化后重新拉取新值", async () => {
  let revision = 7;
  let key = "js-key-A";
  const { client } = fakePlatform((call) => {
    if (call.url.includes("/effective/maps")) {
      return jsonResponse({ ...GROUP, revision, entries: [GROUP.entries[0]!, resolved({ key: "maps.amap.webJsKey", value: key })] });
    }
    return jsonResponse({ revision, updatedAt: "x" });
  });
  let now = 0;
  const resolver = new ConfigResolver({ client, productId: "academic", now: () => now, ttlMs: 100 });
  assert.equal((await resolver.getValue("maps.amap.webJsKey")).value, "js-key-A");
  revision = 8;
  key = "js-key-B";
  now += 200;
  assert.equal((await resolver.getValue("maps.amap.webJsKey")).value, "js-key-B");
  assert.equal(resolver.state("maps"), "LIVE");
});

test("CONFIG-8：Platform 不可达时继续用 Last-Known-Good 并标记 STALE", async () => {
  let down = false;
  const { client } = fakePlatform((call) => {
    if (down) throw new Error("ECONNREFUSED");
    return call.url.includes("/effective/maps") ? jsonResponse(GROUP) : jsonResponse({ revision: 7, updatedAt: "x" });
  });
  let now = 0;
  const resolver = new ConfigResolver({ client, productId: "academic", now: () => now, ttlMs: 100 });
  await resolver.getGroup("maps");
  down = true;
  now += 200;
  const stale = await resolver.getGroup("maps");
  assert.equal(stale.state, "STALE");
  assert.equal(stale.group.entries[1]!.value, "js-key-A");
  assert.equal(stale.group.entries[1]!.source, "LAST_KNOWN_GOOD");
  assert.match(stale.lastError ?? "", /ECONNREFUSED/);
});

test("CONFIG-9：没有缓存且 Platform 不可达时用环境变量兜底，Secret 不进值", async () => {
  const { client } = fakePlatform(() => {
    throw new Error("timeout");
  });
  const resolver = new ConfigResolver({
    client,
    productId: "main",
    envFallback: (key) => (key === "storage.oss.bucket" ? "env-bucket" : key === "storage.oss.accessKeySecret" ? "env-secret" : undefined),
  });
  const snapshot = await resolver.getGroup("storage");
  assert.equal(snapshot.state, "FALLBACK");
  const bucket = snapshot.group.entries.find((item) => item.key === "storage.oss.bucket")!;
  assert.equal(bucket.value, "env-bucket");
  assert.equal(bucket.source, "ENV_FALLBACK");
  const secret = snapshot.group.entries.find((item) => item.key === "storage.oss.accessKeySecret")!;
  assert.equal(secret.value, null);
  assert.equal(secret.secret?.configured, true);
  assert.ok(!JSON.stringify(snapshot).includes("env-secret"));
});
