import { test } from "node:test";
import assert from "node:assert/strict";

import { toSimplifiedChinese, toTraditionalChinese } from "../src/i18n/opencc";

test("简繁互转走本地 OpenCC", async () => {
  assert.equal(await toTraditionalChinese("网课资料"), "網課資料");
  assert.equal(await toSimplifiedChinese("網課資料"), "网课资料");
});

test("空串直接返回，不加载词典", async () => {
  assert.equal(await toTraditionalChinese(""), "");
  assert.equal(await toSimplifiedChinese(""), "");
});
