import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCookieMutation, signCsrfToken, verifyCsrfToken } from "../src/security/csrf";
import { sanitizeHtml } from "../src/security/html-sanitize";
import { securityHeaders } from "../src/security/headers";
import { ClamAvScanner, NoopMalwareScanner, type ClamSocket } from "../src/security/malware-scan";
import { checkNewPassword, passwordForLogin } from "../src/security/password-policy";
import { hasPermission, requirePermission } from "../src/security/permissions";
import { checkPwnedPassword } from "../src/security/pwned-password";
import { MemoryRateLimitStore, RedisRateLimitStore, type RedisRateLimitClient } from "../src/security/rate-limit";
import { redactRecord, redactText } from "../src/security/redact";
import { assertResolvedPublicUrl, ipIsBlocked, validatePublicHttpUrl } from "../src/security/ssrf";
import { signStepUp, stepUpIsFresh } from "../src/security/step-up";
import { decryptSecret, encryptSecret, generateRecoveryCodes, hashRecoveryCode, consumeRecoveryCode, totpCode, verifyTotp } from "../src/security/totp";
import { inspectImageUpload } from "../src/security/upload-policy";
import { consumeWebAuthnChallenge, createWebAuthnChallenge, webAuthnRelyingParty } from "../src/security/webauthn-policy";

test("rate limit blocks brute force and redis falls open to memory", async () => {
  const memory = new MemoryRateLimitStore();
  for (let i = 0; i < 3; i += 1) {
    assert.equal(memory.consume({ key: "login:1", limit: 3, windowSec: 60, now: 1_000 }).ok, true);
  }
  assert.equal(memory.consume({ key: "login:1", limit: 3, windowSec: 60, now: 1_000 }).ok, false);

  const redis: RedisRateLimitClient = {
    async incr() {
      throw new Error("down");
    },
    async pexpire() {
      return 1;
    },
    async pttl() {
      return 1000;
    },
    async del() {
      return 1;
    },
  };
  const store = new RedisRateLimitStore(redis, memory);
  const degraded = await store.consume({ key: "login:2", limit: 1, windowSec: 60, now: 2_000 });
  assert.equal(degraded.ok, true);
  assert.equal(degraded.degraded, true);
});

test("csrf rejects cross origin and missing token when enforced", () => {
  const secret = "test-secret";
  const token = signCsrfToken(secret, "user-1");
  assert.equal(verifyCsrfToken(secret, token, "user-1"), true);
  const badOrigin = checkCookieMutation({
    method: "POST",
    origin: "https://evil.example",
    secFetchSite: "",
    allowedOrigins: ["https://account.yydsxwh.com"],
    enforceToken: false,
    headerToken: "",
    cookieToken: "",
    secret,
  });
  assert.equal(badOrigin.ok, false);
  const missing = checkCookieMutation({
    method: "POST",
    origin: "https://account.yydsxwh.com",
    secFetchSite: "same-origin",
    allowedOrigins: ["https://account.yydsxwh.com"],
    enforceToken: true,
    headerToken: "",
    cookieToken: token,
    secret,
    sessionId: "user-1",
  });
  assert.equal(missing.ok, false);
  const ok = checkCookieMutation({
    method: "POST",
    origin: "https://account.yydsxwh.com",
    secFetchSite: "same-origin",
    allowedOrigins: ["https://account.yydsxwh.com"],
    enforceToken: true,
    headerToken: token,
    cookieToken: token,
    secret,
    sessionId: "user-1",
  });
  assert.equal(ok.ok, true);
  const get = checkCookieMutation({
    method: "GET",
    origin: "https://evil.example",
    secFetchSite: "cross-site",
    allowedOrigins: ["https://account.yydsxwh.com"],
    enforceToken: true,
    headerToken: "",
    cookieToken: "",
    secret,
  });
  assert.equal(get.ok, true);
});

test("ssrf blocks loopback private metadata and dns rebinding", async () => {
  assert.equal(validatePublicHttpUrl("http://127.0.0.1/latest").ok, false);
  assert.equal(validatePublicHttpUrl("http://169.254.169.254/").ok, false);
  assert.equal(validatePublicHttpUrl("http://10.1.1.1/").ok, false);
  assert.equal(validatePublicHttpUrl("file:///etc/passwd").ok, false);
  assert.equal(validatePublicHttpUrl("gopher://example").ok, false);
  assert.equal(ipIsBlocked("192.168.1.1"), true);
  const rebound = await assertResolvedPublicUrl("https://example.com/a", async () => ["127.0.0.1"]);
  assert.equal(rebound.ok, false);
  const fine = await assertResolvedPublicUrl("https://example.com/a", async () => ["93.184.216.34"]);
  assert.equal(fine.ok, true);
});

test("upload rejects traversal svg html and fake mime", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
  assert.equal(inspectImageUpload({ fileName: "../x.png", mime: "image/png", size: png.length, bytes: png, maxBytes: 100 }).ok, false);
  assert.equal(inspectImageUpload({ fileName: "a.svg", mime: "image/svg+xml", size: 10, bytes: png, maxBytes: 100 }).ok, false);
  assert.equal(inspectImageUpload({ fileName: "a.html", mime: "text/html", size: 10, bytes: png, maxBytes: 100 }).ok, false);
  assert.equal(inspectImageUpload({ fileName: "a.png", mime: "image/png", size: 4, bytes: Uint8Array.from([1, 2, 3, 4]), maxBytes: 100 }).ok, false);
  const ok = inspectImageUpload({ fileName: "a.png", mime: "image/png", size: png.length, bytes: png, maxBytes: 100 });
  assert.equal(ok.ok, true);
});

