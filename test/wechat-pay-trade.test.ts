import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveWechatPayTradeType } from "../src/client/wechat-pay-trade";

const wechatUa =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50";
const mobileUa =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const desktopUa =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test("微信内误传扫码时改成 JSAPI", () => {
  assert.equal(
    resolveWechatPayTradeType({
      requested: "native",
      allowNativeFallback: false,
      ua: wechatUa,
    }),
    "jsapi",
  );
});

test("手机浏览器误传扫码时改成 H5", () => {
  assert.equal(
    resolveWechatPayTradeType({
      requested: "native",
      allowNativeFallback: false,
      ua: mobileUa,
    }),
    "h5",
  );
});

test("用户明确要扫码时不得改写，否则既弹不出收银台也出不了码", () => {
  assert.equal(
    resolveWechatPayTradeType({
      requested: "native",
      allowNativeFallback: true,
      ua: wechatUa,
    }),
    "native",
  );
});

test("已经点名的形态原样返回", () => {
  assert.equal(
    resolveWechatPayTradeType({
      requested: "jsapi",
      allowNativeFallback: false,
      ua: wechatUa,
    }),
    "jsapi",
  );
  assert.equal(
    resolveWechatPayTradeType({
      requested: "native",
      allowNativeFallback: false,
      ua: desktopUa,
    }),
    "native",
  );
});
