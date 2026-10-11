/**
 * 全站内容导出与公众号草稿的公共契约。版本 1。
 *
 * 这里只有类型、上限和纯校验。不读数据库，不保存公众号密钥，
 * 也不把客户端自称的「已公开」当成授权：产品服务端必须用自己的源记录
 * 重新生成这份结构，platform 再拒绝任何非公开项。
 */

export const PUBLISHING_CONTRACT_VERSION = 1 as const;

export const PUBLISHING_LAYOUT_VERSION = 1 as const;

/** 一篇公众号图文里纵向排列的内容项上限。超出后由调用方分批成多篇草稿。 */
export const PUBLISHING_MAX_ITEMS = 50;

/** 微信草稿正文的安全上限。官方限制附近留出余量，避免整篇被拒。 */
export const PUBLISHING_HTML_BUDGET = 18_000;

export const PUBLISHING_LIMITS = {
  title: 64,
  digest: 120,
  summary: 500,
  bodyText: 1200,
  blockText: 1200,
  blocks: 12,
  tag: 24,
  tags: 8,
  images: 6,
  url: 1024,
  sourceId: 80,
  product: 32,
  sourceType: 32,
  alt: 80,
  author: 40,
  templateKey: 40,
  idempotencyKey: 80,
  appId: 32,
  miniProgramPath: 200,
  brand: 40,
} as const;

export const PUBLIC_VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE", "PAID"] as const;
export type PublicVisibility = (typeof PUBLIC_VISIBILITIES)[number];

export const CAPABILITY_STATES = ["yes", "no", "unknown"] as const;
export type CapabilityState = (typeof CAPABILITY_STATES)[number];

export const EXPORT_JOB_STATUSES = [
  "DRAFT",
  "READY",
  "SYNCING",
  "SYNCED",
  "FAILED",
  "BLOCKED",
] as const;
export type ExportJobStatus = (typeof EXPORT_JOB_STATUSES)[number];

export const PUBLISHING_PRESET_KEYS = [
  "forum-digest",
  "teacher-single",
  "teacher-collection",
  "company",
  "knowledge-public",
  "course-intro",
] as const;
export type PublishingPresetKey = (typeof PUBLISHING_PRESET_KEYS)[number];

export type PublishingPreset = {
  key: PublishingPresetKey;
  label: string;
  templateKey: string;
  product: string;
};

export const PUBLISHING_PRESETS: readonly PublishingPreset[] = [
  { key: "forum-digest", label: "校园论坛精选", templateKey: "forum-wall", product: "forum" },
  { key: "teacher-single", label: "单老师", templateKey: "academic-clean", product: "academic" },
  { key: "teacher-collection", label: "多老师合集", templateKey: "academic-clean", product: "academic" },
  { key: "company", label: "公司宣传", templateKey: "professional", product: "company" },
  { key: "knowledge-public", label: "知识社区公开内容", templateKey: "professional", product: "knowledge" },
  { key: "course-intro", label: "网课课程介绍", templateKey: "campus-light", product: "course" },
];

export type ContentSourceRef = {
  product: string;
  sourceType: string;
  sourceId: string;
  sourceVersion?: string;
};

export type ContentImage = {
  url: string;
  alt?: string;
};

/** 正文块。图片块是原内容配图，不是「跳转原帖」的二维码。 */
export type ContentBodyBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "image"; url: string; alt?: string };

export type MiniProgramTarget = {
  appId: string;
  path: string;
};

export type PublishableContent = {
  ref: ContentSourceRef;
  title: string;
  summary: string;
  bodyBlocks: ContentBodyBlock[];
  images: ContentImage[];
  tags?: string[];
  displayDate?: string;
  authorName?: string;
  commentCount?: number | null;
  showAuthor?: boolean;
  showDate?: boolean;
  showTags?: boolean;
  /** 这一篇的详情页，不能是首页。 */
  publicWebUrl: string;
  miniProgram?: MiniProgramTarget | null;
  publicVisibility: PublicVisibility;
  allowExport: boolean;
  consentOrLegalBasis?: string;
};

