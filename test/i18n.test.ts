import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isAppLocale,
  parseEnabledLocalesJson,
  stringifyEnabledLocales,
  SUPPORTED_LOCALES,
} from "../src/i18n/locales";
import {
  resolveLocaleFromAcceptLanguage,
  resolveRequestLocale,
} from "../src/i18n/resolve-locale";
import { hashSourceText } from "../src/i18n/source-hash";

const ALL = [...SUPPORTED_LOCALES];

test("繁体地区走 zh-Hant，裸 zh 走简体", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("zh-TW,zh;q=0.9", ALL), "zh-Hant");
  assert.equal(resolveLocaleFromAcceptLanguage("zh-HK", ALL), "zh-Hant");
  assert.equal(resolveLocaleFromAcceptLanguage("zh", ALL), "zh-Hans");
  assert.equal(resolveLocaleFromAcceptLanguage("zh-CN", ALL), "zh-Hans");
});

test("未启用的语种要退回可用列表，不能返回没开的语言", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("ja", ["en", "zh-Hans"]), "zh-Hans");
  assert.equal(resolveLocaleFromAcceptLanguage("tl-PH", ALL), "fil");
  assert.equal(resolveLocaleFromAcceptLanguage(null, ALL), "zh-Hans");
  assert.equal(resolveLocaleFromAcceptLanguage("de;q=0.8,en;q=0.9", ALL), "en");
});

test("cookie 覆盖优先于 Accept-Language", () => {
  assert.equal(
    resolveRequestLocale({
      cookieLocale: "ja",
      acceptLanguage: "zh-CN",
      enabled: ALL,
      fallback: "zh-Hans",
    }),
    "ja",
  );
  assert.equal(
    resolveRequestLocale({
      cookieLocale: "ja",
      acceptLanguage: "zh-CN",
      enabled: ["zh-Hans"],
      fallback: "zh-Hans",
    }),
    "zh-Hans",
  );
});

test("启用语种列表的读写", () => {
  assert.equal(isAppLocale("en"), true);
  assert.equal(isAppLocale("kr"), false);
  assert.deepEqual(parseEnabledLocalesJson('["en","kr"]'), ["en"]);
  assert.deepEqual(parseEnabledLocalesJson("[]"), ALL);
  assert.deepEqual(parseEnabledLocalesJson("坏 JSON"), ALL);
  assert.equal(stringifyEnabledLocales(["en"]), '["en"]');
});

test("源文指纹变化后译文才需要重翻", () => {
  assert.equal(hashSourceText("同一段话"), hashSourceText("同一段话"));
  assert.notEqual(hashSourceText("改过了"), hashSourceText("同一段话"));
  assert.equal(hashSourceText("x").length, 32);
});
