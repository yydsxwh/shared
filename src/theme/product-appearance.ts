/**
 * 商城与辅导系统共用的外观契约。
 *
 * 这里只有纯类型、校验和变量映射，不读主站数据库，也不带会话或密钥。
 * 主站装扮仍是权威来源；产品保存的是「跟随关系」和自己的独立主题，
 * 不是把某一时刻的颜色抄死。
 *
 * 0.16.0 打 tag 之前，商城、辅导和主站各内嵌同一份文件，避免依赖未发布的包。
 * 发布后改为从 `@yydsxwh/shared/theme/product-appearance` 引用，不要分叉逻辑。
 */

export const PRODUCT_THEME_SCHEMA_VERSION = 1 as const;

export const THEME_CACHE_MAX_AGE_MS = 60_000;
export const THEME_FETCH_TIMEOUT_MS = 1_200;

export const MALL_APPEARANCE_COOKIE = "mall_appearance";
export const ACADEMIC_APPEARANCE_STORAGE_KEY = "academic.appearance.v1";

export type ProductId = "mall" | "academic";
export type ThemeSource = "FOLLOW_MAIN" | "INDEPENDENT";
export type ThemeOrigin = "user" | "product" | "builtin";
export type ThemeVisual = "main" | "independent" | "safe";
export type LayoutDensity = "default" | "compact" | "airy";
export type ThemeBackgroundKind = "gradient" | "photo" | "pattern" | "none";

export type ThemeColorTokens = {
  bg: string;
  bgDeep: string;
  ink: string;
  muted: string;
  line: string;
  brand: string;
  brandStrong: string;
  brandSoft: string;
  fire: string;
  fireStrong: string;
  fireSoft: string;
  card: string;
  shadow: string;
};

export type ThemeBackground = {
  kind: ThemeBackgroundKind;
  layers: string;
  degraded: boolean;
};

export type ThemeFont = {
  family: string;
  sizePx: number;
  stylesheetUrls: string[];
};

/** 主站已保存装扮的公开投影。不含预览、横幅、音乐、挂件和后台对象。 */
export type PublicThemeSnapshot = {
  schemaVersion: typeof PRODUCT_THEME_SCHEMA_VERSION;
  revision: string;
  updatedAt: string;
  paletteId: string;
  backgroundId: string;
  density: LayoutDensity;
  colors: ThemeColorTokens;
  background: ThemeBackground;
  radiusPx: number;
  surfacePad: string;
  font: ThemeFont;
  assetBase: string;
};

export type IndependentTheme = {
  schemaVersion: typeof PRODUCT_THEME_SCHEMA_VERSION;
  label: string;
  density: LayoutDensity;
  colors: ThemeColorTokens;
  background: ThemeBackground;
  radiusPx: number;
  surfacePad: string;
  fontFamily: string;
  fontSizePx: number;
};

export type AppearanceRecord = {
  source: ThemeSource;
  independent: IndependentTheme;
  cachedSnapshot: PublicThemeSnapshot | null;
  cachedAt: string | null;
  lastFetchStatus: "none" | "ok" | "unavailable" | "invalid";
};

export type ResolvedAppearance = {
  source: ThemeSource;
  origin: ThemeOrigin;
  visual: ThemeVisual;
  degraded: boolean;
  revision: string;
  updatedAt: string;
  colorScheme: "light" | "dark";
  cssVars: Record<string, string>;
  followVars: Record<string, string>;
  independentVars: Record<string, string>;
  followScheme: "light" | "dark";
  independentScheme: "light" | "dark";
};

const COLOR_KEYS = [
  "bg",
  "bgDeep",
  "ink",
  "muted",
  "line",
  "brand",
  "brandStrong",
  "brandSoft",
  "fire",
  "fireStrong",
  "fireSoft",
  "card",
  "shadow",
] as const;

const SYSTEM_FONT =
  '"PingFang SC", "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif';