export type PublishingCollection = {
  title: string;
  digest: string;
  coverSource?: string;
  intro?: string;
  /** 纵向顺序。调整顺序只改这个数组，不回写原帖。 */
  items: PublishableContent[];
  layoutVersion: number;
  templateKey: string;
  presetKey?: PublishingPresetKey;
};

export type ChannelCapability = {
  channel: "wechat_mp";
  canDraft: CapabilityState;
  /** 账号是否具备发表能力。查不到就保持 unknown，产品也不会因此去调用发表接口。 */
  canPublish: CapabilityState;
  canUseExternalArticleLink: CapabilityState;
  canLinkMiniProgram: CapabilityState;
  /** 微信正文是否保住横向滑动。没有真机结果时必须是 unknown。 */
  swipePreserved: CapabilityState;
};

/**
 * 发表能力默认 unknown，不能当成「可以群发」。
 * canPublish 即使以后被标成 yes，本契约的任务也只创建草稿。
 */
export const DEFAULT_WECHAT_CAPABILITY: ChannelCapability = {
  channel: "wechat_mp",
  canDraft: "unknown",
  canPublish: "unknown",
  canUseExternalArticleLink: "unknown",
  canLinkMiniProgram: "unknown",
  swipePreserved: "unknown",
};

export type PublishingTheme = {
  key: string;
  name: string;
  background: string;
  ink: string;
  muted: string;
  accent: string;
  card: string;
  radius: number;
};

export const PUBLISHING_THEMES: readonly PublishingTheme[] = [
  {
    key: "professional",
    name: "专业清晰",
    background: "#f7f5f2",
    ink: "#1c1917",
    muted: "#57534e",
    accent: "#1d4ed8",
    card: "#ffffff",
    radius: 12,
  },
  {
    key: "campus-light",
    name: "校园轻快",
    background: "#fff7ed",
    ink: "#1f2937",
    muted: "#78716c",
    accent: "#ea580c",
    card: "#ffffff",
    radius: 16,
  },
  {
    key: "forum-wall",
    name: "校园墙",
    background: "#f8fafc",
    ink: "#0f172a",
    muted: "#64748b",
    accent: "#2563eb",
    card: "#ffffff",
    radius: 16,
  },
  {
    key: "academic-clean",
    name: "简洁学术",
    background: "#f7f5f2",
    ink: "#1c1917",
    muted: "#57534e",
    accent: "#1d4ed8",
    card: "#ffffff",
    radius: 12,
  },
];

export type PublishingBrand = {
  name: string;
  account: string;
  line?: string;
  contact?: string;
};

export const DEFAULT_PUBLISHING_BRAND: PublishingBrand = {
  name: "歪歪滴艾斯",
  account: "歪歪滴艾斯校园",
  line: "大学辅导 / 学业服务",
};

export type ExportJobView = {
  id: string;
  idempotencyKey: string;
  status: ExportJobStatus;
  contentHash: string;
  templateKey: string;
  title: string;
  sourceRefs: ContentSourceRef[];
  wechatAppId: string;
  /** 微信 draft/add 返回的 media_id。再次同步会追加，不会静默覆盖旧草稿。 */
  wechatMediaIds: string[];
  lastError: string;
  syncedAt: string | null;
  updatedAt: string;
};

export type PublishParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export function publishingTheme(key: string): PublishingTheme {
  return PUBLISHING_THEMES.find((item) => item.key === key) ?? PUBLISHING_THEMES[0]!;
}

export function isPublishingPresetKey(value: string): value is PublishingPresetKey {
  return (PUBLISHING_PRESET_KEYS as readonly string[]).includes(value);
}

function clip(value: unknown, max: number) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseSourceRef(raw: unknown): PublishParseResult<ContentSourceRef> {
  if (!isRecord(raw)) return { ok: false, reason: "内容来源缺失" };
  const product = clip(raw.product, PUBLISHING_LIMITS.product);
  const sourceType = clip(raw.sourceType, PUBLISHING_LIMITS.sourceType);
  const sourceId = clip(raw.sourceId, PUBLISHING_LIMITS.sourceId);
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(product)) return { ok: false, reason: "产品标识无效" };
  if (!/^[a-z0-9][a-z0-9_-]{0,31}$/i.test(sourceType)) return { ok: false, reason: "来源类型无效" };
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(sourceId)) return { ok: false, reason: "来源编号无效" };
  const sourceVersion = clip(raw.sourceVersion, 40);
  return {
    ok: true,
    value: {
      product,
      sourceType,
      sourceId,
      ...(sourceVersion ? { sourceVersion } : {}),
    },
  };
}

