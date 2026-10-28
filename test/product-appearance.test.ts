import assert from "node:assert/strict";
import { test } from "node:test";

import {
  acceptSnapshot,
  appearanceCookiePath,
  shouldRefreshTheme,
  canEditProductAppearance,
  classicIndependent,
  decideSource,
  parseIndependentTheme,
  parsePublicThemeSnapshot,
  resolveAppearance,
  restoreProductDefault,
  safeSnapshot,
  sanitizeBackgroundLayers,
  serializeAppearanceBoot,
  tabAppearanceId,
  userAppearanceScope,
  withSource,
  type AppearanceRecord,
  type PublicThemeSnapshot,
} from "../src/theme/product-appearance";

function snapshot(overrides: Record<string, unknown> = {}): PublicThemeSnapshot {
  const base = safeSnapshot();
  return { ...base, ...overrides } as PublicThemeSnapshot;
}

test("没有显式配置时默认跟随主站", () => {
  const resolved = resolveAppearance({
    product: "mall",
    userChoice: null,
    record: null,
    mainAvailable: false,
  });
  assert.equal(resolved.source, "FOLLOW_MAIN");
  assert.equal(resolved.origin, "builtin");
  assert.equal(resolved.visual, "safe");
  assert.equal(resolved.cssVars["--paper"], "#f5f9fc");
});

test("用户选择优先于产品默认，产品默认优先于内置跟随", () => {
  const record: AppearanceRecord = {
    source: "INDEPENDENT",
    independent: classicIndependent("mall"),
    cachedSnapshot: snapshot({ revision: "main_abc" }),
    cachedAt: "2026-10-29T00:00:00.000Z",
    lastFetchStatus: "ok",
  };
  assert.deepEqual(decideSource({ userChoice: "FOLLOW_MAIN", productSource: "INDEPENDENT" }), {
    source: "FOLLOW_MAIN",
    origin: "user",
  });
  assert.equal(
    resolveAppearance({ product: "mall", userChoice: null, record, mainAvailable: true }).source,
    "INDEPENDENT",
  );
  assert.equal(
    resolveAppearance({ product: "mall", userChoice: null, record, mainAvailable: true }).origin,
    "product",
  );
});

test("独立主题在跟随和切回之后仍然保留", () => {
  const classic = classicIndependent("academic");
  let record: AppearanceRecord = {
    source: "INDEPENDENT",
    independent: classic,
    cachedSnapshot: snapshot({
      colors: { ...safeSnapshot().colors, brand: "#112233" },
    }),
    cachedAt: "2026-10-29T00:00:00.000Z",
    lastFetchStatus: "ok",
  };
  record = withSource(record, "FOLLOW_MAIN");
  const following = resolveAppearance({
    product: "academic",
    userChoice: null,
    record,
    mainAvailable: true,
  });
  assert.equal(following.visual, "main");
  assert.equal(following.cssVars["--accent"], "#112233");
  assert.equal(record.independent.colors.brand, classic.colors.brand);
  record = withSource(record, "INDEPENDENT");
  const restored = resolveAppearance({
    product: "academic",
    userChoice: null,
    record,
    mainAvailable: true,
  });
  assert.equal(restored.cssVars["--accent"], "#b4532a");
  assert.equal(restored.cssVars["--paper"], "#fffdf8");
  assert.equal(restored.cssVars["--background"], "#f3efe6");
  const reset = restoreProductDefault(record);
  assert.equal(reset.source, "FOLLOW_MAIN");
  assert.equal(reset.independent.colors.brand, classic.colors.brand);
});

test("市集 paper 是页面底，辅导 paper 是内容底板", () => {
  const mall = resolveAppearance({
    product: "mall",
    userChoice: "INDEPENDENT",
    record: null,
    mainAvailable: true,
  });
  assert.equal(mall.cssVars["--paper"], "#f7f3ec");
  assert.equal(mall.cssVars["--card"], "#fffdf8");
  assert.equal(mall.cssVars["--brand"], "#9a3412");
});

test("损坏快照和未知版本不会覆盖有效缓存", () => {
  const current = snapshot({ revision: "main_good" });
  const broken = acceptSnapshot(current, {
    schemaVersion: 1,
    revision: "main_bad",
    updatedAt: "2026-10-29T00:00:00.000Z",
    paletteId: "sky-fresh",
    backgroundId: "soft-dawn",
    colors: { ...current.colors, brand: "expression(alert(1))" },
    background: { kind: "gradient", layers: "linear-gradient(180deg,#fff,#000)" },
    font: { family: "sans-serif", sizePx: 16, stylesheetUrls: [] },
    assetBase: "https://www.yydsxwh.com",
  });
  assert.equal(broken.stored, false);
  assert.equal(broken.snapshot?.revision, "main_good");
  const future = acceptSnapshot(current, { ...current, schemaVersion: 2 });
  assert.equal(future.stored, false);
  assert.equal(future.snapshot?.revision, "main_good");
});