/** 与主站默认「清新天蓝」一致，供首次离线或主题源不可用时使用。 */
export const SAFE_COLORS: ThemeColorTokens = {
  bg: "#f5f9fc",
  bgDeep: "#e8f1f8",
  ink: "#0f172a",
  muted: "#5b6b7c",
  line: "rgba(15, 23, 42, 0.1)",
  brand: "#0ea5e9",
  brandStrong: "#0284c7",
  brandSoft: "rgba(14, 165, 233, 0.1)",
  fire: "#f43f5e",
  fireStrong: "#e11d48",
  fireSoft: "rgba(244, 63, 94, 0.1)",
  card: "rgba(255, 255, 255, 0.92)",
  shadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
};

const MALL_CLASSIC_COLORS: ThemeColorTokens = {
  bg: "#f7f3ec",
  bgDeep: "#efe7da",
  ink: "#1c1917",
  muted: "#57534e",
  line: "#e6dccb",
  brand: "#9a3412",
  brandStrong: "#7c2d12",
  brandSoft: "rgba(154, 52, 18, 0.12)",
  fire: "#9f1239",
  fireStrong: "#881337",
  fireSoft: "rgba(159, 18, 57, 0.12)",
  card: "#fffdf8",
  shadow: "0 16px 40px rgba(28, 25, 23, 0.06)",
};

const ACADEMIC_CLASSIC_COLORS: ThemeColorTokens = {
  bg: "#f3efe6",
  bgDeep: "#e7dfd2",
  ink: "#14233a",
  muted: "#5c6b7a",
  line: "#e3d9c8",
  brand: "#b4532a",
  brandStrong: "#9a3412",
  brandSoft: "rgba(180, 83, 42, 0.12)",
  fire: "#b4532a",
  fireStrong: "#9a3412",
  fireSoft: "rgba(180, 83, 42, 0.12)",
  card: "#fffdf8",
  shadow: "0 16px 40px rgba(20, 35, 58, 0.06)",
};

const FONT_HOSTS = new Set(["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"]);
const ALLOWED_LAYER_FNS = new Set([
  "linear-gradient",
  "radial-gradient",
  "repeating-linear-gradient",
  "repeating-radial-gradient",
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "var",
  "color-mix",
  "url",
]);

export function shouldRefreshTheme(
  cachedAt: string | null,
  now = Date.now(),
  maxAge = THEME_CACHE_MAX_AGE_MS,
): boolean {
  if (!cachedAt) return true;
  const time = Date.parse(cachedAt);
  if (!Number.isFinite(time)) return true;
  return now - time >= maxAge;
}

