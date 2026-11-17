import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { tabBootstrapScript, resolveAccess, type BrokerState } from "../src/auth/tab-session";

function browser() {
  const requests: { input: RequestInfo | URL; init?: RequestInit }[] = [];
  const storage = new Map<string, string>();
  const api = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); }, removeItem: (key: string) => { storage.delete(key); } };
  const window: { fetch: typeof fetch; addEventListener: () => void; crypto: Crypto } = {
    fetch: (async (input, init) => { requests.push({ input, init }); return new Response("ok"); }) as typeof fetch,
    addEventListener() {}, crypto,
  };
  vm.runInNewContext(tabBootstrapScript(), { window, crypto, location: { href: "https://site.example/", origin: "https://site.example" }, sessionStorage: api, localStorage: api, Headers, Request, URL, setInterval() {} });
  return { window, requests };
}

test("same-origin Request keeps auth and content headers while adding the tab header", async () => {
  const { window, requests } = browser();
  await window.fetch(new Request("https://site.example/api/action", { method: "POST", headers: { authorization: "Bearer test-only", "content-type": "application/json" }, body: "{}" }));
  const sent = requests[0].input as Request;
  assert.equal(sent.headers.get("authorization"), "Bearer test-only");
  assert.equal(sent.headers.get("content-type"), "application/json");
  assert.match(sent.headers.get("x-yyds-tab") || "", /^[A-Za-z0-9_-]{16,80}$/);
  assert.equal(await sent.text(), "{}");
});

test("cross-origin requests are forwarded without a tab header", async () => {
  const { window, requests } = browser();
  const input = new Request("https://other.example/api", { headers: { authorization: "Bearer test-only" } });
  await window.fetch(input);
  assert.equal(requests[0].input, input);
  assert.equal(input.headers.has("x-yyds-tab"), false);
});

test("explicit init headers retain native replacement semantics", async () => {
  const { window, requests } = browser();
  await window.fetch(new Request("https://site.example/api", { headers: { "x-original": "old" } }), { headers: { "x-new": "new" } });
  const sent = requests[0].input as Request;
  assert.equal(sent.headers.get("x-original"), null);
  assert.equal(sent.headers.get("x-new"), "new");
});

test("two active accounts never silently select an account without a tab binding", () => {
  const account = (sessionId: string) => ({ sessionId, userId: sessionId, active: true, grantedRoles: ["STUDENT"], defaultRole: "STUDENT", pendingReview: false, authTimeSec: 1, display: { name: sessionId, kkNumber: null, emailMasked: "", phoneMasked: "", avatarUrl: "", subHint: "" } });
  const state: BrokerState = { explicitPick: true, defaultSessionId: null, accounts: [account("a"), account("b")], tabs: [{ contextId: "abcdefghijklmnop", sessionId: "a", activeRole: "STUDENT", revoked: false }] };
  assert.equal(resolveAccess(state, { tabHeader: null }).kind, "ambiguous");
  const hit = resolveAccess(state, { tabHeader: "abcdefghijklmnop" });
  assert.equal(hit.kind, "ready");
  if (hit.kind === "ready") assert.equal(hit.account.userId, "a");
});


test("cross-origin URL objects are forwarded without a tab header", async () => {
  const { window, requests } = browser();
  const input = new URL("https://other.example/api");
  await window.fetch(input);
  assert.equal(requests[0].input, input);
  assert.equal(requests[0].init, undefined);
});

