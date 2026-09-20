import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createPlatformClient,
  PlatformApiError,
  type PlatformClientOptions,
} from "../src/platform-client/index";
import type { FileRecord } from "../src/contracts/storage";

type Captured = { url: string; init: RequestInit };

function stubClient(
  handler: (captured: Captured) => Response | Promise<Response>,
  overrides: Partial<PlatformClientOptions> = {},
) {
  const calls: Captured[] = [];
  const client = createPlatformClient({
    baseUrl: "https://platform.example.com/",
    serviceToken: "svc-token",
    clientId: "andyyyds",
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const captured = { url: String(input), init: init ?? {} };
      calls.push(captured);
      return handler(captured);
    }) as typeof fetch,
    ...overrides,
  });
  return { client, calls };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const FILE: FileRecord = {
  fileId: "file_1",
  namespace: "avatars",
  key: "avatars/2026/file_1.png",
  provider: "ALIYUN_OSS",
  fileName: "a.png",
  mimeType: "image/png",
  size: 1024,
  visibility: "PRIVATE",
  status: "READY",
  ownerId: "u1",
  clientId: "andyyyds",
  checksum: null,
  labels: {},
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("请求带上版本前缀、服务凭证与调用方标识", async () => {
  const { client, calls } = stubClient(() => json(FILE));
  await client.storage.getFile("file_1");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://platform.example.com/v1/storage/files/file_1");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.authorization, "Bearer svc-token");
  assert.equal(headers["x-platform-client"], "andyyyds");
  assert.equal(headers["x-platform-actor"], undefined);
});

test("withActor 只影响派生实例，不会污染原客户端", async () => {
  const { client, calls } = stubClient(() => json(FILE));
  const asUser = client.withActor("user_42");

  await asUser.storage.getFile("file_1");
  await client.storage.getFile("file_1");

  assert.equal((calls[0].init.headers as Record<string, string>)["x-platform-actor"], "user_42");
  assert.equal((calls[1].init.headers as Record<string, string>)["x-platform-actor"], undefined);
});

test("平台错误体转成带 code 的 PlatformApiError", async () => {
  const { client } = stubClient(() =>
    json(
      {
        error: { code: "PAYLOAD_TOO_LARGE", message: "文件超过上限", details: { maxBytes: 100 } },
        requestId: "req_1",
      },
      413,
    ),
  );

  const error = await client.storage
    .getFile("file_1")
    .then(() => null)
    .catch((e: unknown) => e);

  assert.ok(error instanceof PlatformApiError);
  assert.equal(error.code, "PAYLOAD_TOO_LARGE");
  assert.equal(error.status, 413);
  assert.equal(error.requestId, "req_1");
  assert.deepEqual(error.details, { maxBytes: 100 });
});

test("网关返回的非平台错误体按状态码归一，不会崩在 JSON 解析上", async () => {
  const { client } = stubClient(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));

  const error = await client.storage
    .getFile("file_1")
    .then(() => null)
    .catch((e: unknown) => e);

  assert.ok(error instanceof PlatformApiError);
  assert.equal(error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(error.status, 502);
});

test("网络异常也归一成 PlatformApiError，调用方只处理一种错误类型", async () => {
  const { client } = stubClient(() => {
    throw new Error("ECONNREFUSED");
  });

  const error = await client.catalog
    .listProducts()
    .then(() => null)
    .catch((e: unknown) => e);

  assert.ok(error instanceof PlatformApiError);
  assert.equal(error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(error.status, 0);
});

test("latest 查不到版本返回 null，而不是抛错", async () => {
  const { client } = stubClient(() =>
    json({ error: { code: "NOT_FOUND", message: "无已发布版本" }, requestId: "r" }, 404),
  );

  assert.equal(await client.releases.getLatest("rishi", { platform: "ANDROID" }), null);
});

test("查询参数按需拼接，undefined 不落到 URL 上", async () => {
  const { client, calls } = stubClient(() => json({ products: [] }));
  await client.catalog.listProducts({ status: "LIVE" });

  assert.equal(
    calls[0].url,
    "https://platform.example.com/v1/catalog/products?status=LIVE",
  );
});

test("204 响应不解析 JSON", async () => {
  const { client } = stubClient(() => new Response(null, { status: 204 }));
  assert.equal(await client.storage.deleteFile("file_1"), undefined);
});

test("缺少 baseUrl 或 serviceToken 直接报错，不要带着空配置上路", () => {
  assert.throws(() =>
    createPlatformClient({ baseUrl: "", serviceToken: "t", clientId: "c" }),
  );
  assert.throws(() =>
    createPlatformClient({ baseUrl: "https://x", serviceToken: "", clientId: "c" }),
  );
});
