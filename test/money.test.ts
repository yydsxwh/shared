import { test } from "node:test";
import assert from "node:assert/strict";

import {
  centsToYuanString,
  isValidYuanInput,
  yuanToCents,
} from "../src/utils/money";

test("元转分用字符串解析，避开 19.9 * 100 的浮点误差", () => {
  assert.equal(yuanToCents("19.9"), 1990);
  assert.equal(yuanToCents("19.90"), 1990);
  assert.equal(yuanToCents("0"), 0);
  assert.equal(yuanToCents(30), 3000);
});

test("非法金额直接抛错，不静默按 0 入库", () => {
  assert.throws(() => yuanToCents("-1"));
  assert.throws(() => yuanToCents("1.234"));
  assert.throws(() => yuanToCents("abc"));
  assert.throws(() => yuanToCents(""));
});

test("金额校验与回填", () => {
  assert.equal(isValidYuanInput("0.5"), true);
  assert.equal(isValidYuanInput("01"), false);
  assert.equal(centsToYuanString(1990), "19.90");
  assert.equal(centsToYuanString(3000), "30");
  assert.equal(centsToYuanString(-5), "0");
});
