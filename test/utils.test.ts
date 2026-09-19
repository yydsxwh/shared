import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decodeRouteSlug,
  formatDuration,
  formatPrice,
  formatStudyDuration,
  makeOrderNo,
  slugify,
} from "../src/utils/format";
import { getRequestPublicOrigin } from "../src/utils/request-origin";
import {
  paymentReturnPath,
  productDetailPath,
  isCourseStudioProductType,
  isHiddenShellProductType,
  productTypeLabel,
} from "../src/types/product";
import { preferWechatTradeType } from "../src/client/wechat-env";
import { preferWechatFromAcceptLanguage } from "../src/client/auth-channel-preference";

test("价格与时长展示", () => {
  assert.equal(formatPrice(0), "免费");
  assert.equal(formatPrice(1990), "¥19.90");
  assert.equal(formatPrice(3000), "¥30");
  assert.equal(formatDuration(75), "1分15秒");
  assert.equal(formatStudyDuration(0), "未学习");
  assert.equal(formatStudyDuration(3660), "1 小时 1 分");
});

test("slug 保留中文，订单号带日期前缀", () => {
  assert.equal(slugify(" Next 课程 "), "next-课程");
  assert.equal(decodeRouteSlug("%E8%AF%BE%E7%A8%8B"), "课程");
  assert.equal(decodeRouteSlug("%E4%B8%8D%E5%90%88%E6%B3%95%"), "%E4%B8%8D%E5%90%88%E6%B3%95%");
  assert.match(makeOrderNo(), /^YD\d{18}$/);
});

test("不同产品类型落到各自的详情页", () => {
  assert.equal(productDetailPath("a", "MATERIAL"), "/materials/a");
  assert.equal(productDetailPath("a", "PRODUCT"), "/shop/a");
  assert.equal(productDetailPath("a", "MEETUP"), "/meetup/a");
  assert.equal(productDetailPath("a", "MATHCODE"), "/products/mathcode");
  assert.equal(productDetailPath("a", "COURSE"), "/courses/a");
  assert.equal(productTypeLabel("COLUMN"), "专栏");
  assert.equal(isCourseStudioProductType("MEETUP"), false);
  assert.equal(isHiddenShellProductType("MATHCODE"), true);
});

test("识图单支付后必须回工具页，否则上传队列会丢", () => {
  assert.equal(
    paymentReturnPath({ orderId: "o1", orderNo: "n1", productType: "MATHCODE" }),
    "/products/mathcode?payOrder=o1",
  );
  assert.equal(
    paymentReturnPath({ orderId: "o1", orderNo: "n1", productType: "COURSE" }),
    "/checkout/o1",
  );
});

test("反代后按转发头还原公网 Origin，不把用户甩回 localhost", () => {
  const origin = (headers: Record<string, string>) =>
    getRequestPublicOrigin(new Request("https://localhost:3000/x", { headers }));

  assert.equal(origin({ host: "www.yydsxwh.com" }), "https://www.yydsxwh.com");
  assert.equal(
    origin({ "x-forwarded-host": "www.yydsxwh.com", "x-forwarded-proto": "https" }),
    "https://www.yydsxwh.com",
  );
  assert.equal(origin({ host: "localhost:3000" }), "http://localhost:3000");
  assert.equal(origin({ host: "localhost:3000", "x-forwarded-proto": "https" }), null);
});

test("按 UA 选微信支付形态", () => {
  assert.equal(preferWechatTradeType("Mozilla/5.0 MicroMessenger/8.0"), "jsapi");
  assert.equal(preferWechatTradeType("Mozilla/5.0 (iPhone) Mobile Safari"), "h5");
  assert.equal(preferWechatTradeType("Mozilla/5.0 (Windows NT 10.0)"), "native");
});

test("缺少语言头按国内处理，首屏仍给微信", () => {
  assert.equal(preferWechatFromAcceptLanguage(null), true);
  assert.equal(preferWechatFromAcceptLanguage("zh-CN,zh;q=0.9"), true);
  assert.equal(preferWechatFromAcceptLanguage("en-US,en;q=0.9"), false);
});
