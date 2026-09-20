import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COLOR_TOKENS,
  CONTROL_TOKENS,
  CSS_VARIABLE_NAMES,
  colorVar,
  cssVariableDeclarations,
  RADIUS_TOKENS,
  SPACING_TOKENS,
} from "../src/design/tokens";

test("每个颜色 token 都有对应的 CSS 变量名，不会漏掉一个导致样式落空", () => {
  for (const token of Object.keys(COLOR_TOKENS)) {
    assert.ok(
      CSS_VARIABLE_NAMES[token as keyof typeof COLOR_TOKENS],
      `${token} 缺少 CSS 变量名`,
    );
  }
  assert.equal(
    Object.keys(CSS_VARIABLE_NAMES).length,
    Object.keys(COLOR_TOKENS).length,
  );
});

test("token 名与主站现有变量对齐，接入时不用改样式表", () => {
  assert.equal(CSS_VARIABLE_NAMES.muted, "--muted");
  assert.equal(CSS_VARIABLE_NAMES.brand, "--brand");
  assert.equal(CSS_VARIABLE_NAMES.bgDeep, "--bg-deep");
});

test("读 token 走 CSS 变量并带缺省值，装扮的运行时覆盖仍然生效", () => {
  assert.equal(colorVar("brand"), `var(--brand, ${COLOR_TOKENS.brand})`);
});

test("变量声明块覆盖全部颜色 token", () => {
  const css = cssVariableDeclarations();
  for (const name of Object.values(CSS_VARIABLE_NAMES)) {
    assert.ok(css.includes(`${name}:`), `声明块缺少 ${name}`);
  }
});

test("间距与圆角是递增阶梯，不会出现 lg 比 md 小这种事", () => {
  const spacing = Object.values(SPACING_TOKENS);
  const radius = Object.values(RADIUS_TOKENS);
  for (let i = 1; i < spacing.length; i++) {
    assert.ok(spacing[i]! > spacing[i - 1]!);
  }
  for (let i = 1; i < radius.length; i++) {
    assert.ok(radius[i]! > radius[i - 1]!);
  }
});

test("控件高度不低于移动端触控下限：手机微信里也要能点", () => {
  assert.ok(CONTROL_TOKENS.heightPx >= CONTROL_TOKENS.minTouchTargetPx);
  assert.equal(CONTROL_TOKENS.minTouchTargetPx, 44);
});
