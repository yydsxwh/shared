import assert from "node:assert/strict";
import test from "node:test";

import { assertObjectPrefix, safeObjectExtension } from "../src/contracts/storage";

test("academic 私有前缀必须落在自己的 namespace", () => {
  assert.equal(
    assertObjectPrefix("academic", "academic/private/student-records/rec_1/recharges/r_1"),
    "academic/private/student-records/rec_1/recharges/r_1",
  );
  assert.throws(() => assertObjectPrefix("academic", "course/private/x"), /namespace/);
  assert.throws(() => assertObjectPrefix("academic", "academic/public/x"), /academic\/private/);
  assert.throws(() => assertObjectPrefix("academic", "academic/private/../course"), /非法/);
  assert.equal(assertObjectPrefix("images", undefined), null);
});

test("对象扩展名只保留安全后缀", () => {
  assert.equal(safeObjectExtension("张三_1380000.jpg"), ".jpg");
  assert.equal(safeObjectExtension("noext"), "");
  assert.equal(safeObjectExtension("../evil.exe"), ".exe");
});
