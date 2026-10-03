/**
 * 公司通知契约。
 *
 * 产品只描述「发生了什么」。Platform 决定渠道并调用微信 / 短信。
 * Account 提供用户绑定。本文件不包含任何密钥。
 */

import type { ProductId } from "./config";
import {
  NOTIFICATION_EVENT_CATALOG,
  NOTIFICATION_EVENT_TYPES,
  type NotificationEventType,
  type NotificationPreferenceCategory,
} from "./notification-catalog";

export {
  NOTIFICATION_EVENT_CATALOG,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_PREFERENCE_CATEGORIES,
  OWNER_VISIBLE_EVENTS,
  PREFERENCE_CATEGORY_LABEL,
  DELIVERY_STATUS_EXPLANATION,
  WECHAT_MANUAL_SETUP_STEPS,
  explainDeliveryStatus,
  notificationEventMeta,
  preferenceCategoryFor,
  suggestWechatFieldRows,
} from "./notification-catalog";
export type {
  NotificationEventMeta,
  NotificationEventType,
  NotificationPreferenceCategory,
} from "./notification-catalog";

export const NOTIFICATION_PRIORITIES = ["NORMAL", "HIGH", "CRITICAL"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_PRIVACY = ["NORMAL", "CONFIDENTIAL"] as const;
export type NotificationPrivacy = (typeof NOTIFICATION_PRIVACY)[number];

/** 产品请求的渠道。站内通知由产品自己写，不经过这里发送。 */
export const NOTIFICATION_REQUEST_CHANNELS = ["WECHAT", "SMS"] as const;
export type NotificationRequestChannel = (typeof NOTIFICATION_REQUEST_CHANNELS)[number];

export const NOTIFICATION_ADAPTERS = [
  "WECHAT_OFFICIAL_ACCOUNT",
  "WECHAT_MINIPROGRAM_SUBSCRIBE",
  "SMS",
] as const;
export type NotificationAdapter = (typeof NOTIFICATION_ADAPTERS)[number];

export const NOTIFICATION_DELIVERY_STATUSES = [
  "PENDING",
  "SENT",
  "RETRYING",
  "FAILED",
  "SKIPPED",
  "NEEDS_BINDING",
  "NEEDS_SUBSCRIPTION",
  "DISABLED",
] as const;
export type NotificationDeliveryStatus = (typeof NOTIFICATION_DELIVERY_STATUSES)[number];

export const NOTIFICATION_PROVIDER_STATUSES = [
  "UP",
  "DEGRADED",
  "DOWN",
  "NOT_AVAILABLE",
  "NEEDS_BINDING",
  "NEEDS_SUBSCRIPTION",
  "DISABLED",
  "NOT_CONFIGURED",
] as const;
export type NotificationProviderStatus = (typeof NOTIFICATION_PROVIDER_STATUSES)[number];

export const NOTIFICATION_AUDIENCES = ["STUDENT", "TEACHER", "ADMIN", "WATCHER"] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

/** 站长要在后台逐个填写的 Academic 公众号模板。测试和系统告警复用已有模板，不另算一项。 */
export const ACADEMIC_OFFICIAL_EVENTS = [
  "ACADEMIC_SESSION_USAGE_SUBMITTED",
  "ACADEMIC_SESSION_USAGE_CONFIRMED",
  "ACADEMIC_SESSION_USAGE_AUTO_CONFIRMED",
  "ACADEMIC_PRIVATE_ADMIN_ALERT",
  "ACADEMIC_LOW_BALANCE_RENEWAL_ALERT",
] as const satisfies readonly NotificationEventType[];

/** 每个事件允许出现在微信 / 短信里的数据字段。未列出的字段一律不发。 */
export const NOTIFICATION_EVENT_FIELDS: Record<NotificationEventType, readonly string[]> = mapCatalog(
  (row) => row.fields,
);

/**
 * 老师侧不能看到学生价格；学生侧不能看到老师课酬。
 * 只按字段名拦截，避免把课程名里的普通词语误判成泄密。
 */
const TEACHER_FORBIDDEN_KEYS = [
  "saleamount",
  "saleamountcents",
  "saleprice",
  "studentprice",
  "discountprice",
  "consumeamount",
  "consumeamountcents",
  "chargeamount",
  "availablebalance",
  "availablebalancecents",
  "cashbalance",
  "bonusbalance",
  "recharge",
  "margin",
  "platformmargin",
  "platformmargincents",
];

const STUDENT_FORBIDDEN_KEYS = [
  "teachercost",
  "teachercostcents",
  "teacherunitcost",
  "teacherunitcostcents",
  "teacherpayable",
  "teacherearning",
  "teacherwage",
  "hourlyrate",
  "expectedhourly",
];

export type NotificationRoute = {
  inApp: boolean;
  wechat: boolean;
  sms: boolean;
};

export const DEFAULT_NOTIFICATION_ROUTES: Record<NotificationEventType, NotificationRoute> = mapCatalog(
  (row) => row.channels,
);

/** 私密异议只允许站长。老师连投递记录都不应该有。 */
export const EVENT_AUDIENCES: Record<NotificationEventType, readonly NotificationAudience[]> = mapCatalog(
  (row) => row.audiences,
);

export const WECHAT_TEMPLATE_CONFIG_KEYS: Record<"officialAccount" | "miniProgram", Record<NotificationEventType, string>> = {
  officialAccount: mapCatalog((row) => row.officialTemplateKey),
  miniProgram: mapCatalog((row) => row.miniProgramTemplateKey),
};

export type NotificationSendRequest = {
  eventId: string;
  productId: ProductId;
  eventType: NotificationEventType;
  recipientUserSub: string;
  requestedChannels: NotificationRequestChannel[];
  priority: NotificationPriority;
  privacyClass: NotificationPrivacy;
  audience: NotificationAudience;
  templateData: Record<string, string>;
  webUrl?: string;
  miniProgramPage?: string;
  dedupeKey?: string;
  /** 站长告警传 false，避免学生偏好把站长短信关掉。 */
  respectPreferences?: boolean;
};

export type NotificationDeliveryView = {
  id: string;
  eventId: string;
  channel: NotificationAdapter;
  provider: string;
  status: NotificationDeliveryStatus;
  attempts: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  providerMessageId: string | null;
};

export type NotificationEndpoint = {
  userSub: string;
  verifiedPhone: string | null;
  phoneRegion: "CN" | "INTL" | null;
  wechat: Array<{ channel: string; appId: string; openId: string; unionId?: string }>;
  grants: Array<{ templateId: string; status: string }>;
  preferences: {
    inApp: boolean;
    wechat: boolean;
    sms: boolean;
    /** 缺省表示沿用总开关。显式 false 才关掉这一类。 */
    categories?: Partial<Record<NotificationPreferenceCategory, boolean>>;
  };
};

/**
 * 总开关关掉则全部不发。分类关掉只影响这一类。
 * respectPreferences=false 留给站长级安全/业务告警，用户偏好不能把它关掉。
 */
export function wechatPreferenceAllows(
  preferences: NotificationEndpoint["preferences"],
  eventType: NotificationEventType,
  respectPreferences: boolean | undefined,
): boolean {
  if (respectPreferences === false) return true;
  if (!preferences.wechat) return false;
  const category = NOTIFICATION_EVENT_CATALOG[eventType].preferenceCategory;
  return preferences.categories?.[category] !== false;
}

const SECRET_PATTERNS = [
  /access[_-]?token/i,
  /appsecret/i,
  /secretkey/i,
  /accesskeysecret/i,
];

export function redactNotificationText(value: string): string {
  return value
    .replace(/[A-Za-z0-9_-]{24,}/g, (token) => (token.length > 80 ? "[REDACTED]" : token))
    .replace(/(access_token|appsecret|secret|token)=([^&\s]+)/gi, "$1=[REDACTED]")
    .slice(0, 300);
}

export function textLooksSecret(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export function isNotificationEventType(value: string): value is NotificationEventType {
  return (NOTIFICATION_EVENT_TYPES as readonly string[]).includes(value);
}

export function routeFor(eventType: NotificationEventType, overrideJson: string | null | undefined): NotificationRoute {
  const base = DEFAULT_NOTIFICATION_ROUTES[eventType];
  if (!overrideJson?.trim()) return base;
  try {
    const parsed = JSON.parse(overrideJson) as Record<string, Partial<NotificationRoute>>;
    const row = parsed[eventType];
    if (!row || typeof row !== "object") return base;
    return {
      inApp: true,
      wechat: typeof row.wechat === "boolean" ? row.wechat : base.wechat,
      sms: typeof row.sms === "boolean" ? row.sms : base.sms,
    };
  } catch {
    return base;
  }
}

/** 大陆手机号转 E.164。不改写调用方的原始存储，只给短信通道用。 */
export function mainlandPhone(raw: string | null | undefined): { e164: string; domestic: string } | null {
  const text = (raw ?? "").trim().replace(/[\s-]/g, "");
  let local = "";
  if (/^1\d{10}$/.test(text)) local = text;
  else if (/^\+861\d{10}$/.test(text)) local = text.slice(3);
  else if (/^861\d{10}$/.test(text)) local = text.slice(2);
  else return null;
  return { e164: `+86${local}`, domestic: local };
}

export function phoneRegion(raw: string | null | undefined): "CN" | "INTL" | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  if (mainlandPhone(text)) return "CN";
  if (/^\+\d{8,15}$/.test(text.replace(/[\s-]/g, ""))) return "INTL";
  return null;
}

export function assertAudienceAllowed(eventType: NotificationEventType, audience: NotificationAudience): string | null {
  if (!EVENT_AUDIENCES[eventType].includes(audience)) {
    return `${eventType} 不能发给 ${audience}`;
  }
  return null;
}

export function privacyViolation(audience: NotificationAudience, data: Record<string, unknown>): string | null {
  const forbidden = audience === "TEACHER" ? TEACHER_FORBIDDEN_KEYS : audience === "STUDENT" ? STUDENT_FORBIDDEN_KEYS : [];
  for (const key of Object.keys(data)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (forbidden.includes(normalized)) return `字段 ${key} 不能出现在${audience === "TEACHER" ? "老师" : "学生"}通知里`;
  }
  return null;
}

export function pickTemplateData(
  eventType: NotificationEventType,
  data: Record<string, unknown>,
): { ok: true; data: Record<string, string> } | { ok: false; message: string } {
  const allowed = NOTIFICATION_EVENT_FIELDS[eventType];
  const picked: Record<string, string> = {};
  const missing: string[] = [];
  for (const field of allowed) {
    const value = data[field];
    if (typeof value !== "string" || !value.trim()) {
      if (eventType === "NOTIFICATION_TEST" && field === "note") {
        picked.note = "测试通知";
        continue;
      }
      missing.push(field);
      continue;
    }
    picked[field] = value.trim().slice(0, 40);
  }
  if (missing.length > 0) return { ok: false, message: `模板参数缺失：${missing.join(", ")}` };
  return { ok: true, data: picked };
}

const FIELD_KEY = /^[A-Za-z][A-Za-z0-9_]{0,30}$/;

export function applyWechatFieldMap(
  map: Record<string, string> | null | undefined,
  data: Record<string, string>,
  allowedFields: readonly string[],
): { ok: true; data: Record<string, { value: string }> } | { ok: false; message: string } {
  if (!map || Object.keys(map).length === 0) return { ok: false, message: "未配置微信字段映射" };
  const out: Record<string, { value: string }> = {};
  for (const [wechatKey, field] of Object.entries(map)) {
    if (!FIELD_KEY.test(wechatKey)) return { ok: false, message: "微信字段名不合法" };
    if (typeof field !== "string" || !allowedFields.includes(field)) {
      return { ok: false, message: "映射了当前事件未声明的数据字段" };
    }
    if (/[(){};`]|=>|function/.test(field)) return { ok: false, message: "字段映射不能包含表达式" };
    const value = data[field];
    if (!value) return { ok: false, message: `模板参数缺失：${field}` };
    out[wechatKey] = { value: value.slice(0, 20) };
  }
  return { ok: true, data: out };
}

export type WechatFieldMapRow = { wechatField: string; systemField: string };

/**
 * 站长按行填写「微信模板字段 → 系统字段」。
 * 微信字段名不写死，但必须是合法标识符，且不能映射到该事件禁止外发的数据。
 */
export function inspectWechatFieldMap(
  eventType: NotificationEventType,
  rows: readonly WechatFieldMapRow[],
): { ok: true; map: Record<string, string> } | { ok: false; message: string } {
  const allowed = new Set(NOTIFICATION_EVENT_FIELDS[eventType]);
  const map: Record<string, string> = {};
  for (const row of rows) {
    const wechatField = row.wechatField.trim();
    const systemField = row.systemField.trim();
    if (!wechatField && !systemField) continue;
    if (!FIELD_KEY.test(wechatField)) return { ok: false, message: "微信字段名不合法" };
    if (Object.prototype.hasOwnProperty.call(map, wechatField)) {
      return { ok: false, message: "同一个微信字段不能映射两次" };
    }
    if (!allowed.has(systemField)) return { ok: false, message: "映射了当前事件不允许发送的字段" };
    map[wechatField] = systemField;
  }
  return { ok: true, map };
}

export function parseFieldMaps(raw: string | null | undefined): Record<string, Record<string, string>> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, Record<string, string>>;
  } catch {
    return {};
  }
}

export function assertSafeNotificationLink(input: {
  webUrl?: string;
  miniProgramPage?: string;
  allowedOrigins: string[];
}): { ok: true; webUrl?: string; miniProgramPage?: string } | { ok: false; message: string } {
  const webUrl = input.webUrl?.trim() ?? "";
  const page = input.miniProgramPage?.trim() ?? "";
  if (webUrl) {
    if (/^\s*javascript:/i.test(webUrl) || /^\s*data:/i.test(webUrl)) {
      return { ok: false, message: "通知链接协议不允许" };
    }
    if (webUrl.startsWith("//") || webUrl.includes("\\")) return { ok: false, message: "通知链接不合法" };
    if (webUrl.startsWith("/")) {
      if (webUrl.startsWith("/\\") || webUrl.includes("..")) return { ok: false, message: "通知链接不合法" };
    } else {
      let origin = "";
      try {
        const url = new URL(webUrl);
        if (url.protocol !== "https:") return { ok: false, message: "外链必须是 https" };
        origin = url.origin;
      } catch {
        return { ok: false, message: "通知链接不合法" };
      }
      const allowed = new Set(input.allowedOrigins.map((item) => item.replace(/\/+$/, "")));
      if (!allowed.has(origin)) return { ok: false, message: "通知链接不在允许的域名内" };
    }
  }
  if (page) {
    if (/^[a-z]+:/i.test(page) || page.includes("..") || page.includes("\\")) {
      return { ok: false, message: "小程序页面路径不合法" };
    }
    const normalized = page.replace(/^\//, "");
    if (!/^pages\/[A-Za-z0-9_/?=&%.{}-]+$/.test(normalized)) {
      return { ok: false, message: "小程序页面路径不合法" };
    }
  }
  return {
    ok: true,
    webUrl: webUrl || undefined,
    miniProgramPage: page ? page.replace(/^\//, "") : undefined,
  };
}

/** 同一评论、同一接收人只产生一次投递键。作者本人不在列表里。 */
export function forumReplyEventId(commentId: string, recipientUserSub: string): string {
  return `forum-reply:${commentId}:${recipientUserSub}`;
}

export function lowBalanceDedupeKey(customerId: string, cycle: number | string): string {
  return `academic-low-balance:${customerId}:${cycle}`;
}

export function permanentDelivery(status: NotificationDeliveryStatus): boolean {
  return status === "SENT" || status === "FAILED" || status === "SKIPPED" || status === "NEEDS_BINDING" || status === "NEEDS_SUBSCRIPTION" || status === "DISABLED";
}

function mapCatalog<T>(pick: (row: (typeof NOTIFICATION_EVENT_CATALOG)[NotificationEventType]) => T) {
  const out = {} as Record<NotificationEventType, T>;
  for (const eventType of NOTIFICATION_EVENT_TYPES) out[eventType] = pick(NOTIFICATION_EVENT_CATALOG[eventType]);
  return out;
}

export function yuanFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function shortLearnerName(name: string): string {
  const text = name.trim();
  if (!text) return "学员";
  return text.slice(0, 8);
}
