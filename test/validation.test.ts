import { test } from "node:test";
import assert from "node:assert/strict";

import {
  accountPlaceholderEmail,
  isPlaceholderEmail,
  phonePlaceholderEmail,
  wechatPlaceholderEmail,
} from "../src/validation/email";
import { isValidCnMobile, maskPhone, normalizePhone } from "../src/validation/phone";
import { normalizeUsername, validateUsername } from "../src/validation/username";
import {
  isValidReferralCode,
  normalizeReferralCode,
  referralCodeError,
} from "../src/utils/referral-code";

test("手机号去掉 +86 / 空格后统一成 11 位", () => {
  assert.equal(normalizePhone(" +86 138-0013-8000 "), "13800138000");
  assert.equal(normalizePhone("008613800138000"), "13800138000");
  assert.equal(normalizePhone("8613800138000"), "13800138000");
  assert.equal(isValidCnMobile("13800138000"), true);
  assert.equal(isValidCnMobile("12800138000"), false);
  assert.equal(maskPhone("13800138000"), "138****8000");
});

test("登录名规则：小写字母开头、4–20 位，保留名不可用", () => {
  assert.deepEqual(validateUsername(" AndyYY "), { ok: true, username: "andyyy" });
  assert.equal(normalizeUsername(" AndyYY "), "andyyy");
  assert.equal(validateUsername("ab").ok, false);
  assert.equal(validateUsername("1abcd").ok, false);
  assert.equal(validateUsername("admin").ok, false);
  assert.equal(validateUsername("a@b.com").ok, false);
});

test("占位邮箱可被识别，绑定真实邮箱后才算真邮箱", () => {
  assert.equal(isPlaceholderEmail(wechatPlaceholderEmail("oABC-123")), true);
  assert.equal(isPlaceholderEmail(phonePlaceholderEmail("13800138000")), true);
  assert.equal(isPlaceholderEmail(accountPlaceholderEmail("andyyy")), true);
  assert.equal(isPlaceholderEmail("real@example.com"), false);
});

test("邀请码统一大写，4–16 位字母数字", () => {
  assert.equal(normalizeReferralCode(" ab12 "), "AB12");
  assert.equal(isValidReferralCode("AB12"), true);
  assert.equal(isValidReferralCode("AB1"), false);
  assert.equal(referralCodeError("AB12"), null);
  assert.equal(referralCodeError(""), "请填写邀请码");
});