function parseBlock(raw: unknown): ContentBodyBlock | null {
  if (!isRecord(raw)) return null;
  const kind = clip(raw.kind, 20);
  if (kind === "heading" || kind === "paragraph") {
    const text = clip(raw.text, PUBLISHING_LIMITS.blockText);
    if (!text) return null;
    return { kind, text };
  }
  if (kind === "image") {
    const url = clip(raw.url, PUBLISHING_LIMITS.url);
    if (!url) return null;
    const alt = clip(raw.alt, PUBLISHING_LIMITS.alt);
    return { kind: "image", url, ...(alt ? { alt } : {}) };
  }
  return null;
}

function parseMiniProgram(raw: unknown): MiniProgramTarget | null {
  if (!isRecord(raw)) return null;
  const appId = clip(raw.appId, PUBLISHING_LIMITS.appId);
  const path = clip(raw.path, PUBLISHING_LIMITS.miniProgramPath);
  if (!/^wx[0-9a-f]{16}$/i.test(appId)) return null;
  if (!/^[A-Za-z0-9_/?=&%.-]+$/.test(path) || path.includes("://")) return null;
  return { appId, path };
}

export function parsePublishableContent(raw: unknown): PublishParseResult<PublishableContent> {
  if (!isRecord(raw)) return { ok: false, reason: "内容项无效" };
  const ref = parseSourceRef(raw.ref);
  if (!ref.ok) return ref;
  const visibility = clip(raw.publicVisibility, 20);
  if (!(PUBLIC_VISIBILITIES as readonly string[]).includes(visibility)) {
    return { ok: false, reason: "公开状态无效" };
  }
  const title = clip(raw.title, PUBLISHING_LIMITS.title);
  if (!title) return { ok: false, reason: "标题不能为空" };
  const publicWebUrl = clip(raw.publicWebUrl, PUBLISHING_LIMITS.url);
  if (!publicWebUrl) return { ok: false, reason: "缺少详情页地址" };
  const blocks = Array.isArray(raw.bodyBlocks)
    ? raw.bodyBlocks.map(parseBlock).filter((item): item is ContentBodyBlock => Boolean(item)).slice(0, PUBLISHING_LIMITS.blocks)
    : [];
  const images = Array.isArray(raw.images)
    ? raw.images.slice(0, PUBLISHING_LIMITS.images).flatMap((item) => {
        if (!isRecord(item)) return [];
        const url = clip(item.url, PUBLISHING_LIMITS.url);
        if (!url) return [];
        const alt = clip(item.alt, PUBLISHING_LIMITS.alt);
        return [{ url, ...(alt ? { alt } : {}) }];
      })
    : [];
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((item) => clip(item, PUBLISHING_LIMITS.tag)).filter(Boolean).slice(0, PUBLISHING_LIMITS.tags)
    : [];
  const commentCount = raw.commentCount == null || raw.commentCount === ""
    ? null
    : Number(raw.commentCount);
  return {
    ok: true,
    value: {
      ref: ref.value,
      title,
      summary: clip(raw.summary, PUBLISHING_LIMITS.summary),
      bodyBlocks: blocks,
      images,
      ...(tags.length ? { tags } : {}),
      ...(clip(raw.displayDate, 40) ? { displayDate: clip(raw.displayDate, 40) } : {}),
      ...(clip(raw.authorName, PUBLISHING_LIMITS.author) ? { authorName: clip(raw.authorName, PUBLISHING_LIMITS.author) } : {}),
      commentCount: commentCount != null && Number.isFinite(commentCount) ? Math.max(0, Math.floor(commentCount)) : null,
      showAuthor: raw.showAuthor !== false,
      showDate: raw.showDate !== false,
      showTags: raw.showTags !== false,
      publicWebUrl,
      miniProgram: parseMiniProgram(raw.miniProgram),
      publicVisibility: visibility as PublicVisibility,
      allowExport: raw.allowExport === true,
      ...(clip(raw.consentOrLegalBasis, 80) ? { consentOrLegalBasis: clip(raw.consentOrLegalBasis, 80) } : {}),
    },
  };
}