test("html sanitizer strips script handlers and javascript urls", () => {
  const cleaned = sanitizeHtml(`<p onclick="alert(1)">hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>`);
  assert.equal(cleaned.includes("script"), false);
  assert.equal(cleaned.includes("onclick"), false);
  assert.equal(cleaned.includes("javascript:"), false);
  assert.equal(cleaned.includes("<p>"), true);
});

test("permissions and password policy", () => {
  assert.equal(hasPermission(["STUDENT"], "user.manage"), false);
  assert.equal(requirePermission(["STUDENT"], "user.manage").ok, false);
  assert.equal(hasPermission(["ADMIN"], "oauth-client.manage"), true);
  assert.equal(checkNewPassword("short").ok, false);
  assert.equal(checkNewPassword("correct horse battery").ok, true);
  assert.equal(passwordForLogin("  secret  "), "  secret  ");
});

test("pwned check sends only hash prefix", async () => {
  let requested = "";
  const result = await checkPwnedPassword({
    password: "password",
    enabled: true,
    fetchImpl: async (url) => {
      requested = String(url);
      return new Response("0018A45C4D1DEF81644B54AB7F969B88D65:1\n");
    },
  });
  assert.equal(requested.startsWith("https://api.pwnedpasswords.com/range/"), true);
  assert.equal(requested.endsWith("/range/password"), false);
  assert.equal(requested.split("/range/")[1]?.length, 5);
  assert.equal(result.checked, true);
  const open = await checkPwnedPassword({
    password: "password",
    enabled: true,
    fetchImpl: async () => {
      throw new Error("offline");
    },
  });
  assert.equal(open.failOpen, true);
  assert.equal(open.breached, false);
});

test("totp roundtrip and secret encryption", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const code = totpCode(secret, 1_700_000_000_000);
  assert.equal(verifyTotp(secret, code, 1_700_000_000_000), true);
  assert.equal(verifyTotp(secret, "000000", 1_700_000_000_000), false);
  const enc = encryptSecret(secret, "auth-secret");
  assert.equal(enc.includes(secret), false);
  assert.equal(decryptSecret(enc, "auth-secret"), secret);
  const codes = generateRecoveryCodes(2);
  const hashes = codes.map(hashRecoveryCode);
  const used = consumeRecoveryCode(hashes, codes[0]!);
  assert.equal(used.ok, true);
  assert.equal(used.remaining.length, 1);
});

test("passkey challenge is one-time and origin must be https", () => {
  const created = createWebAuthnChallenge(1_000, 1_000);
  const first = consumeWebAuthnChallenge(created, created.challenge, 1_500);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(consumeWebAuthnChallenge(first.challenge, created.challenge, 1_600).ok, false);
  assert.equal(webAuthnRelyingParty({ origin: "http://account.yydsxwh.com" }).ok, false);
  assert.equal(webAuthnRelyingParty({ origin: "https://account.yydsxwh.com" }).ok, true);
  assert.equal(webAuthnRelyingParty({ origin: "http://localhost:3000" }).ok, true);
});

test("step-up expires and headers stay report-only", () => {
  const token = signStepUp({ secret: "s", userId: "u", at: 1_000 });
  assert.equal(stepUpIsFresh({ secret: "s", userId: "u", token, now: 1_000 + 60_000, windowSec: 30 }), false);
  assert.equal(stepUpIsFresh({ secret: "s", userId: "u", token, now: 1_000 + 10_000, windowSec: 30 }), true);
  const headers = securityHeaders({ NODE_ENV: "production" });
  assert.equal(headers.some((item) => item.key === "Content-Security-Policy-Report-Only"), true);
  assert.equal(headers.some((item) => item.key === "Content-Security-Policy"), false);
  const hsts = headers.find((item) => item.key === "Strict-Transport-Security")?.value || "";
  assert.equal(hsts.includes("preload"), false);
  assert.equal(hsts.includes("includeSubDomains"), false);
});

test("malware scanner noop and clamav adapter", async () => {
  assert.equal((await new NoopMalwareScanner().scan(new Uint8Array([1]))).status, "skipped");
  const socket: ClamSocket = {
    write() {},
    end() {
      queueMicrotask(() => dataListener?.(Buffer.from("stream: OK")));
    },
    once(event, listener) {
      if (event === "data") dataListener = listener as (chunk: Buffer) => void;
    },
  };
  let dataListener: ((chunk: Buffer) => void) | undefined;
  const scanner = new ClamAvScanner(async () => socket);
  assert.equal((await scanner.scan(new Uint8Array([1, 2]))).status, "clean");
});

test("redaction hides secrets", () => {
  const redacted = redactRecord({ password: "hunter2", name: "ada" });
  assert.equal(JSON.stringify(redacted).includes("hunter2"), false);
  assert.equal(redacted.name, "ada");
  assert.equal(redactText("Authorization: Bearer abc.def").includes("abc.def"), false);
});
