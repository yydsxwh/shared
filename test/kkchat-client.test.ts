import assert from "node:assert/strict";
import test from "node:test";
import { KkchatClient, conversationHref, kkchatPublicOrigin } from "../src/kkchat-client";
import { DEFAULT_NOTIFICATION_ROUTES, NOTIFICATION_EVENT_FIELDS, isNotificationEventType } from "../src/contracts/notifications";

test("KKChat 深链和公开地址", () => {
  assert.equal(conversationHref("abc"), "/app/conversations/abc");
  assert.equal(kkchatPublicOrigin({}), "https://kkchat.yydsxwh.com");
  assert.equal(kkchatPublicOrigin({ KKCHAT_URL: "https://chat.example/" }), "https://chat.example");
});

test("服务客户端把产品身份放在头里，不把凭证写进地址", async () => {
  let seenUrl = "";
  let seenHeaders = "";
  const client = new KkchatClient({
    baseUrl: "https://kkchat.example",
    serviceToken: "secret-token",
    sourceProduct: "academic",
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      seenUrl = String(input);
      seenHeaders = JSON.stringify(init?.headers || {});
      return new Response(JSON.stringify({ conversationId: "c1", href: "/app/conversations/c1", url: "https://kkchat.example/app/conversations/c1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch,
  });
  const result = await client.ensureDirect({ senderSub: "usr_a", recipientSub: "usr_b" });
  assert.equal(result.conversationId, "c1");
  assert.equal(seenUrl.includes("secret-token"), false);
  assert.match(seenHeaders, /x-kkchat-product":"academic"/);
  assert.match(seenHeaders, /Bearer secret-token/);
  assert.equal(isNotificationEventType("KKCHAT_MESSAGE_RECEIVED"), true);
  assert.equal(DEFAULT_NOTIFICATION_ROUTES.KKCHAT_MESSAGE_RECEIVED.sms, false);
  assert.equal(DEFAULT_NOTIFICATION_ROUTES.KKCHAT_MESSAGE_RECEIVED.wechat, true);
  assert.deepEqual(NOTIFICATION_EVENT_FIELDS.KKCHAT_MESSAGE_RECEIVED, ["senderName", "excerpt", "occurredAt"]);
});
