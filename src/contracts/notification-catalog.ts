/**
 * 全站通知事件目录。
 *
 * 新产品加一条记录即可。站长后台、Platform 和模板校验都读这里，
 * 不要在各产品里再写一套事件表。本文件没有密钥、OpenID 或正文。
 */

import type { ProductId } from "./config";

export const NOTIFICATION_EVENT_TYPES = [
  "FORUM_REPLY_CREATED",
  "ACADEMIC_SESSION_USAGE_SUBMITTED",
  "ACADEMIC_SESSION_USAGE_CONFIRMED",
  "ACADEMIC_SESSION_USAGE_AUTO_CONFIRMED",
  "ACADEMIC_PRIVATE_ADMIN_ALERT",
  "ACADEMIC_LOW_BALANCE_RENEWAL_ALERT",
  "SYSTEM_CRITICAL_ALERT",
  "NOTIFICATION_TEST",
  "KKCHAT_MESSAGE_RECEIVED",
  "SITE_OWNER_DIRECT_MESSAGE",
  "COURSE_TEACHER_ANNOUNCEMENT",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_PREFERENCE_CATEGORIES = [
  "chat",
  "course",
  "academic",
  "community",
  "service",
] as const;

export type NotificationPreferenceCategory = (typeof NOTIFICATION_PREFERENCE_CATEGORIES)[number];

export const PREFERENCE_CATEGORY_LABEL: Record<NotificationPreferenceCategory, string> = {
  chat: "聊天 / 私信",
  course: "课程与课程群",
  academic: "教务与学习",
  community: "论坛 / 知识社区",
  service: "交易 / 安全 / 重要服务通知",
};

type Audience = "STUDENT" | "TEACHER" | "ADMIN" | "WATCHER";

export type NotificationEventMeta = {
  eventType: NotificationEventType;
  productId: ProductId;
  preferenceCategory: NotificationPreferenceCategory;
  label: string;
  audienceLabel: string;
  audiences: readonly Audience[];
  channels: { inApp: boolean; wechat: boolean; sms: boolean };
  fields: readonly string[];
  officialTemplateKey: string;
  miniProgramTemplateKey: string;
  /** 站长在微信里看到的模板用途，多个事件可以填同一个模板 ID。 */
  templateHint: string;
  smsAllowed: boolean;
  /** 敏感事件不能把余额、课酬或私聊全文放进微信。 */
  sensitive: boolean;
  /** 站长模板表展示。测试和系统告警复用已有模板，不单独占一行。 */
  ownerVisible: boolean;
  sample: Record<string, string>;
};

const OA = "notifications.wechat.officialAccount.template";
const MP = "notifications.wechat.miniProgram.template";

export const NOTIFICATION_EVENT_CATALOG: Record<NotificationEventType, NotificationEventMeta> = {
  FORUM_REPLY_CREATED: {
    eventType: "FORUM_REPLY_CREATED",
    productId: "forum",
    preferenceCategory: "community",
    label: "论坛蹲帖新回复",
    audienceLabel: "蹲帖用户",
    audiences: ["WATCHER"],
    channels: { inApp: true, wechat: true, sms: false },
    fields: ["postTitle", "commentExcerpt", "occurredAt"],
    officialTemplateKey: `${OA}.forumReply`,
    miniProgramTemplateKey: `${MP}.forumReply`,
    templateHint: "新回复提醒",
    smsAllowed: false,
    sensitive: false,
    ownerVisible: true,
    sample: { postTitle: "测试帖子", commentExcerpt: "测试评论", occurredAt: "10-02 12:00" },
  },
  ACADEMIC_SESSION_USAGE_SUBMITTED: {
    eventType: "ACADEMIC_SESSION_USAGE_SUBMITTED",
    productId: "academic",
    preferenceCategory: "academic",
    label: "老师提交课时",
    audienceLabel: "学生 / 站长",
    audiences: ["STUDENT", "ADMIN"],
    channels: { inApp: true, wechat: true, sms: false },
    fields: ["courseName", "learnerName", "occurredAt"],
    officialTemplateKey: `${OA}.sessionUsageSubmitted`,
    miniProgramTemplateKey: `${MP}.sessionUsageSubmitted`,
    templateHint: "课程提醒",
    smsAllowed: false,
    sensitive: false,
    ownerVisible: true,
    sample: { courseName: "测试课程", learnerName: "测试学员", occurredAt: "10-02 12:00" },
  },
  ACADEMIC_SESSION_USAGE_CONFIRMED: {
    eventType: "ACADEMIC_SESSION_USAGE_CONFIRMED",
    productId: "academic",
    preferenceCategory: "academic",
    label: "学生确认课时",
    audienceLabel: "老师 / 站长",
    audiences: ["TEACHER", "ADMIN"],
    channels: { inApp: true, wechat: true, sms: false },
    fields: ["courseName", "learnerName", "occurredAt"],
    officialTemplateKey: `${OA}.sessionUsageConfirmed`,
    miniProgramTemplateKey: `${MP}.sessionUsageConfirmed`,
    templateHint: "服务提醒",
    smsAllowed: false,
    sensitive: false,
    ownerVisible: true,
    sample: { courseName: "测试课程", learnerName: "测试学员", occurredAt: "10-02 12:00" },
  },
  ACADEMIC_SESSION_USAGE_AUTO_CONFIRMED: {
    eventType: "ACADEMIC_SESSION_USAGE_AUTO_CONFIRMED",
    productId: "academic",
    preferenceCategory: "academic",
    label: "课时自动确认",
    audienceLabel: "老师 / 站长",
    audiences: ["TEACHER", "ADMIN"],
    channels: { inApp: true, wechat: true, sms: false },
    fields: ["courseName", "learnerName", "occurredAt"],
    officialTemplateKey: `${OA}.sessionUsageAutoConfirmed`,
    miniProgramTemplateKey: `${MP}.sessionUsageAutoConfirmed`,
    templateHint: "服务提醒",
    smsAllowed: false,
    sensitive: false,
    ownerVisible: true,
    sample: { courseName: "测试课程", learnerName: "测试学员", occurredAt: "10-02 12:00" },
  },
  ACADEMIC_PRIVATE_ADMIN_ALERT: {
    eventType: "ACADEMIC_PRIVATE_ADMIN_ALERT",
    productId: "academic",
    preferenceCategory: "academic",
    label: "学生异议",
    audienceLabel: "仅站长",
    audiences: ["ADMIN"],
    channels: { inApp: true, wechat: true, sms: false },
    fields: ["courseName", "occurredAt", "summary"],
    officialTemplateKey: `${OA}.privateAdminAlert`,
    miniProgramTemplateKey: `${MP}.privateAdminAlert`,
    templateHint: "异常提醒",
    smsAllowed: false,
    sensitive: true,
    ownerVisible: true,
    sample: { courseName: "测试课程", occurredAt: "10-02 12:00", summary: "测试异常" },
  },
  ACADEMIC_LOW_BALANCE_RENEWAL_ALERT: {
    eventType: "ACADEMIC_LOW_BALANCE_RENEWAL_ALERT",
    productId: "academic",
    preferenceCategory: "academic",
    label: "余额不足",
    audienceLabel: "站长 / 必要接收人",
    audiences: ["ADMIN"],
    channels: { inApp: true, wechat: true, sms: true },
    fields: ["learnerName", "availableBalance", "courseName"],
    officialTemplateKey: `${OA}.lowBalanceRenewal`,
    miniProgramTemplateKey: `${MP}.lowBalanceRenewal`,
    templateHint: "余额提醒",
    smsAllowed: true,
    sensitive: true,
    ownerVisible: true,
    sample: { learnerName: "测试学员", availableBalance: "88.00", courseName: "测试课程" },
  },
  SYSTEM_CRITICAL_ALERT: {
    eventType: "SYSTEM_CRITICAL_ALERT",
    productId: "main",
    preferenceCategory: "service",
    label: "系统异常",
    audienceLabel: "站长",
    audiences: ["ADMIN"],
    channels: { inApp: true, wechat: false, sms: false },
    fields: ["summary", "occurredAt"],
    officialTemplateKey: `${OA}.privateAdminAlert`,
    miniProgramTemplateKey: `${MP}.privateAdminAlert`,
    templateHint: "异常提醒",
    smsAllowed: false,
    sensitive: true,
    ownerVisible: false,
    sample: { summary: "测试异常", occurredAt: "10-02 12:00" },
  },
  NOTIFICATION_TEST: {
    eventType: "NOTIFICATION_TEST",
    productId: "main",
    preferenceCategory: "service",
    label: "通知测试",
    audienceLabel: "站长",
    audiences: ["ADMIN"],
    channels: { inApp: false, wechat: true, sms: true },
    fields: ["note"],
    officialTemplateKey: `${OA}.forumReply`,
    miniProgramTemplateKey: `${MP}.forumReply`,
    templateHint: "测试",
    smsAllowed: true,
    sensitive: false,
    ownerVisible: false,
    sample: { note: "测试通知" },
  },
  KKCHAT_MESSAGE_RECEIVED: {
    eventType: "KKCHAT_MESSAGE_RECEIVED",
    productId: "kkchat",
    preferenceCategory: "chat",
    label: "KKChat 新消息",
    audienceLabel: "接收用户",
    audiences: ["STUDENT", "TEACHER", "ADMIN", "WATCHER"],
    channels: { inApp: true, wechat: true, sms: false },
    fields: ["senderName", "excerpt", "occurredAt"],
    officialTemplateKey: `${OA}.kkchatMessage`,
    miniProgramTemplateKey: `${MP}.kkchatMessage`,
    templateHint: "消息提醒",
    smsAllowed: false,
    sensitive: true,
    ownerVisible: true,
    sample: { senderName: "KKChat", excerpt: "你有一条新消息", occurredAt: "10-03 12:00" },
  },
  SITE_OWNER_DIRECT_MESSAGE: {
    eventType: "SITE_OWNER_DIRECT_MESSAGE",
    productId: "main",
    preferenceCategory: "chat",
    label: "站长私信",
    audienceLabel: "对应用户",
    audiences: ["STUDENT", "TEACHER", "ADMIN", "WATCHER"],
    channels: { inApp: true, wechat: true, sms: false },
    fields: ["senderName", "messageExcerpt", "occurredAt"],
    officialTemplateKey: `${OA}.siteOwnerDirectMessage`,
    miniProgramTemplateKey: `${MP}.siteOwnerDirectMessage`,
    templateHint: "消息提醒",
    smsAllowed: false,
    sensitive: true,
    ownerVisible: true,
    sample: { senderName: "站长", messageExcerpt: "这是一条测试", occurredAt: "10-02 12:00" },
  },
  COURSE_TEACHER_ANNOUNCEMENT: {
    eventType: "COURSE_TEACHER_ANNOUNCEMENT",
    productId: "course",
    preferenceCategory: "course",
    label: "网课课程群老师通知",
    audienceLabel: "课程成员",
    audiences: ["STUDENT", "TEACHER", "ADMIN"],
    channels: { inApp: true, wechat: true, sms: false },
    fields: ["courseName", "summary", "occurredAt"],
    officialTemplateKey: `${OA}.courseTeacherAnnouncement`,
    miniProgramTemplateKey: `${MP}.courseTeacherAnnouncement`,
    templateHint: "课程 / 消息提醒",
    smsAllowed: false,
    sensitive: false,
    ownerVisible: true,
    sample: { courseName: "测试课程", summary: "请查看课程通知", occurredAt: "10-03 12:00" },
  },
};

export const OWNER_VISIBLE_EVENTS = NOTIFICATION_EVENT_TYPES.filter(
  (eventType) => NOTIFICATION_EVENT_CATALOG[eventType].ownerVisible,
);

/** 微信已接受 ≠ 用户已经在手机上看到。页面必须把这句说清楚。 */
export const DELIVERY_STATUS_EXPLANATION: Record<string, string> = {
  SENT: "微信已接受这条消息。这只表示接口调用成功，不代表对方手机已经弹出。",
  NEEDS_BINDING: "对方还没有关注服务号并完成绑定，或没有打开微信通知。",
  NOT_CONFIGURED: "公众号、模板或字段映射还没配齐。需要站长在微信公众平台补齐后再试。",
  NOT_AVAILABLE: "当前公众号没有这项接口权限。需要在微信公众平台开通，不能当成已发送。",
  FAILED: "微信拒绝了这条消息。站内通知仍然保留，业务不会因此回滚。",
  SKIPPED: "按规则跳过了外部发送。站内通知不受影响。",
  DISABLED: "这个渠道当前是关闭的。",
  NEEDS_SUBSCRIPTION: "小程序订阅消息还没有用户授权。",
  PENDING: "正在发送。",
  RETRYING: "外部通道暂时失败，稍后会重试。聊天、课程和钱包不会因此回滚。",
  PREFERENCE_OFF: "用户关闭了这一类微信通知。",
};

export const WECHAT_MANUAL_SETUP_STEPS = [
  "登录微信公众平台，确认使用的是已认证服务号。",
  "设置与开发 → 公众号设置 → 功能设置：网页授权域名填写 account.yydsxwh.com。",
  "设置与开发 → 基本配置：把吉隆坡生产服务器的出口 IP 加入 IP 白名单。",
  "广告与服务 → 模板消息：添加「消息提醒」「课程提醒」「服务提醒」「新回复提醒」「余额提醒」「异常提醒」。多个场景可以共用同一个模板。",
  "把模板 ID 填回通知中心对应场景。不要把 AppSecret 发给任何人。",
] as const;

export function notificationEventMeta(eventType: NotificationEventType): NotificationEventMeta {
  return NOTIFICATION_EVENT_CATALOG[eventType];
}

export function preferenceCategoryFor(eventType: NotificationEventType): NotificationPreferenceCategory {
  return NOTIFICATION_EVENT_CATALOG[eventType].preferenceCategory;
}

/**
 * 按字段含义生成微信模板字段名。站长仍可改，但不用手写 JSON。
 * thing / time / amount 是公众号模板的常见类型，不是写死的业务字段。
 */
export function suggestWechatFieldRows(eventType: NotificationEventType): Array<{ wechatField: string; systemField: string }> {
  const fields = NOTIFICATION_EVENT_CATALOG[eventType].fields;
  let thing = 1;
  let time = 1;
  let amount = 1;
  return fields.map((field) => {
    const normalized = field.toLowerCase();
    if (normalized.includes("time") || normalized === "occurredat") {
      return { wechatField: `time${time++}`, systemField: field };
    }
    if (normalized.includes("balance") || normalized.includes("amount")) {
      return { wechatField: `amount${amount++}`, systemField: field };
    }
    return { wechatField: `thing${thing++}`, systemField: field };
  });
}

export function explainDeliveryStatus(status: string, detail?: string | null): string {
  const known = DELIVERY_STATUS_EXPLANATION[status];
  if (known) return detail && /[\u4e00-\u9fff]/.test(detail) ? `${known} ${detail}` : known;
  if (detail && /[\u4e00-\u9fff]/.test(detail)) return detail;
  return "没有得到可确认的送达结果。请不要把它当成用户已经收到。";
}
