/**
 * 二维码和详情链接只指向允许的公开网址。
 * 永久令牌、会话、手机号一类查询参数会先去掉，再决定能不能用。
 */

import type { ContentSourceRef, PublishableContent } from "../contracts/publishing";
import { PUBLISHING_LIMITS } from "../contracts/publishing";

export const DEFAULT_PUBLISHING_HOSTS = ["yydsxwh.com"] as const;

const SECRET_QUERY = /^(token|access_token|secret|password|phone|mobile|session|ticket|code|auth|key|signature|expires)$/i;

export type PublicUrlOptions = {
  allowHosts?: readonly string[];
  /** 本地预览可打开 localhost。送进公众号二维码时必须关掉。 */
  allowLocalhost?: boolean;
};

export type QrTarget = {
  ref: ContentSourceRef;
  publicWebUrl: string;
  miniProgramPath: string | null;
};

export type TargetResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

function hostAllowed(hostname: string, allowHosts: readonly string[], allowLocalhost: boolean) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (allowLocalhost && (host === "localhost" || host === "127.0.0.1")) return true;
  return allowHosts.some((allowed) => {
    const name = allowed.toLowerCase().replace(/^\*\./, "").replace(/\.$/, "");
    return host === name || host.endsWith(`.${name}`);
  });
}

/** 去掉凭证类查询参数。路径本身仍必须是具体详情，不能只剩首页。 */
export function stripSensitiveQuery(url: URL) {
  const next = new URL(url.toString());
  const kept: Array<[string, string]> = [];
  next.searchParams.forEach((value, key) => {
    if (SECRET_QUERY.test(key)) return;
    if (/^1\d{10}$/.test(value)) return;
    kept.push([key, value]);
  });
  next.search = "";
  for (const [key, value] of kept) next.searchParams.append(key, value);
  next.hash = "";
  return next;
}

export function canonicalPublicUrl(raw: string, options: PublicUrlOptions = {}): TargetResult {
  const allowHosts = options.allowHosts?.length ? options.allowHosts : DEFAULT_PUBLISHING_HOSTS;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "详情地址无效" };
  }
  if (url.username || url.password) return { ok: false, reason: "详情地址不能带账号" };
  const localhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(options.allowLocalhost && localhost && url.protocol === "http:")) {
    return { ok: false, reason: "详情地址必须是 https" };
  }
  if (!hostAllowed(url.hostname, allowHosts, Boolean(options.allowLocalhost))) {
    return { ok: false, reason: "详情地址不在允许的域名内" };
  }
  const cleaned = stripSensitiveQuery(url);
  const path = cleaned.pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "") return { ok: false, reason: "详情地址不能只指向首页" };
  const result = cleaned.toString();
  if (result.length > PUBLISHING_LIMITS.url) return { ok: false, reason: "详情地址过长" };
  return { ok: true, url: result };
}

export function qrTargetsFor(items: PublishableContent[], options: PublicUrlOptions = {}): TargetResult & { targets?: QrTarget[] } {
  const targets: QrTarget[] = [];
  const seenUrl = new Map<string, string>();
  for (const item of items) {
    const canonical = canonicalPublicUrl(item.publicWebUrl, options);
    if (!canonical.ok) return { ok: false, reason: `${item.title}：${canonical.reason}` };
    const owner = `${item.ref.product}:${item.ref.sourceType}:${item.ref.sourceId}`;
    const previous = seenUrl.get(canonical.url);
    if (previous && previous !== owner) {
      return { ok: false, reason: "不同内容不能共用同一个详情地址或二维码" };
    }
    seenUrl.set(canonical.url, owner);
    targets.push({
      ref: item.ref,
      publicWebUrl: canonical.url,
      miniProgramPath: item.miniProgram?.path ?? null,
    });
  }
  return { ok: true, url: "", targets };
}

/** 正文配图和跳转二维码是两类数据。这个判断防止把配图当成导航码。 */
export function isNavigationQrImage(url: string, navigationUrls: readonly string[]) {
  return navigationUrls.includes(url);
}
