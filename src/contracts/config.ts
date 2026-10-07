/**
 * Platform Config Center 契约。
 *
 * 主站后台维护「全局默认」，每个产品默认跟随，也可以按 key 单独覆盖。
 * 产品运行时不读主站进程或主站数据库：读 Platform，本地缓存 Last-Known-Good。
 *
 * 这里只放类型、Catalog 与纯函数。任何 Secret 明文都不允许出现在本文件或它的测试里。
 */

// ---------------------------------------------------------------------------
// 产品注册
// ---------------------------------------------------------------------------

/** 稳定的产品 ID。与 Git 仓库名、platform clientId 分开维护。 */
export const CONFIG_PRODUCT_IDS = [
  "main",
  "account",
  "academic",
  "course",
  "rishi",
  "softwarelist",
  "forum",
  "meetup",
  "personalwebsite",
  "mathcode",
  "valorant",
  "kkchat",
  "xiangqi",
] as const;
export type ProductId = (typeof CONFIG_PRODUCT_IDS)[number];

export function isProductId(value: string): value is ProductId {
  return (CONFIG_PRODUCT_IDS as readonly string[]).includes(value);
}

/**
 * platform 服务凭证里的 clientId → 产品 ID。
 * 历史上主站的调用方叫 `andyyyds`，这里统一成 `main`。
 */
const CLIENT_TO_PRODUCT: Record<string, ProductId> = {
  andyyyds: "main",
  main: "main",
  account: "account",
  academic: "academic",
  course: "course",
  rishi: "rishi",
  softwarelist: "softwarelist",
  forum: "forum",
  meetup: "meetup",
  personalwebsite: "personalwebsite",
  mathcode: "mathcode",
  valorant: "valorant",
  kkchat: "kkchat",
  xiangqi: "xiangqi",
};

