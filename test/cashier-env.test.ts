import { test } from "node:test";
import assert from "node:assert/strict";

import { planCashierLaunch } from "../src/client/cashier-env";

const IPHONE_WECHAT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.0";
const IPHONE_ALIPAY =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) AlipayClient/10.5.0";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test("微信内没有 JSAPI 时不假装能直接调起", () => {
  const plan = planCashierLaunch({
    provider: "WECHAT",
    ua: IPHONE_WECHAT,
    methods: ["NATIVE", "H5"],
  });
  assert.equal(plan.kind, "COPY_LINK");
});

test("微信内已开通 JSAPI 才走官方调起", () => {
  const plan = planCashierLaunch({
    provider: "WECHAT",
    ua: IPHONE_WECHAT,
    methods: ["JSAPI", "NATIVE"],
  });
  assert.equal(plan.kind, "WECHAT_JSAPI");
});

test("微信里选支付宝只给复制链接，不伪造跳转", () => {
  const plan = planCashierLaunch({
    provider: "ALIPAY",
    ua: IPHONE_WECHAT,
    methods: ["WAP", "PAGE", "NATIVE"],
  });
  assert.equal(plan.kind, "COPY_LINK");
});

test("支付宝里选微信同样只给复制链接", () => {
  const plan = planCashierLaunch({
    provider: "WECHAT",
    ua: IPHONE_ALIPAY,
    methods: ["JSAPI", "H5", "NATIVE"],
  });
  assert.equal(plan.kind, "COPY_LINK");
});

test("手机系统浏览器在开通 H5 / WAP 时走对应渠道", () => {
  assert.equal(
    planCashierLaunch({ provider: "WECHAT", ua: IPHONE_SAFARI, methods: ["H5", "NATIVE"] }).kind,
    "WECHAT_H5",
  );
  assert.equal(
    planCashierLaunch({ provider: "ALIPAY", ua: IPHONE_SAFARI, methods: ["WAP", "PAGE"] }).kind,
    "ALIPAY_WAP",
  );
});

test("电脑浏览器优先扫码或电脑网站", () => {
  assert.equal(
    planCashierLaunch({ provider: "WECHAT", ua: DESKTOP, methods: ["NATIVE", "H5"] }).kind,
    "WECHAT_NATIVE",
  );
  assert.equal(
    planCashierLaunch({ provider: "ALIPAY", ua: DESKTOP, methods: ["PAGE", "WAP"] }).kind,
    "ALIPAY_PAGE",
  );
});
