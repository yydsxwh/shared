import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canAccessStudio,
  canCreateSellableProducts,
  canManageCourses,
  isAdmin,
  normalizeRoles,
  primaryRole,
  roleFieldsFromList,
  roleLabels,
  serializeRoles,
} from "../src/types/roles";

test("空值回落到 STUDENT，避免无角色用户拿到空权限数组", () => {
  assert.deepEqual(normalizeRoles(null), ["STUDENT"]);
  assert.deepEqual(normalizeRoles(""), ["STUDENT"]);
  assert.deepEqual(normalizeRoles([]), ["STUDENT"]);
  assert.deepEqual(normalizeRoles("NOT_A_ROLE"), ["STUDENT"]);
});

test("逗号串、数组与会话对象都能解析出多角色", () => {
  assert.deepEqual(normalizeRoles("ADMIN,TEACHER"), ["ADMIN", "TEACHER"]);
  assert.deepEqual(normalizeRoles(["TEACHER", "TEACHER"]), ["TEACHER"]);
  assert.deepEqual(normalizeRoles({ roles: "AGENT,MERCHANT" }), [
    "AGENT",
    "MERCHANT",
  ]);
  assert.deepEqual(normalizeRoles({ role: "ADMIN" }), ["ADMIN"]);
});

test("有特权身份时不再保留 STUDENT，避免展示「用户、老师」", () => {
  assert.deepEqual(normalizeRoles("STUDENT,TEACHER"), ["TEACHER"]);
  assert.equal(roleLabels("STUDENT,TEACHER"), "老师");
});

test("主角色按优先级取最高", () => {
  assert.equal(primaryRole("TEACHER,ADMIN"), "ADMIN");
  assert.equal(primaryRole("STUDENT"), "STUDENT");
  assert.deepEqual(roleFieldsFromList(["TEACHER", "MERCHANT"]), {
    role: "MERCHANT",
    roles: "TEACHER,MERCHANT",
  });
  assert.equal(serializeRoles(["ADMIN"]), "ADMIN");
});

test("老师可维护课程但不能新建可售产品", () => {
  assert.equal(canManageCourses("TEACHER"), true);
  assert.equal(canCreateSellableProducts("TEACHER"), false);
  assert.equal(canCreateSellableProducts("MERCHANT"), true);
  assert.equal(canAccessStudio("STUDENT"), false);
  assert.equal(isAdmin("ADMIN,STUDENT"), true);
});