test("背景只接受主站资源基准上的地址", () => {
  const safe = sanitizeBackgroundLayers(
    'linear-gradient(180deg,#fff,#f5f9fc), url("/covers/hero-seminar.jpg?v=1")',
    "https://www.yydsxwh.com",
  );
  assert.equal(safe.degraded, false);
  assert.match(safe.layers, /https:\/\/www\.yydsxwh\.com\/covers\/hero-seminar\.jpg\?v=1/);
  const signed = sanitizeBackgroundLayers(
    'url("https://www.yydsxwh.com/private.png?X-Amz-Signature=abc")',
    "https://www.yydsxwh.com",
  );
  assert.equal(signed.degraded, true);
  assert.equal(signed.layers, "");
  const injected = sanitizeBackgroundLayers('url("javascript:alert(1)")', "https://www.yydsxwh.com");
  assert.equal(injected.layers, "");
});

test("产品管理员和普通用户的权限分开", () => {
  assert.equal(canEditProductAppearance(["ADMIN"], "mall"), true);
  assert.equal(canEditProductAppearance(["BUYER"], "mall"), false);
  assert.equal(canEditProductAppearance(["OPERATOR"], "mall"), false);
  assert.equal(canEditProductAppearance(["ADMIN"], "academic"), true);
  assert.equal(canEditProductAppearance(["SUPER_ADMIN"], "academic"), true);
  assert.equal(canEditProductAppearance(["ACADEMIC_STAFF"], "academic"), false);
  assert.equal(canEditProductAppearance(["STUDENT"], "academic"), false);
});

test("不同账号和不同标签页不会共用一个偏好键", () => {
  assert.equal(userAppearanceScope("usr_student"), "sub:usr_student");
  assert.notEqual(userAppearanceScope("usr_student"), userAppearanceScope("usr_teacher"));
  assert.equal(userAppearanceScope("student"), null);
  assert.equal(userAppearanceScope("usr_a"), userAppearanceScope("usr_a"));
  assert.equal(tabAppearanceId("a".repeat(16)), "a".repeat(16));
  assert.equal(tabAppearanceId("short"), null);
  assert.notEqual(tabAppearanceId("a".repeat(16)), tabAppearanceId("b".repeat(16)));
});

test("主题缓存超过 60 秒才向主站核对", () => {
  const now = Date.parse("2026-10-29T00:02:00.000Z");
  assert.equal(shouldRefreshTheme(null, now), true);
  assert.equal(shouldRefreshTheme("2026-10-29T00:01:30.000Z", now), false);
  assert.equal(shouldRefreshTheme("2026-10-29T00:00:00.000Z", now), true);
});

test("商城外观 Cookie 只挂在市集路径上", () => {
  assert.equal(appearanceCookiePath("/mall"), "/mall");
  assert.equal(appearanceCookiePath(""), "/");
  assert.notEqual(appearanceCookiePath("/mall"), "/");
});

test("独立主题不接收带远程地址的背景", () => {
  const parsed = parseIndependentTheme(
    {
      ...classicIndependent("mall"),
      background: { kind: "photo", layers: 'url("https://www.yydsxwh.com/covers/a.jpg")' },
    },
    "mall",
  );
  assert.equal(parsed.background.layers.includes("url("), false);
  assert.equal(parsed.colors.brand, "#9a3412");
});

test("首屏脚本只按标签页选择来源，不把样式从本地存储读出来", () => {
  const script = serializeAppearanceBoot({
    product: "academic",
    source: "FOLLOW_MAIN",
    storageKey: "academic.appearance.v1",
    tabKey: "yyds.tab.v1",
    followVars: { "--ink": "#111111" },
    independentVars: { "--ink": "#222222" },
  });
  assert.match(script, /localStorage/);
  assert.doesNotMatch(script, /<script/);
  assert.match(script, /FOLLOW_MAIN/);
});

test("合法快照可以替换缓存", () => {
  const raw = snapshot({ revision: "main_next", updatedAt: "2026-10-29T01:02:03.000Z" });
  const accepted = acceptSnapshot(null, raw);
  assert.equal(accepted.stored, true);
  assert.equal(accepted.snapshot?.revision, "main_next");
  const parsed = parsePublicThemeSnapshot({
    ...raw,
    font: { family: "sans-serif", sizePx: 99, stylesheetUrls: ["https://evil.example/font.css"] },
  });
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.font.sizePx, 28);
    assert.deepEqual(parsed.value.font.stylesheetUrls, []);
  }
});