export function productIdForClient(clientId: string): ProductId | null {
  return CLIENT_TO_PRODUCT[clientId.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Catalog 维度
// ---------------------------------------------------------------------------

export const CONFIG_GROUPS = [
  "storage",
  "video",
  "ai",
  "maps",
  "sms",
  "email",
  "payment",
  "links",
  "notifications",
  "product",
] as const;
export type ConfigGroup = (typeof CONFIG_GROUPS)[number];

export const CONFIG_GROUP_LABELS: Record<ConfigGroup, string> = {
  storage: "对象存储 OSS",
  video: "视频点播 VOD",
  ai: "AI 与翻译",
  maps: "高德地图",
  sms: "短信",
  email: "邮件",
  payment: "支付",
  links: "公共链接",
  notifications: "通知与通讯",
  product: "产品自有连接参数",
};

export const CONFIG_VALUE_TYPES = ["string", "boolean", "number", "url", "enum", "stringList"] as const;
export type ConfigValueType = (typeof CONFIG_VALUE_TYPES)[number];

/** PUBLIC 可进浏览器；INTERNAL 只在服务端；SECRET 只写不回显 */
export const CONFIG_SENSITIVITIES = ["PUBLIC", "INTERNAL", "SECRET"] as const;
export type ConfigSensitivity = (typeof CONFIG_SENSITIVITIES)[number];

/**
 * GLOBAL_INHERITABLE：产品可跟随全局，也可覆盖。
 * PRODUCT_REQUIRED：每个产品必须自己配，禁止全局默认。
 * CENTRAL_ONLY：只由 Platform / Account 托管，配置 API 不接受写入。
 * LOCAL_ONLY：产品自己的业务配置，不进配置中心。
 */
export const CONFIG_SHARE_POLICIES = [
  "GLOBAL_INHERITABLE",
  "PRODUCT_REQUIRED",
  "CENTRAL_ONLY",
  "LOCAL_ONLY",
] as const;
export type ConfigSharePolicy = (typeof CONFIG_SHARE_POLICIES)[number];

export const CONFIG_CLIENT_VISIBILITIES = ["SERVER_ONLY", "BROWSER_ALLOWED"] as const;
export type ConfigClientVisibility = (typeof CONFIG_CLIENT_VISIBILITIES)[number];

/** 有效值来自哪里。LAST_KNOWN_GOOD 只会在产品侧缓存里出现。 */
export const CONFIG_SOURCES = [
  "PRODUCT_OVERRIDE",
  "GLOBAL",
  "ENV_FALLBACK",
  "BUILTIN_DEFAULT",
  "LAST_KNOWN_GOOD",
  "UNSET",
] as const;
export type ConfigSource = (typeof CONFIG_SOURCES)[number];

/** 产品侧缓存状态 */
export const CONFIG_CACHE_STATES = ["LIVE", "CACHED", "STALE", "FALLBACK", "UNCONFIGURED"] as const;
export type ConfigCacheState = (typeof CONFIG_CACHE_STATES)[number];

export type ConfigCatalogEntry = {
  key: string;
  group: ConfigGroup;
  label: string;
  valueType: ConfigValueType;
  sensitivity: ConfigSensitivity;
  sharePolicy: ConfigSharePolicy;
  clientVisibility: ConfigClientVisibility;
  /** enum 类型的可选值 */
  options?: readonly string[];
  /** 安全的内置默认；Secret 永远没有内置默认 */
  builtinDefault?: string;
  /**
   * 产品运行时是否允许拿到 Secret 明文（只发给该产品自己的服务端）。
   * AI Key / 平台内部密钥为 false：这些能力走 Platform 服务，不下发。
   */
  runtimeDeliverable: boolean;
  /** 该组是否有「测试有效配置」能力 */
  testCapability: boolean;
  description: string;
};

export type ConfigKey = string;

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

type Draft = Omit<ConfigCatalogEntry, "runtimeDeliverable" | "testCapability" | "clientVisibility"> &
  Partial<Pick<ConfigCatalogEntry, "runtimeDeliverable" | "testCapability" | "clientVisibility">>;

function entry(draft: Draft): ConfigCatalogEntry {
  const sensitivity = draft.sensitivity;
  const clientVisibility =
    draft.clientVisibility ?? (sensitivity === "PUBLIC" ? "BROWSER_ALLOWED" : "SERVER_ONLY");
  if (sensitivity === "SECRET" && clientVisibility === "BROWSER_ALLOWED") {
    throw new Error(`Secret ${draft.key} 不能标记为 BROWSER_ALLOWED`);
  }
  if (sensitivity === "SECRET" && draft.builtinDefault !== undefined) {
    throw new Error(`Secret ${draft.key} 不能有内置默认`);
  }
  return {
    ...draft,
    clientVisibility,
    runtimeDeliverable: draft.runtimeDeliverable ?? sensitivity !== "SECRET",
    testCapability: draft.testCapability ?? false,
  };
}

const G = "GLOBAL_INHERITABLE" as const;

export const CONFIG_CATALOG: readonly ConfigCatalogEntry[] = [
  // storage ------------------------------------------------------------------
  entry({ key: "storage.provider", group: "storage", label: "存储方式", valueType: "enum", options: ["LOCAL", "ALIYUN_OSS"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "LOCAL", testCapability: true, description: "文件落在本地盘还是阿里云 OSS" }),
  entry({ key: "storage.oss.region", group: "storage", label: "Region", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "如 oss-cn-hongkong" }),
  entry({ key: "storage.oss.bucket", group: "storage", label: "Bucket", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "对象存储 Bucket 名" }),
  entry({ key: "storage.oss.accessKeyId", group: "storage", label: "AccessKey ID", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "RAM AccessKey ID，只显示是否已配置" }),
  entry({ key: "storage.oss.accessKeySecret", group: "storage", label: "AccessKey Secret", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "RAM AccessKey Secret，只写不回显" }),
  entry({ key: "storage.oss.endpoint", group: "storage", label: "自定义 Endpoint", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空用 Bucket 虚拟主机域名" }),
  entry({ key: "storage.oss.publicBaseUrl", group: "storage", label: "公网访问前缀 / CDN", valueType: "url", sensitivity: "PUBLIC", sharePolicy: G, description: "公开对象的访问前缀" }),
  entry({ key: "storage.oss.accelerateEnabled", group: "storage", label: "传输加速", valueType: "boolean", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "false", description: "大文件走传输加速域名" }),

  // video --------------------------------------------------------------------
  entry({ key: "video.provider", group: "video", label: "视频存储方式", valueType: "enum", options: ["LOCAL", "ALIYUN_VOD"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "LOCAL", description: "视频用本地还是阿里云点播" }),
  entry({ key: "video.vod.regionId", group: "video", label: "点播 Region", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "如 cn-shanghai" }),
  entry({ key: "video.vod.accessKeyId", group: "video", label: "点播 AccessKey ID", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "具备点播权限的 RAM AccessKey ID" }),
  entry({ key: "video.vod.accessKeySecret", group: "video", label: "点播 AccessKey Secret", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "只写不回显" }),
  entry({ key: "video.vod.templateGroupId", group: "video", label: "转码模板组", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "点播转码模板组 ID" }),
  entry({ key: "video.vod.playDomain", group: "video", label: "播放域名", valueType: "string", sensitivity: "PUBLIC", sharePolicy: G, description: "点播播放域名" }),

  // ai -----------------------------------------------------------------------
  entry({ key: "ai.provider", group: "ai", label: "AI Provider", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "platform", testCapability: true, description: "platform 表示使用 Platform 已登记的 Provider 与路由" }),
  entry({ key: "ai.baseUrl", group: "ai", label: "AI Base URL", valueType: "url", sensitivity: "INTERNAL", sharePolicy: G, description: "OpenAI 兼容接口地址" }),
  entry({ key: "ai.apiKey", group: "ai", label: "AI API Key", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: false, description: "只保存在 Platform，产品通过 Platform AI 调用" }),
  entry({ key: "ai.model", group: "ai", label: "默认模型", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "未指定用途时的模型" }),
  entry({ key: "ai.route.translate", group: "ai", label: "翻译路由", valueType: "stringList", sensitivity: "INTERNAL", sharePolicy: G, description: "按顺序尝试的 provider/model" }),
  entry({ key: "ai.route.vision-ocr", group: "ai", label: "视觉识别路由", valueType: "stringList", sensitivity: "INTERNAL", sharePolicy: G, description: "必须是带视觉能力的模型" }),
  entry({ key: "ai.route.general", group: "ai", label: "通用路由", valueType: "stringList", sensitivity: "INTERNAL", sharePolicy: G, description: "摘要、改写等" }),

  // Each provider is one atomic encrypted connection; credentials never leave Platform.
  ...(["openai", "anthropic", "qwen", "custom"] as const).map((provider) => entry({ key: `ai.providers.${provider}`, group: "ai", label: `${provider} 连接配置`, valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: false, testCapability: true, description: "加密的 Provider 连接配置；管理界面只返回掩码" })),

  // maps ---------------------------------------------------------------------
  entry({ key: "maps.provider", group: "maps", label: "地图服务", valueType: "enum", options: ["DISABLED", "AMAP"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "DISABLED", testCapability: true, description: "当前只支持高德" }),
  entry({ key: "maps.amap.webJsKey", group: "maps", label: "高德 Web JS Key", valueType: "string", sensitivity: "PUBLIC", sharePolicy: G, clientVisibility: "BROWSER_ALLOWED", description: "浏览器地图 Key，必须在高德后台做域名限制" }),
  entry({ key: "maps.amap.securityJsCode", group: "maps", label: "高德安全密钥", valueType: "string", sensitivity: "PUBLIC", sharePolicy: G, clientVisibility: "BROWSER_ALLOWED", description: "配合 JS Key 使用的安全密钥" }),
  entry({ key: "maps.amap.webServiceKey", group: "maps", label: "高德 Web 服务 Key", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "服务端地理编码、搜索用，永不下发浏览器" }),
  entry({ key: "maps.amap.baseUrl", group: "maps", label: "高德接口地址", valueType: "url", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "https://restapi.amap.com", description: "Web 服务接口地址" }),

  // sms ----------------------------------------------------------------------
  entry({ key: "sms.enabled", group: "sms", label: "启用短信", valueType: "boolean", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "false", testCapability: true, description: "关闭后不发真实短信" }),
  entry({ key: "sms.provider", group: "sms", label: "短信服务商", valueType: "enum", options: ["test", "aliyun"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "test", description: "test 只打印验证码" }),
  entry({ key: "sms.accessKeyId", group: "sms", label: "短信 AccessKey ID", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "阿里云短信 RAM AccessKey ID" }),
  entry({ key: "sms.accessKeySecret", group: "sms", label: "短信 AccessKey Secret", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "只写不回显" }),
  entry({ key: "sms.signName", group: "sms", label: "短信签名", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "已审核通过的签名" }),
  entry({ key: "sms.template.login", group: "sms", label: "登录验证码模板", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "模板 Code" }),
  entry({ key: "sms.template.register", group: "sms", label: "注册验证码模板", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "模板 Code" }),
  entry({ key: "sms.template.bind", group: "sms", label: "绑定验证码模板", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "模板 Code" }),
  entry({ key: "sms.testMode", group: "sms", label: "测试模式", valueType: "boolean", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "false", description: "测试模式下使用固定验证码" }),
  entry({ key: "sms.template.lowBalanceRenewal", group: "sms", label: "续费提醒模板", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "阿里云已审核的余额不足模板，不能用登录验证码模板代替" }),
  entry({ key: "sms.template.criticalAdminAlert", group: "sms", label: "关键异常模板", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "阿里云已审核的站长异常模板" }),
  entry({ key: "sms.tencent.secretId", group: "sms", label: "腾讯云 SecretId", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: false, description: "仅业务短信选择腾讯云时使用" }),
  entry({ key: "sms.tencent.secretKey", group: "sms", label: "腾讯云 SecretKey", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: false, description: "只写不回显" }),
  entry({ key: "sms.tencent.sdkAppId", group: "sms", label: "腾讯云 SmsSdkAppId", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "短信应用 ID" }),
  entry({ key: "sms.tencent.signName", group: "sms", label: "腾讯云短信签名", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "已审核签名" }),
  entry({ key: "sms.tencent.region", group: "sms", label: "腾讯云地域", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "ap-guangzhou", description: "短信 API 地域" }),
  entry({ key: "sms.tencent.template.lowBalanceRenewal", group: "sms", label: "腾讯云续费模板", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "续费提醒 TemplateId" }),
  entry({ key: "sms.tencent.template.criticalAdminAlert", group: "sms", label: "腾讯云异常模板", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "关键异常 TemplateId" }),

  // notifications ------------------------------------------------------------
  // 微信 / 短信密钥只留在 Platform。runtimeDeliverable=false，产品后台拿不到明文。
  entry({ key: "notifications.enabled", group: "notifications", label: "启用外部通知", valueType: "boolean", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "false", testCapability: true, description: "关闭后各产品仍保留站内通知，但不发微信和短信" }),
  entry({ key: "notifications.wechat.enabled", group: "notifications", label: "启用微信通知", valueType: "boolean", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "false", description: "公众号与小程序订阅消息的总开关" }),
  entry({ key: "notifications.wechat.mode", group: "notifications", label: "公众号消息模式", valueType: "enum", options: ["AUTO", "TEMPLATE_MESSAGE", "SUBSCRIPTION_MESSAGE", "DISABLED"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "AUTO", description: "按账号实际权限选择；检测不到的能力标为不可用" }),
  entry({ key: "notifications.wechat.officialAccount.followSite", group: "notifications", label: "公众号跟随主站", valueType: "boolean", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "true", description: "跟随主站已保存的公众号 AppID / Secret，避免站长填两遍" }),
  entry({ key: "notifications.wechat.officialAccount.appId", group: "notifications", label: "公众号 AppID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空且跟随主站时，由主站同步进配置中心" }),
  entry({ key: "notifications.wechat.officialAccount.appSecret", group: "notifications", label: "公众号 AppSecret", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: false, description: "只保存在 Platform，回显为掩码" }),
  entry({ key: "notifications.wechat.miniProgram.appId", group: "notifications", label: "小程序 AppID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "订阅消息使用的小程序" }),
  entry({ key: "notifications.wechat.miniProgram.appSecret", group: "notifications", label: "小程序 AppSecret", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: false, description: "只保存在 Platform" }),
  entry({ key: "notifications.wechat.miniProgram.state", group: "notifications", label: "小程序版本", valueType: "enum", options: ["formal", "trial", "developer"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "formal", description: "订阅消息跳转的小程序版本" }),
  entry({ key: "notifications.wechat.miniProgram.lang", group: "notifications", label: "小程序语言", valueType: "enum", options: ["zh_CN", "en_US"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "zh_CN", description: "订阅消息语言" }),
  entry({ key: "notifications.wechat.miniProgram.template.forumReply", group: "notifications", label: "论坛新评论提醒模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "小程序订阅消息模板，留空则该事件不发小程序" }),
  entry({ key: "notifications.wechat.miniProgram.template.sessionUsageSubmitted", group: "notifications", label: "老师提交课时提醒模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "小程序订阅消息模板" }),
  entry({ key: "notifications.wechat.miniProgram.template.sessionUsageConfirmed", group: "notifications", label: "学生确认课时提醒模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "小程序订阅消息模板" }),
  entry({ key: "notifications.wechat.miniProgram.template.sessionUsageAutoConfirmed", group: "notifications", label: "24小时自动确认模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "小程序订阅消息模板" }),
  entry({ key: "notifications.wechat.miniProgram.template.lowBalanceRenewal", group: "notifications", label: "余额不足/续费提醒模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "小程序订阅消息模板" }),
  entry({ key: "notifications.wechat.miniProgram.template.privateAdminAlert", group: "notifications", label: "站长私密异常提醒模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "只发给站长，不能发给老师" }),
  entry({ key: "notifications.wechat.officialAccount.template.forumReply", group: "notifications", label: "公众号论坛评论模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则该事件不走公众号" }),
  entry({ key: "notifications.wechat.officialAccount.template.sessionUsageSubmitted", group: "notifications", label: "公众号老师提交课时模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不走公众号" }),
  entry({ key: "notifications.wechat.officialAccount.template.sessionUsageConfirmed", group: "notifications", label: "公众号学生确认模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不走公众号" }),
  entry({ key: "notifications.wechat.officialAccount.template.sessionUsageAutoConfirmed", group: "notifications", label: "公众号自动确认模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不走公众号" }),
  entry({ key: "notifications.wechat.officialAccount.template.lowBalanceRenewal", group: "notifications", label: "公众号续费提醒模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不走公众号" }),
  entry({ key: "notifications.wechat.officialAccount.template.privateAdminAlert", group: "notifications", label: "公众号站长异常模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不走公众号" }),
entry({ key: "notifications.wechat.officialAccount.template.kkchatMessage", group: "notifications", label: "公众号 KKChat 消息模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "只发短摘要。留空则官方消息不走公众号" }),
  entry({ key: "notifications.wechat.miniProgram.template.kkchatMessage", group: "notifications", label: "小程序 KKChat 消息模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "只发短摘要。留空则不走小程序" }),
  entry({ key: "notifications.wechat.officialAccount.template.courseTeacherAnnouncement", group: "notifications", label: "公众号课程群通知模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "老师课程公告。可与消息提醒使用同一个模板 ID。留空则不走公众号" }),
  entry({ key: "notifications.wechat.miniProgram.template.courseTeacherAnnouncement", group: "notifications", label: "小程序课程群通知模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不走小程序" }),
  entry({ key: "notifications.wechat.officialAccount.template.siteOwnerDirectMessage", group: "notifications", label: "公众号站长私信模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "站长给用户发私信时使用。留空则该事件不走公众号" }),
  entry({ key: "notifications.wechat.miniProgram.template.siteOwnerDirectMessage", group: "notifications", label: "小程序站长私信模板 ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不走小程序" }),
  entry({ key: "notifications.wechat.miniProgram.page.forumReply", group: "notifications", label: "论坛评论小程序页面", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不编造深链，改走通知首页配置" }),
  entry({ key: "notifications.wechat.miniProgram.page.sessionUsage", group: "notifications", label: "课时小程序页面", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不编造深链" }),
  entry({ key: "notifications.wechat.miniProgram.page.lowBalance", group: "notifications", label: "续费小程序页面", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "留空则不编造深链" }),
  entry({ key: "notifications.wechat.miniProgram.page.fallback", group: "notifications", label: "小程序通知首页", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "没有对应页面时的回落路径；不要填不存在的帖子链接" }),
  entry({ key: "notifications.wechat.fieldMaps", group: "notifications", label: "微信模板字段映射", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "JSON。键是事件，值是微信字段到数据字段，例如 thing1=learnerName。不允许表达式" }),
  entry({ key: "notifications.academic.lowBalanceThresholdCents", group: "notifications", label: "低余额阈值（分）", valueType: "number", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "10000", description: "学员可用余额低于该金额时提醒站长。配置中心存分，站长界面按元填写。0 到 100000000 分" }),
  entry({ key: "notifications.routes", group: "notifications", label: "通知事件路由", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "JSON。空则使用内置默认。产品可覆盖" }),
  entry({ key: "notifications.recipients", group: "notifications", label: "站长通知接收人", valueType: "stringList", sensitivity: "INTERNAL", sharePolicy: G, description: "Account 用户 sub，不存手机号副本" }),
  entry({ key: "notifications.sms.businessEnabled", group: "notifications", label: "启用业务短信", valueType: "boolean", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "false", description: "与登录验证码短信分开。关闭不影响登录" }),
  entry({ key: "notifications.sms.provider", group: "notifications", label: "业务短信服务商", valueType: "enum", options: ["INHERIT", "ALIYUN", "TENCENT"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "INHERIT", description: "INHERIT 跟随登录短信的阿里云账号；测试模式不会发真实业务短信" }),
  entry({ key: "notifications.sms.followLoginCredentials", group: "notifications", label: "短信密钥跟随登录", valueType: "boolean", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "true", description: "使用同一套 AccessKey 与签名，不重复填写" }),
  entry({ key: "notifications.sms.lowBalanceRepeatHours", group: "notifications", label: "续费短信重复间隔", valueType: "number", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "0", description: "0 表示同一低余额周期只发一次。充值恢复后才进入下一周期" }),
  entry({ key: "notifications.web.allowedOrigins", group: "notifications", label: "通知链接允许的域名", valueType: "stringList", sensitivity: "INTERNAL", sharePolicy: G, description: "https 来源白名单。站内相对路径始终允许" }),

  // email --------------------------------------------------------------------
  entry({ key: "email.provider", group: "email", label: "邮件服务商", valueType: "enum", options: ["DISABLED", "SMTP", "RESEND", "ALIYUN_DM", "SENDGRID"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "DISABLED", description: "发件服务商" }),
  entry({ key: "email.from", group: "email", label: "发件人", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "如 no-reply@example.com" }),
  entry({ key: "email.apiKey", group: "email", label: "邮件 API Key", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "Resend / SendGrid 等 API Key" }),
  entry({ key: "email.smtp.host", group: "email", label: "SMTP 主机", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "" }),
  entry({ key: "email.smtp.port", group: "email", label: "SMTP 端口", valueType: "number", sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "465", description: "" }),
  entry({ key: "email.smtp.user", group: "email", label: "SMTP 用户", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "" }),
  entry({ key: "email.smtp.password", group: "email", label: "SMTP 密码", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "只写不回显" }),

  // payment ------------------------------------------------------------------
  entry({ key: "payment.mode", group: "payment", label: "支付模式", valueType: "enum", options: ["auto", "mock", "wechat", "alipay", "both"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "auto", description: "生产禁止 mock" }),
  entry({ key: "payment.wechat.mchId", group: "payment", label: "微信商户号", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "全局默认商户，可按产品覆盖" }),
  entry({ key: "payment.wechat.mchSerialNo", group: "payment", label: "微信商户证书序列号", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "" }),
  entry({ key: "payment.wechat.apiV3Key", group: "payment", label: "微信 APIv3 Key", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "只写不回显" }),
  entry({ key: "payment.wechat.mchPrivateKey", group: "payment", label: "微信商户私钥", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "PEM，只写不回显" }),
  entry({ key: "payment.wechat.appId", group: "payment", label: "微信支付 AppID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: "PRODUCT_REQUIRED", description: "每个产品自己的 AppID，不能全局继承" }),
  entry({ key: "payment.alipay.appId", group: "payment", label: "支付宝 AppID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "全局默认商户应用，可按产品覆盖" }),
  entry({ key: "payment.alipay.privateKey", group: "payment", label: "支付宝应用私钥", valueType: "string", sensitivity: "SECRET", sharePolicy: G, runtimeDeliverable: true, description: "只写不回显" }),
  entry({ key: "payment.alipay.publicKey", group: "payment", label: "支付宝公钥", valueType: "string", sensitivity: "INTERNAL", sharePolicy: G, description: "支付宝侧公钥" }),
  entry({ key: "payment.alipay.gateway", group: "payment", label: "支付宝网关", valueType: "enum", options: ["production", "sandbox"], sensitivity: "INTERNAL", sharePolicy: G, builtinDefault: "production", description: "" }),

  // links --------------------------------------------------------------------
  entry({ key: "links.mainSite", group: "links", label: "主站地址", valueType: "url", sensitivity: "PUBLIC", sharePolicy: G, description: "供各产品跳回主站" }),
  entry({ key: "links.account", group: "links", label: "账号中心地址", valueType: "url", sensitivity: "PUBLIC", sharePolicy: G, description: "供各产品跳转账号中心" }),
  entry({ key: "links.jamendoClientId", group: "links", label: "Jamendo Client ID", valueType: "string", sensitivity: "PUBLIC", sharePolicy: G, description: "背景音乐 Jamendo 应用 ID（公开）" }),

  // product ------------------------------------------------------------------
  entry({ key: "product.publicOrigin", group: "product", label: "产品公开地址", valueType: "url", sensitivity: "PUBLIC", sharePolicy: "PRODUCT_REQUIRED", description: "产品自己的域名，不能全局共用" }),
  entry({ key: "product.oidc.clientId", group: "product", label: "OIDC Client ID", valueType: "string", sensitivity: "INTERNAL", sharePolicy: "PRODUCT_REQUIRED", description: "每个产品在账号中心的 Client" }),
  entry({ key: "product.oidc.clientSecret", group: "product", label: "OIDC Client Secret", valueType: "string", sensitivity: "SECRET", sharePolicy: "PRODUCT_REQUIRED", runtimeDeliverable: false, description: "只能在产品自己的部署环境里，不进配置中心" }),
  entry({ key: "product.oidc.redirectUri", group: "product", label: "OIDC Redirect URI", valueType: "url", sensitivity: "INTERNAL", sharePolicy: "PRODUCT_REQUIRED", description: "" }),
  entry({ key: "product.webhookSecret", group: "product", label: "产品 Webhook Secret", valueType: "string", sensitivity: "SECRET", sharePolicy: "PRODUCT_REQUIRED", runtimeDeliverable: false, description: "" }),
  entry({ key: "platform.serviceToken", group: "product", label: "Platform 服务凭证", valueType: "string", sensitivity: "SECRET", sharePolicy: "CENTRAL_ONLY", runtimeDeliverable: false, description: "由部署环境注入" }),
  entry({ key: "account.oidc.signingKey", group: "product", label: "账号中心签名私钥", valueType: "string", sensitivity: "SECRET", sharePolicy: "CENTRAL_ONLY", runtimeDeliverable: false, description: "只在 Account" }),
  entry({ key: "platform.configEncryptionKey", group: "product", label: "配置加密主密钥", valueType: "string", sensitivity: "SECRET", sharePolicy: "CENTRAL_ONLY", runtimeDeliverable: false, description: "只在 Platform 环境变量" }),
];

const CATALOG_BY_KEY = new Map(CONFIG_CATALOG.map((item) => [item.key, item]));

export function catalogEntry(key: string): ConfigCatalogEntry | null {
  return CATALOG_BY_KEY.get(key) ?? null;
}

export function catalogGroup(group: ConfigGroup): ConfigCatalogEntry[] {
  return CONFIG_CATALOG.filter((item) => item.group === group);
}

export function isConfigGroup(value: string): value is ConfigGroup {
  return (CONFIG_GROUPS as readonly string[]).includes(value);
}

/** 哪些组允许「全局默认」 */
export function groupHasGlobalKeys(group: ConfigGroup): boolean {
  return catalogGroup(group).some((item) => item.sharePolicy === "GLOBAL_INHERITABLE");
}

/**
 * 每个产品实际消费哪些配置组。影响范围分析与产品后台只显示这些组。
 * 在主站进程里运行的产品（course / forum / meetup / mathcode / personalwebsite）
 * 通过主站的有效配置消费，这里仍登记它们，便于影响范围完整。
 */
export const PRODUCT_GROUP_USAGE: Record<ProductId, readonly ConfigGroup[]> = {
  main: ["storage", "video", "ai", "maps", "sms", "email", "payment", "links", "notifications"],
  account: ["sms", "email", "links", "notifications"],
  academic: ["storage", "ai", "maps", "sms", "links", "notifications"],
  course: ["storage", "video", "ai", "payment", "links", "notifications"],
  rishi: ["storage", "ai", "maps", "links"],
  softwarelist: ["storage", "links"],
  forum: ["storage", "ai", "links", "notifications"],
  meetup: ["storage", "maps", "payment", "links"],
  personalwebsite: ["storage", "links"],
  mathcode: ["ai", "payment", "links"],
  valorant: ["storage", "links"],
  kkchat: ["links", "notifications"],
  xiangqi: ["ai", "links"],
};

export function productsUsingGroup(group: ConfigGroup): ProductId[] {
  return CONFIG_PRODUCT_IDS.filter((id) => PRODUCT_GROUP_USAGE[id].includes(group));
}

// ---------------------------------------------------------------------------
// 校验
// ---------------------------------------------------------------------------

export type ConfigValidationResult = { ok: true; value: string } | { ok: false; message: string };

/** 归一并校验一个值。所有值以字符串存储；boolean 为 "true"/"false"，列表用逗号分隔。 */
export function validateConfigValue(entryDef: ConfigCatalogEntry, raw: unknown): ConfigValidationResult {
  if (raw === null || raw === undefined) return { ok: false, message: `${entryDef.label} 不能为空` };
  let text: string;
  if (typeof raw === "boolean") text = raw ? "true" : "false";
  else if (typeof raw === "number") text = String(raw);
  else if (Array.isArray(raw)) text = raw.map((item) => String(item).trim()).filter(Boolean).join(",");
  else if (typeof raw === "string") text = raw.trim();
  else return { ok: false, message: `${entryDef.label} 类型不支持` };

  if (text.length > 20_000) return { ok: false, message: `${entryDef.label} 过长` };
  switch (entryDef.valueType) {
    case "boolean":
      if (text !== "true" && text !== "false") return { ok: false, message: `${entryDef.label} 只能是 true / false` };
      return { ok: true, value: text };
    case "number":
      if (!/^-?\d+(\.\d+)?$/.test(text)) return { ok: false, message: `${entryDef.label} 必须是数字` };
      return { ok: true, value: text };
    case "url":
      if (text === "") return { ok: true, value: "" };
      if (!/^https?:\/\/[^\s]+$/i.test(text)) return { ok: false, message: `${entryDef.label} 必须是 http(s) 地址` };
      return { ok: true, value: text.replace(/\/+$/, "") };
    case "enum":
      if (!entryDef.options?.includes(text)) {
        return { ok: false, message: `${entryDef.label} 只能是 ${entryDef.options?.join(" / ")}` };
      }
      return { ok: true, value: text };
    case "stringList":
      return { ok: true, value: text.split(/[,\n]/).map((item) => item.trim()).filter(Boolean).join(",") };
    default:
      return { ok: true, value: text };
  }
}

/** 全局默认只接受 GLOBAL_INHERITABLE；这是安全边界，不是配置项。 */
export function assertGlobalWritable(entryDef: ConfigCatalogEntry): void {
  if (entryDef.sharePolicy !== "GLOBAL_INHERITABLE") {
    throw new Error(`${entryDef.key} 是 ${entryDef.sharePolicy}，不能设为全局默认`);
  }
}

/** 产品覆盖接受 GLOBAL_INHERITABLE 与 PRODUCT_REQUIRED；CENTRAL_ONLY / LOCAL_ONLY 不进配置中心。 */
export function assertProductWritable(entryDef: ConfigCatalogEntry): void {
  if (entryDef.sharePolicy === "CENTRAL_ONLY" || entryDef.sharePolicy === "LOCAL_ONLY") {
    throw new Error(`${entryDef.key} 是 ${entryDef.sharePolicy}，配置中心不接受写入`);
  }
}

// ---------------------------------------------------------------------------
// 视图类型
// ---------------------------------------------------------------------------

/** Secret 的遮罩信息；任何视图都不含明文 */
export type ConfigSecretMeta = {
  configured: boolean;
  /** 尾号提示，如 "E4E"；未配置为 null */
  last4: string | null;
  /** sha256 前 12 位，用于比较两个值是否相同 */
  fingerprint: string | null;
};

export type ResolvedConfigEntry = {
  key: ConfigKey;
  group: ConfigGroup;
  label: string;
  valueType: ConfigValueType;
  sensitivity: ConfigSensitivity;
  sharePolicy: ConfigSharePolicy;
  clientVisibility: ConfigClientVisibility;
  source: ConfigSource;
  /** 非 Secret 的有效值；Secret 为 null */
  value: string | null;
  /** Secret 的遮罩信息；非 Secret 为 null */
  secret: ConfigSecretMeta | null;
  /** 该产品是否存在覆盖 */
  overridden: boolean;
  /** 有效值所在记录的版本；用于乐观并发 */
  version: number;
  /** 全局默认是否已配置（用于「恢复跟随」预览） */
  globalConfigured: boolean;
};

export type ResolvedConfigGroup = {
  productId: ProductId;
  group: ConfigGroup;
  /** 组级模式：全部跟随 / 部分覆盖 / 全部覆盖 */
  mode: "INHERIT" | "MIXED" | "OVERRIDE";
  entries: ResolvedConfigEntry[];
  revision: number;
  resolvedAt: string;
};

/** 全局默认视图（主站 / Platform 后台） */
export type GlobalConfigEntry = {
  key: ConfigKey;
  group: ConfigGroup;
  label: string;
  valueType: ConfigValueType;
  sensitivity: ConfigSensitivity;
  sharePolicy: ConfigSharePolicy;
  clientVisibility: ConfigClientVisibility;
  configured: boolean;
  /** 非 Secret 的值；Secret 为 null */
  value: string | null;
  secret: ConfigSecretMeta | null;
  /** 未配置时从哪里回退 */
  fallbackSource: "ENV_FALLBACK" | "BUILTIN_DEFAULT" | "UNSET";
  version: number;
  updatedAt: string | null;
};

export type GlobalConfigGroupView = {
  group: ConfigGroup;
  entries: GlobalConfigEntry[];
  revision: number;
};

export type ConfigRevision = {
  revision: number;
  updatedAt: string;
};

export type ConfigOverrideInput = {
  /** 明文值；Secret 传空字符串表示保持不变 */
  value: string | boolean | number | string[];
  /** 提交时携带当前版本；不一致返回 409 */
  expectedVersion?: number;
};

export type ConfigGlobalInput = ConfigOverrideInput & {
  /** 明确清除 Secret；与 value 互斥 */
  clear?: boolean;
};

export type ConfigWriteResult = {
  key: ConfigKey;
  version: number;
  revision: number;
  source: ConfigSource;
};

export type ConfigImpact = {
  key: ConfigKey;
  group: ConfigGroup;
  /** 当前跟随全局的产品 */
  inheriting: ProductId[];
  /** 已有自己覆盖的产品 */
  overriding: ProductId[];
};

export type ConfigProbeStep = {
  name: string;
  status: "ok" | "error" | "skipped";
  detail: string | null;
  latencyMs: number | null;
};

export type ConfigProbeResult = {
  productId: ProductId;
  group: ConfigGroup;
  status: "OK" | "DEGRADED" | "FAILED" | "NOT_CONFIGURED" | "SKIPPED";
  steps: ConfigProbeStep[];
  /** 测试的是最终有效配置的来源摘要，不含 Secret */
  sources: Record<ConfigKey, ConfigSource>;
  testedAt: string;
};

export type ConfigAuditAction =
  | "GLOBAL_CONFIG_UPDATED"
  | "GLOBAL_CONFIG_CLEARED"
  | "PRODUCT_CONFIG_OVERRIDE_SET"
  | "PRODUCT_CONFIG_OVERRIDE_CLEARED"
  | "PRODUCT_CONFIG_COPIED_FROM_GLOBAL"
  | "CONFIG_TEST_RUN"
  | "CONFIG_MIGRATION"
  | "CONFIG_ROLLBACK";

export type ConfigAuditEntry = {
  id: string;
  action: ConfigAuditAction;
  actorId: string | null;
  clientId: string;
  productId: ProductId | null;
  key: ConfigKey | null;
  group: ConfigGroup | null;
  beforeSource: ConfigSource | null;
  afterSource: ConfigSource | null;
  /** 遮罩后的前后摘要，绝不含 Secret 明文 */
  before: ConfigSecretMeta | { value: string | null } | null;
  after: ConfigSecretMeta | { value: string | null } | null;
  version: number | null;
  revision: number;
  requestId: string | null;
  createdAt: string;
};

export type ConfigHistoryEntry = {
  scope: "GLOBAL" | "PRODUCT";
  productId: ProductId | null;
  key: ConfigKey;
  version: number;
  /** 非 Secret 的值；Secret 只有遮罩 */
  value: string | null;
  secret: ConfigSecretMeta | null;
  updatedById: string | null;
  createdAt: string;
};

export type ConfigHealth = {
  ok: boolean;
  checks: {
    database: "ok" | "error";
    encryption: "ok" | "missing";
    revision: number | null;
    catalog: number;
  };
};

export type ConfigExportEntry = {
  scope: "GLOBAL" | "PRODUCT";
  productId: ProductId | null;
  key: ConfigKey;
  value: string | null;
  secretConfigured: boolean | null;
  version: number;
  updatedAt: string;
};

/**
 * 产品侧整组解析结果的状态：LIVE 刚从 Platform 拿到；CACHED 在 TTL 内；
 * STALE 超过 TTL 但 Platform 不可达，仍用 Last-Known-Good；
 * FALLBACK 没有任何缓存，只能用环境变量；UNCONFIGURED 什么都没有。
 */
export type ConfigGroupSnapshot = {
  group: ResolvedConfigGroup;
  state: ConfigCacheState;
  fetchedAt: string;
  lastError: string | null;
};

/** 把值按 key 取出来的便捷结构 */
export function entriesToRecord(entries: readonly ResolvedConfigEntry[]): Record<ConfigKey, string | null> {
  const out: Record<ConfigKey, string | null> = {};
  for (const item of entries) out[item.key] = item.value;
  return out;
}

export function groupMode(entries: readonly Pick<ResolvedConfigEntry, "overridden" | "sharePolicy">[]): ResolvedConfigGroup["mode"] {
  const inheritable = entries.filter((item) => item.sharePolicy === "GLOBAL_INHERITABLE");
  if (inheritable.length === 0) return "OVERRIDE";
  const overridden = inheritable.filter((item) => item.overridden).length;
  if (overridden === 0) return "INHERIT";
  if (overridden === inheritable.length) return "OVERRIDE";
  return "MIXED";
}

/** 只保留浏览器允许看到的字段；服务端渲染前调用一次，别在客户端做过滤。 */
export function browserSafeEntries(entries: readonly ResolvedConfigEntry[]): Array<Pick<ResolvedConfigEntry, "key" | "value" | "source">> {
  return entries
    .filter((item) => item.clientVisibility === "BROWSER_ALLOWED" && item.sensitivity === "PUBLIC")
    .map((item) => ({ key: item.key, value: item.value, source: item.source }));
}
