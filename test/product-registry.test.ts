import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PRODUCT_REGISTRY,
  productById,
  productsIndependentOfMain,
} from "../src/products/registry";

test("产品入口是静态注册，不指向主站动态目录接口", () => {
  for (const product of PRODUCT_REGISTRY) {
    assert.equal(product.origin.includes("/api/products"), false);
    assert.ok(product.origin.startsWith("https://"));
  }
});

test("账号中心与日事的运行不依赖主站进程", () => {
  assert.equal(productById("account")?.runtimeDependsOnMain, false);
  assert.equal(productById("rishi")?.runtimeDependsOnMain, false);
  assert.deepEqual(
    productsIndependentOfMain().map((item) => item.id),
    ["rishi"],
  );
});

test("尚未拆出的产品必须标明仍在主站进程里", () => {
  for (const id of ["course", "mathcode", "meetup", "forum", "docs"]) {
    assert.equal(productById(id)?.runtimeDependsOnMain, true, id);
  }
});