export function parsePublishingCollection(raw: unknown): PublishParseResult<PublishingCollection> {
  if (!isRecord(raw)) return { ok: false, reason: "合集无效" };
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  if (!itemsRaw.length) return { ok: false, reason: "至少选择一篇内容" };
  if (itemsRaw.length > PUBLISHING_MAX_ITEMS) return { ok: false, reason: `一次最多 ${PUBLISHING_MAX_ITEMS} 篇` };
  const items: PublishableContent[] = [];
  for (const item of itemsRaw) {
    const parsed = parsePublishableContent(item);
    if (!parsed.ok) return parsed;
    items.push(parsed.value);
  }
  const title = clip(raw.title, PUBLISHING_LIMITS.title);
  if (!title) return { ok: false, reason: "合集标题不能为空" };
  const presetKey = clip(raw.presetKey, 40);
  return {
    ok: true,
    value: {
      title,
      digest: clip(raw.digest, PUBLISHING_LIMITS.digest),
      ...(clip(raw.coverSource, PUBLISHING_LIMITS.url) ? { coverSource: clip(raw.coverSource, PUBLISHING_LIMITS.url) } : {}),
      ...(clip(raw.intro, 500) ? { intro: clip(raw.intro, 500) } : {}),
      items,
      layoutVersion: PUBLISHING_LAYOUT_VERSION,
      templateKey: clip(raw.templateKey, PUBLISHING_LIMITS.templateKey) || "professional",
      ...(isPublishingPresetKey(presetKey) ? { presetKey } : {}),
    },
  };
}

/** 只有公开且允许导出的项能进入草稿。UNLISTED / PRIVATE / PAID 一律拒绝。 */
export function exportBlockReason(item: PublishableContent): string {
  if (!item.allowExport) return `${item.title} 未允许导出`;
  if (item.publicVisibility !== "PUBLIC") {
    return `${item.title} 不是公开内容（${item.publicVisibility}），不能同步`;
  }
  return "";
}

export function assertCollectionExportable(collection: PublishingCollection): PublishParseResult<PublishingCollection> {
  const blocked = collection.items.map(exportBlockReason).filter(Boolean);
  if (blocked.length) return { ok: false, reason: blocked.join("；") };
  const seen = new Set<string>();
  for (const item of collection.items) {
    const key = `${item.ref.product}:${item.ref.sourceType}:${item.ref.sourceId}`;
    if (seen.has(key)) return { ok: false, reason: "同一篇内容不能重复加入" };
    seen.add(key);
  }
  return { ok: true, value: collection };
}

/** 稳定序列化，给幂等哈希用。不包含二维码图片字节。 */
export function canonicalPublishingJson(collection: PublishingCollection): string {
  const items = collection.items.map((item) => ({
    ref: item.ref,
    title: item.title,
    summary: item.summary,
    bodyBlocks: item.bodyBlocks,
    images: item.images,
    tags: item.tags ?? [],
    displayDate: item.displayDate ?? "",
    authorName: item.authorName ?? "",
    commentCount: item.commentCount ?? null,
    showAuthor: item.showAuthor !== false,
    showDate: item.showDate !== false,
    showTags: item.showTags !== false,
    publicWebUrl: item.publicWebUrl,
    miniProgram: item.miniProgram ?? null,
    publicVisibility: item.publicVisibility,
    allowExport: item.allowExport,
    templateKey: collection.templateKey,
  }));
  return JSON.stringify({
    version: PUBLISHING_CONTRACT_VERSION,
    title: collection.title,
    digest: collection.digest,
    intro: collection.intro ?? "",
    templateKey: collection.templateKey,
    items,
  });
}
