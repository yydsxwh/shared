/**
 * 公司级 Design Tokens（第一批）。
 *
 * 原则：**品牌一致，产品体验独立。** 这里只放语义 token——颜色角色、间距、圆角、
 * 字号阶梯。各端（Web / Android / iOS / Windows / HarmonyOS）共享同一套品牌变量，
 * 但不强求长得一样，具体组件与布局仍归各产品自己。
 *
 * token 名称取自主站已在用的 CSS 变量（`--ink`、`--muted`、`--brand`、`--line` 等），
 * 不另起一套命名，避免接入时要做一次心智映射。装扮产品仍可在运行时覆盖这些变量，
 * 这里给的是缺省值。
 */

/** 颜色角色。值是缺省浅色主题，装扮/深色主题在运行时覆盖同名变量。 */
export const COLOR_TOKENS = {
  /** 正文与标题的主文字色 */
  ink: "#1f2430",
  /** 次要说明文字，用量最大的语义色 */
  muted: "#6b7280",
  /** 分隔线与描边 */
  line: "#e5e7eb",
  /** 页面底色 */
  bg: "#ffffff",
  /** 更深一层的页面底色，用于分区 */
  bgDeep: "#f5f6f8",
  /** 卡片/面板底色 */
  card: "#ffffff",
  /** 品牌主色：主按钮、选中态、强调链接 */
  brand: "#2f6df6",
  /** 品牌主色的浅色底，用于标签与浅底按钮 */
  brandSoft: "#e8f0ff",
  /** 品牌主色的深色态，用于 hover / active */
  brandStrong: "#1c4fd0",
  /** 强提示色：限时、热度、警示性强调 */
  fire: "#f2603c",
  fireSoft: "#ffece7",
  fireStrong: "#c8462a",
  /** 危险操作与错误态 */
  danger: "#d92d20",
  dangerSoft: "#fee4e2",
  /** 成功态 */
  success: "#12805c",
  successSoft: "#d3f4e6",
} as const;

export type ColorToken = keyof typeof COLOR_TOKENS;

/** 间距阶梯，单位 px。4 的倍数，够用且不至于让页面各写各的。 */
export const SPACING_TOKENS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export type SpacingToken = keyof typeof SPACING_TOKENS;

export const RADIUS_TOKENS = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  /** 卡片与面板 */
  xl: 28,
  /** 胶囊按钮 */
  pill: 9999,
} as const;

export type RadiusToken = keyof typeof RADIUS_TOKENS;

/** 字号阶梯，单位 px */
export const FONT_SIZE_TOKENS = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;

export type FontSizeToken = keyof typeof FONT_SIZE_TOKENS;

export const FONT_WEIGHT_TOKENS = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/**
 * 控件尺寸。
 * 最小高度 44px 不是随便定的：移动端触控目标低于这个值点不准，
 * 而「电脑能点的，手机微信里也要能点」是公司级约定。
 */
export const CONTROL_TOKENS = {
  minTouchTargetPx: 44,
  heightPx: 44,
  heightSmPx: 36,
  paddingXPx: 16,
  paddingXSmPx: 12,
} as const;

/** CSS 变量名：与主站现有变量对齐，接入时不需要改样式表 */
export const CSS_VARIABLE_NAMES: Record<ColorToken, string> = {
  ink: "--ink",
  muted: "--muted",
  line: "--line",
  bg: "--bg",
  bgDeep: "--bg-deep",
  card: "--card",
  brand: "--brand",
  brandSoft: "--brand-soft",
  brandStrong: "--brand-strong",
  fire: "--fire",
  fireSoft: "--fire-soft",
  fireStrong: "--fire-strong",
  danger: "--danger",
  dangerSoft: "--danger-soft",
  success: "--success",
  successSoft: "--success-soft",
};

/** 读 token 时一律走 CSS 变量，这样装扮产品的运行时覆盖仍然生效 */
export function colorVar(token: ColorToken): string {
  return `var(${CSS_VARIABLE_NAMES[token]}, ${COLOR_TOKENS[token]})`;
}

/** 生成 `:root` 里的缺省变量声明，供各端样式表引入 */
export function cssVariableDeclarations(): string {
  return (Object.keys(COLOR_TOKENS) as ColorToken[])
    .map((token) => `  ${CSS_VARIABLE_NAMES[token]}: ${COLOR_TOKENS[token]};`)
    .join("\n");
}