export function appearanceCookiePath(basePath: string): string {
  const trimmed = basePath.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function parseThemeSource(value: unknown): ThemeSource | null {
  return value === "FOLLOW_MAIN" || value === "INDEPENDENT" ? value : null;
}

/** 登录用户的偏好键。只认账号中心 sub，不把标签页或浏览器混成一个键。 */
export function userAppearanceScope(accountSub: string | null | undefined): string | null {
  const sub = accountSub?.trim() ?? "";
  if (!/^usr_[A-Za-z0-9_-]{1,80}$/.test(sub)) return null;
  return `sub:${sub}`;
}

export function tabAppearanceId(tabId: string | null | undefined): string | null {
  const id = tabId?.trim() ?? "";
  return /^[A-Za-z0-9_-]{16,80}$/.test(id) ? id : null;
}

export function canEditProductAppearance(roles: readonly string[], product: ProductId): boolean {
  if (product === "mall") return roles.includes("ADMIN");
  return roles.includes("SUPER_ADMIN") || roles.includes("ADMIN");
}

export function densityMetrics(density: LayoutDensity): { radiusPx: number; surfacePad: string } {
  if (density === "compact") return { radiusPx: 18, surfacePad: "1.1rem" };
  if (density === "airy") return { radiusPx: 32, surfacePad: "1.85rem" };
  return { radiusPx: 28, surfacePad: "1.5rem" };
}

export function classicIndependent(product: ProductId): IndependentTheme {
  const colors = product === "mall" ? MALL_CLASSIC_COLORS : ACADEMIC_CLASSIC_COLORS;
  const metrics = densityMetrics("default");
  const fontFamily =
    product === "academic"
      ? `var(--font-sans), ${SYSTEM_FONT}`
      : SYSTEM_FONT;
  return {
    schemaVersion: PRODUCT_THEME_SCHEMA_VERSION,
    label: product === "mall" ? "市集经典" : "辅导经典",
    density: "default",
    colors,
    background: {
      kind: "gradient",
      layers: `linear-gradient(180deg, ${colors.card} 0%, ${colors.bg} 100%)`,
      degraded: false,
    },
    radiusPx: metrics.radiusPx,
    surfacePad: metrics.surfacePad,
    fontFamily,
    fontSizePx: 16,
  };
}

export function safeSnapshot(): PublicThemeSnapshot {
  const metrics = densityMetrics("default");
  return {
    schemaVersion: PRODUCT_THEME_SCHEMA_VERSION,
    revision: "safe-sky",
    updatedAt: "1970-01-01T00:00:00.000Z",
    paletteId: "sky-fresh",
    backgroundId: "soft-dawn",
    density: "default",
    colors: SAFE_COLORS,
    background: {
      kind: "gradient",
      layers:
        "radial-gradient(ellipse 80% 50% at 10% -10%, rgba(14, 165, 233, 0.14), transparent 55%), linear-gradient(180deg, #ffffff 0%, #f5f9fc 45%, #eef5fb 100%)",
      degraded: false,
    },
    radiusPx: metrics.radiusPx,
    surfacePad: metrics.surfacePad,
    font: { family: SYSTEM_FONT, sizePx: 16, stylesheetUrls: [] },
    assetBase: "https://www.yydsxwh.com",
  };
}

export function builtinAppearance(product: ProductId): AppearanceRecord {
  return {
    source: "FOLLOW_MAIN",
    independent: classicIndependent(product),
    cachedSnapshot: null,
    cachedAt: null,
    lastFetchStatus: "none",
  };
}

function isHex(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function isRgb(value: string): boolean {
  const match = value.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/,
  );
  if (!match) return false;
  const channels = [match[1], match[2], match[3]].map(Number);
  if (channels.some((channel) => channel > 255)) return false;
  if (match[4] != null && Number(match[4]) > 1) return false;
  return true;
}

function isHsl(value: string): boolean {
  return /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(value);
}

export function isCssColor(value: string): boolean {
  return value === "transparent" || isHex(value) || isRgb(value) || isHsl(value);
}

function isSafeShadow(value: string): boolean {
  if (value.length === 0 || value.length > 180) return false;
  if (/url|expression|javascript|@|<|>/i.test(value)) return false;
  return /^[0-9a-zA-Z\s,().%#+\-]+$/.test(value);
}

function sanitizeFontFamily(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > 240) return fallback;
  if (/url|expression|javascript|@|<|>|\{|\}|;|\\/i.test(text)) return fallback;
  const withoutVars = text.replace(/var\(--[a-z0-9-]+\)/g, "x");
  return /^[\w\s,"'.\-]+$/.test(withoutVars) ? text : fallback;
}

function clampFontSize(value: unknown, fallback: number): number {
  const size = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(size)) return fallback;
  return Math.min(28, Math.max(14, Math.round(size)));
}

function parseDensity(value: unknown): LayoutDensity {
  return value === "compact" || value === "airy" || value === "default" ? value : "default";
}

export function canonicalAssetUrl(raw: string, assetBase: string): string | null {
  const text = raw.trim();
  if (!text || text.length > 500 || /[<>\s]/.test(text)) return null;
  let base: URL;
  try {
    base = new URL(assetBase);
  } catch {
    return null;
  }
  if (base.protocol !== "https:" && base.protocol !== "http:") return null;
  let url: URL;
  try {
    url = text.startsWith("/") ? new URL(text, base) : new URL(text);
  } catch {
    return null;
  }
  if (url.origin !== base.origin || url.username || url.password) return null;
  if (url.pathname.split("/").includes("..")) return null;
  const keys = [...url.searchParams.keys()];
  if (keys.some((key) => key !== "v")) return null;
  const version = url.searchParams.get("v");
  if (version && !/^[A-Za-z0-9._-]{1,40}$/.test(version)) return null;
  return url.toString();
}

export function sanitizeStylesheetUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const urls: string[] = [];
  for (const item of value) {
    if (urls.length >= 4 || typeof item !== "string" || item.length > 240) continue;
    let url: URL;
    try {
      url = new URL(item);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" || !FONT_HOSTS.has(url.hostname) || url.username || url.password) continue;
    const keys = [...url.searchParams.keys()];
    if (keys.some((key) => key !== "v" && key !== "family" && key !== "display")) continue;
    urls.push(url.toString());
  }
  return urls;
}

/** 只保留渐变、受控图片和颜色函数。非法图片会被丢掉，不把原始字符串写进页面。 */
export function sanitizeBackgroundLayers(layers: string, assetBase: string): { layers: string; degraded: boolean } {
  const trimmed = layers.trim();
  if (!trimmed || trimmed.length > 4000) return { layers: "", degraded: true };
  if (/[<>{}\\;@]|javascript:|expression\s*\(|@import|url\s*\(\s*['"]?\s*data:/i.test(trimmed)) {
    return { layers: "", degraded: true };
  }
  let degraded = false;
  const rewritten = trimmed.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_all, _quote: string, raw: string) => {
    const safe = canonicalAssetUrl(raw, assetBase);
    if (!safe) {
      degraded = true;
      return "";
    }
    return `url("${safe}")`;
  });
  if (degraded || rewritten.includes("url()") || rewritten.includes('url("")')) {
    return { layers: "", degraded: true };
  }
  if (!/^[\s\w#(),.%/'":+\-?=&]+$/.test(rewritten)) return { layers: "", degraded: true };
  const functions = rewritten.match(/[a-z-]+\s*\(/gi) ?? [];
  for (const fn of functions) {
    const name = fn.replace(/\s*\($/, "").toLowerCase();
    if (!ALLOWED_LAYER_FNS.has(name)) return { layers: "", degraded: true };
  }
  const open = rewritten.match(/\(/g)?.length ?? 0;
  const close = rewritten.match(/\)/g)?.length ?? 0;
  if (open !== close) return { layers: "", degraded: true };
  return { layers: rewritten, degraded };
}

function channel(value: string): { r: number; g: number; b: number } | null {
  if (isHex(value)) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = hex.slice(0, 3).split("").map((item) => item + item).join("");
    if (hex.length === 8) hex = hex.slice(0, 6);
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }
  const rgb = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (!rgb) return null;
  return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
}

export function relativeLuminance(color: string): number {
  const rgb = channel(color);
  if (!rgb) return 1;
  const linear = [rgb.r, rgb.g, rgb.b].map((item) => {
    const channelValue = item / 255;
    return channelValue <= 0.03928 ? channelValue / 12.92 : ((channelValue + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function colorSchemeFor(background: string): "light" | "dark" {
  return relativeLuminance(background) < 0.45 ? "dark" : "light";
}

function onColor(background: string): string {
  return relativeLuminance(background) > 0.62 ? "#1c1917" : "#fffdf8";
}

function semanticColors(scheme: "light" | "dark") {
  if (scheme === "dark") {
    return {
      danger: "#fecdd3",
      dangerSoft: "rgba(159, 18, 57, 0.35)",
      ok: "#bbf7d0",
      positive: "#86efac",
    };
  }
  return {
    danger: "#9f1239",
    dangerSoft: "#fee4e2",
    ok: "#166534",
    positive: "#1f6b45",
  };
}

function readColors(value: unknown, fallback: ThemeColorTokens): { colors: ThemeColorTokens; ok: boolean } {
  if (!value || typeof value !== "object") return { colors: fallback, ok: false };
  const record = value as Record<string, unknown>;
  const colors = { ...fallback };
  let ok = true;
  for (const key of COLOR_KEYS) {
    const raw = record[key];
    if (typeof raw !== "string") {
      ok = false;
      continue;
    }
    if (key === "shadow") {
      if (isSafeShadow(raw)) colors.shadow = raw;
      else ok = false;
      continue;
    }
    if (isCssColor(raw)) colors[key] = raw;
    else ok = false;
  }
  return { colors, ok };
}

export function buildPublicSnapshot(input: {
  revision: string;
  updatedAt: string;
  paletteId: string;
  backgroundId: string;
  density: LayoutDensity;
  colors: ThemeColorTokens;
  backgroundKind: ThemeBackgroundKind;
  backgroundLayers: string;
  fontFamily: string;
  fontSizePx: number;
  stylesheetUrls: string[];
  assetBase: string;
}): PublicThemeSnapshot | null {
  const parsed = parsePublicThemeSnapshot({
    schemaVersion: PRODUCT_THEME_SCHEMA_VERSION,
    revision: input.revision,
    updatedAt: input.updatedAt,
    paletteId: input.paletteId,
    backgroundId: input.backgroundId,
    density: input.density,
    colors: input.colors,
    background: { kind: input.backgroundKind, layers: input.backgroundLayers, degraded: false },
    radiusPx: densityMetrics(input.density).radiusPx,
    surfacePad: densityMetrics(input.density).surfacePad,
    font: {
      family: input.fontFamily,
      sizePx: input.fontSizePx,
      stylesheetUrls: input.stylesheetUrls,
    },
    assetBase: input.assetBase,
  });
  return parsed.ok ? parsed.value : null;
}

export function parsePublicThemeSnapshot(
  raw: unknown,
): { ok: true; value: PublicThemeSnapshot } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "主题快照不是对象" };
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== PRODUCT_THEME_SCHEMA_VERSION) {
    return { ok: false, reason: "主题版本暂不支持" };
  }
  if (typeof record.revision !== "string" || !/^[A-Za-z0-9._:-]{1,80}$/.test(record.revision)) {
    return { ok: false, reason: "主题版本号无效" };
  }
  if (typeof record.updatedAt !== "string" || Number.isNaN(Date.parse(record.updatedAt))) {
    return { ok: false, reason: "主题更新时间无效" };
  }
  if (typeof record.assetBase !== "string") return { ok: false, reason: "资源基准地址无效" };
  let assetBase: URL;
  try {
    assetBase = new URL(record.assetBase);
  } catch {
    return { ok: false, reason: "资源基准地址无效" };
  }
  if ((assetBase.protocol !== "https:" && assetBase.protocol !== "http:") || assetBase.username) {
    return { ok: false, reason: "资源基准地址无效" };
  }
  const paletteId = typeof record.paletteId === "string" ? record.paletteId : "";
  const backgroundId = typeof record.backgroundId === "string" ? record.backgroundId : "";
  if (!/^[a-z0-9-]{1,80}$/.test(paletteId) || !/^[a-z0-9-]{1,80}$/.test(backgroundId)) {
    return { ok: false, reason: "主题编号无效" };
  }
  const colors = readColors(record.colors, SAFE_COLORS);
  if (!colors.ok) return { ok: false, reason: "主题颜色无效" };
  const background = record.background;
  const kindValue =
    background && typeof background === "object" ? (background as { kind?: unknown }).kind : "none";
  const kind: ThemeBackgroundKind =
    kindValue === "gradient" || kindValue === "photo" || kindValue === "pattern" || kindValue === "none"
      ? kindValue
      : "none";
  const rawLayers =
    background && typeof background === "object" && typeof (background as { layers?: unknown }).layers === "string"
      ? (background as { layers: string }).layers
      : "";
  const sanitized = rawLayers
    ? sanitizeBackgroundLayers(rawLayers, assetBase.origin)
    : { layers: "", degraded: true };
  const density = parseDensity(record.density);
  const metrics = densityMetrics(density);
  const fontRecord = record.font && typeof record.font === "object" ? (record.font as Record<string, unknown>) : {};
  return {
    ok: true,
    value: {
      schemaVersion: PRODUCT_THEME_SCHEMA_VERSION,
      revision: record.revision,
      updatedAt: new Date(record.updatedAt).toISOString(),
      paletteId,
      backgroundId,
      density,
      colors: colors.colors,
      background: {
        kind: sanitized.layers ? kind : "none",
        layers: sanitized.layers,
        degraded: sanitized.degraded || !sanitized.layers,
      },
      radiusPx: metrics.radiusPx,
      surfacePad: metrics.surfacePad,
      font: {
        family: sanitizeFontFamily(fontRecord.family, SYSTEM_FONT),
        sizePx: clampFontSize(fontRecord.sizePx, 16),
        stylesheetUrls: sanitizeStylesheetUrls(fontRecord.stylesheetUrls),
      },
      assetBase: assetBase.origin,
    },
  };
}

export function parseIndependentTheme(raw: unknown, product: ProductId): IndependentTheme {
  const fallback = classicIndependent(product);
  if (!raw || typeof raw !== "object") return fallback;
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== PRODUCT_THEME_SCHEMA_VERSION) return fallback;
  const colors = readColors(record.colors, fallback.colors);
  if (!colors.ok) return fallback;
  const density = parseDensity(record.density);
  const metrics = densityMetrics(density);
  const background = record.background && typeof record.background === "object" ? (record.background as Record<string, unknown>) : {};
  const kind: ThemeBackgroundKind =
    background.kind === "gradient" || background.kind === "pattern" || background.kind === "none"
      ? background.kind
      : "gradient";
  const sanitized =
    typeof background.layers === "string" ? sanitizeBackgroundLayers(background.layers, "https://www.yydsxwh.com") : { layers: "", degraded: true };
  // 独立主题不接收主站照片，避免把外部地址写进产品自己的配置。
  if (sanitized.degraded || sanitized.layers.includes("url(")) return fallback;
  const label = typeof record.label === "string" ? record.label.trim().slice(0, 40) : fallback.label;
  return {
    schemaVersion: PRODUCT_THEME_SCHEMA_VERSION,
    label: label || fallback.label,
    density,
    colors: colors.colors,
    background: { kind, layers: sanitized.layers || fallback.background.layers, degraded: false },
    radiusPx: metrics.radiusPx,
    surfacePad: metrics.surfacePad,
    fontFamily: sanitizeFontFamily(record.fontFamily, fallback.fontFamily),
    fontSizePx: clampFontSize(record.fontSizePx, fallback.fontSizePx),
  };
}

/**
 * 损坏响应不覆盖上次有效快照。版本不认识或颜色不合法时保留旧缓存。
 */
export function acceptSnapshot(
  current: PublicThemeSnapshot | null,
  raw: unknown,
): { snapshot: PublicThemeSnapshot | null; stored: boolean; reason?: string } {
  const parsed = parsePublicThemeSnapshot(raw);
  if (!parsed.ok) return { snapshot: current, stored: false, reason: parsed.reason };
  return { snapshot: parsed.value, stored: true };
}

export function decideSource(input: {
  userChoice: ThemeSource | null;
  productSource: ThemeSource | null;
}): { source: ThemeSource; origin: ThemeOrigin } {
  if (input.userChoice) return { source: input.userChoice, origin: "user" };
  if (input.productSource) return { source: input.productSource, origin: "product" };
  return { source: "FOLLOW_MAIN", origin: "builtin" };
}

export function restoreProductDefault(record: AppearanceRecord): AppearanceRecord {
  return { ...record, source: "FOLLOW_MAIN" };
}

export function withSource(record: AppearanceRecord, source: ThemeSource): AppearanceRecord {
  return { ...record, source };
}

type VisualInput = {
  colors: ThemeColorTokens;
  background: ThemeBackground;
  density: LayoutDensity;
  radiusPx: number;
  surfacePad: string;
  fontFamily: string;
  fontSizePx: number;
};

function cssVarsFor(product: ProductId, visual: VisualInput): { colorScheme: "light" | "dark"; cssVars: Record<string, string> } {
  const scheme = colorSchemeFor(visual.colors.bg);
  const semantic = semanticColors(scheme);
  const layers = visual.background.layers || visual.colors.bg;
  const shared: Record<string, string> = {
    "--bg": visual.colors.bg,
    "--bg-deep": visual.colors.bgDeep,
    "--ink": visual.colors.ink,
    "--muted": visual.colors.muted,
    "--line": visual.colors.line,
    "--brand": visual.colors.brand,
    "--brand-strong": visual.colors.brandStrong,
    "--brand-soft": visual.colors.brandSoft,
    "--fire": visual.colors.fire,
    "--fire-strong": visual.colors.fireStrong,
    "--fire-soft": visual.colors.fireSoft,
    "--card": visual.colors.card,
    "--shadow": visual.colors.shadow,
    "--site-bg-layers": layers,
    "--surface-radius": `${visual.radiusPx}px`,
    "--surface-pad": visual.surfacePad,
    "--font-body": visual.fontFamily,
    "--fs-body": `${visual.fontSizePx}px`,
    "--danger": semantic.danger,
    "--danger-soft": semantic.dangerSoft,
    "--ok": semantic.ok,
    "--positive": semantic.positive,
    "--wash": `color-mix(in srgb, ${visual.colors.line} 55%, ${visual.colors.card})`,
  };
  if (product === "mall") {
    return {
      colorScheme: scheme,
      cssVars: {
        ...shared,
        // 市集原来把 --paper 用作页面底，卡片另用 --card。
        "--paper": visual.colors.bg,
        "--brand-ink": onColor(visual.colors.brand),
        "--pine": visual.colors.brandStrong,
      },
    };
  }
  return {
    colorScheme: scheme,
    cssVars: {
      ...shared,
      // 辅导的页面底是 --background，--paper 是内容底板。
      // --ink 同时被正文和深色实底按钮使用，所以跟主站正文色走，不改成品牌色。
      "--background": visual.colors.bg,
      "--foreground": visual.colors.ink,
      "--paper": visual.colors.card,
      "--accent": visual.colors.brand,
      "--accent-soft": visual.colors.brandSoft,
    },
  };
}

function visualFromSnapshot(snapshot: PublicThemeSnapshot): VisualInput {
  return {
    colors: snapshot.colors,
    background: snapshot.background,
    density: snapshot.density,
    radiusPx: snapshot.radiusPx,
    surfacePad: snapshot.surfacePad,
    fontFamily: snapshot.font.family,
    fontSizePx: snapshot.font.sizePx,
  };
}

function visualFromIndependent(theme: IndependentTheme): VisualInput {
  return {
    colors: theme.colors,
    background: theme.background,
    density: theme.density,
    radiusPx: theme.radiusPx,
    surfacePad: theme.surfacePad,
    fontFamily: theme.fontFamily,
    fontSizePx: theme.fontSizePx,
  };
}

export function resolveAppearance(input: {
  product: ProductId;
  userChoice: ThemeSource | null;
  record: AppearanceRecord | null;
  mainAvailable: boolean;
}): ResolvedAppearance {
  const record = input.record ?? builtinAppearance(input.product);
  const decision = decideSource({
    userChoice: input.userChoice,
    productSource: input.record ? record.source : null,
  });
  const followSnapshot = record.cachedSnapshot ?? safeSnapshot();
  const followVisual = record.cachedSnapshot ? "main" : "safe";
  const independent = record.independent;
  const follow = cssVarsFor(input.product, visualFromSnapshot(followSnapshot));
  const own = cssVarsFor(input.product, visualFromIndependent(independent));
  const usingIndependent = decision.source === "INDEPENDENT";
  const selected = usingIndependent ? own : follow;
  const visual: ThemeVisual = usingIndependent ? "independent" : followVisual;
  return {
    source: decision.source,
    origin: decision.origin,
    visual,
    degraded: visual === "safe" || (!usingIndependent && (followSnapshot.background.degraded || !input.mainAvailable)),
    revision: usingIndependent ? `independent-${input.product}` : followSnapshot.revision,
    updatedAt: usingIndependent ? "" : followSnapshot.updatedAt,
    colorScheme: selected.colorScheme,
    cssVars: selected.cssVars,
    followVars: follow.cssVars,
    independentVars: own.cssVars,
    followScheme: follow.colorScheme,
    independentScheme: own.colorScheme,
  };
}

export function appearanceBootScript(): string {
  return `(function(){
var data=window.__productAppearance;
if(!data) return;
if(data.product==="academic"){
  document.addEventListener("submit", function(event){
    var form=event.target;
    if(!form||!form.querySelector) return;
    var input=form.querySelector("input[name=tab]");
    if(!input) return;
    try{input.value=sessionStorage.getItem(data.tabKey)||"";}catch(e){}
  }, true);
}
var choice=null;
try{
  if(data.product==="academic"){
    var tab="";
    try{tab=sessionStorage.getItem(data.tabKey)||"";}catch(e){}
    if(/^[A-Za-z0-9_-]{16,80}$/.test(tab)){
      var saved=null;
      try{
        var parts=document.cookie?document.cookie.split("; "):[];
        var prefix="aa_"+tab+"=";
        for(var i=0;i<parts.length;i++){
          if(parts[i].indexOf(prefix)===0) saved=decodeURIComponent(parts[i].slice(prefix.length));
        }
      }catch(e){}
      if(saved!=="FOLLOW_MAIN"&&saved!=="INDEPENDENT"){
        try{
          var raw=localStorage.getItem(data.storageKey);
          var store=raw?JSON.parse(raw):null;
          saved=store&&store.tabs?store.tabs[tab]:null;
        }catch(e){}
      }
      if(saved==="FOLLOW_MAIN"||saved==="INDEPENDENT") choice=saved;
    }
  }
}catch(e){}
if(!choice||choice===data.source) return;
apply(choice==="INDEPENDENT"?data.independentVars:data.followVars, choice);
function apply(vars, source){
  if(!vars) return;
  var root=document.documentElement;
  for(var key in vars){
    if(!/^--[a-z0-9-]+$/.test(key)) continue;
    var value=String(vars[key]||"");
    if(value.length>4000||/[<>]|javascript:|expression\\s*\\(/i.test(value)) continue;
    root.style.setProperty(key, value);
  }
  if(data.colorSchemes&&data.colorSchemes[source]) root.style.colorScheme=data.colorSchemes[source];
  root.setAttribute("data-theme-source", source);
  root.setAttribute("data-theme-origin", "user");
  root.setAttribute("data-theme-visual", source==="INDEPENDENT"?"independent":"main");
}
})();`;
}

export function serializeAppearanceBoot(payload: unknown): string {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `window.__productAppearance=${json};${appearanceBootScript()}`;
}
