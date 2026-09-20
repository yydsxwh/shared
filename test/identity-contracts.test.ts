import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_INTEGRATION_REQUIREMENTS,
  PLATFORM_USER_ASSERTION_HEADER,
} from "../src/contracts/identity";
import {
  parseServiceScopes,
  PLATFORM_SERVICE_SCOPES,
} from "../src/contracts/service";
import { PLATFORM_ACTOR_HEADER } from "../src/contracts/version";

test("Actor 头与 assertion 头名称冻结，避免以后再改调用方", () => {
  assert.equal(PLATFORM_ACTOR_HEADER, "x-platform-actor");
  assert.equal(PLATFORM_USER_ASSERTION_HEADER, "x-platform-user-assertion");
});

test("account 接入清单覆盖 issuer / JWKS / aud / assertion 策略", () => {
  assert.deepEqual(ACCOUNT_INTEGRATION_REQUIREMENTS, [
    "issuer",
    "jwks",
    "sub",
    "audience",
    "service-or-user-assertion-policy",
  ]);
});

test("未写 scope 或 * / all 等于当前五个已实现模块", () => {
  assert.deepEqual(parseServiceScopes(undefined), [...PLATFORM_SERVICE_SCOPES]);
  assert.deepEqual(parseServiceScopes("*"), [...PLATFORM_SERVICE_SCOPES]);
  assert.deepEqual(parseServiceScopes("all"), [...PLATFORM_SERVICE_SCOPES]);
});

test("scope 列表去重且拒绝未知模块", () => {
  assert.deepEqual(parseServiceScopes("ai+storage+ai"), ["ai", "storage"]);
  assert.throws(() => parseServiceScopes("ai+billing"), /未知的服务权限/);
});
