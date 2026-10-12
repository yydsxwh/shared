/**
 * 公众号正文 HTML。
 *
 * 微信文章不会执行 React 或脚本。这里用纯 HTML：
 * 每篇内容是独立的横向滚动容器，向左滑露出该篇自己的二维码图片。
 * 二维码必须是 <img>，不能是 SVG 背景或图标。
 * 如果微信丢掉 overflow，两块会上下叠在一起，二维码图片仍然在，可以长按识别。
 * 只有 swipePreserved 被真机确认为 no 时，才改成明确的上下排列，并改掉「左滑」文案。
 */

import type {
  ChannelCapability,
  ContentBodyBlock,
  PublishableContent,
  PublishingBrand,
  PublishingCollection,
  PublishingTheme,
} from "../contracts/publishing";
import {
  DEFAULT_PUBLISHING_BRAND,
  DEFAULT_WECHAT_CAPABILITY,
  PUBLISHING_HTML_BUDGET,
  PUBLISHING_LAYOUT_VERSION,
  publishingTheme,
} from "../contracts/publishing";

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

export type ArticleRenderInput = {
  collection: PublishingCollection;
  /** 与 items 顺序一致。值必须是已经上传到微信的图片地址，或预览用的 https/data 图片。 */
  qrImageUrls: string[];
  capability?: ChannelCapability;
  theme?: PublishingTheme;
  brand?: PublishingBrand;
  footerQrImageUrl?: string;
  footerCaption?: string;
  /** wechat 拒绝 data: 图片，避免把预览占位送进草稿箱。 */
  mode?: "preview" | "wechat";
};

export type ArticleRenderResult = {
  html: string;
  batches: string[];
  layout: "swipe-with-fallback" | "stacked";
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function color(value: string, fallback: string) {
  return HEX_COLOR.test(value) ? value : fallback;
}

function imageSrcAllowed(url: string, mode: "preview" | "wechat") {
  if (mode === "preview" && url.startsWith("data:image/png;base64,")) {
    return url.length < 400_000;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    return true;
  } catch {
    return false;
  }
}

function contentImageAllowed(url: string, mode: "preview" | "wechat") {
  if (!imageSrcAllowed(url, mode) || !url.startsWith("https://")) return false;
  if (mode === "preview") return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    // 只留已经上传到微信的图。站点 CDN 和带签名的 OSS 不写进草稿，避免防盗链空白或把临时凭证带出去。
    return host === "mmbiz.qpic.cn" || host === "mmbiz.qlogo.cn";
  } catch {
    return false;
  }
}

function paragraphs(blocks: ContentBodyBlock[], mode: "preview" | "wechat") {
  return blocks
    .map((block) => {
      if (block.kind === "heading") return `<h3 style="margin:12px 0 6px;font-size:16px;">${escapeHtml(block.text)}</h3>`;
      if (block.kind === "paragraph") {
        return block.text
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => `<p style="margin:0 0 8px;line-height:1.7;">${escapeHtml(line)}</p>`)
          .join("");
      }
      if (!contentImageAllowed(block.url, mode)) return "";
      return `<p style="margin:8px 0;"><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt || "")}" style="max-width:100%;height:auto;" /></p>`;
    })
    .join("");
}

function detailLink(item: PublishableContent, capability: ChannelCapability) {
  if (capability.canUseExternalArticleLink !== "yes") return "";
  if (!item.publicWebUrl.startsWith("https://")) return "";
  return `<p style="margin:8px 0 0;"><a href="${escapeHtml(item.publicWebUrl)}">查看原帖及评论</a></p>`;
}

/**
 * 公众号正文里的小程序入口必须是微信认可的卡片，而且要先完成关联和真机确认。
 * 路径纯文本点不了，这里不输出 path，避免被当成已经接好的按钮。
 * canLinkMiniProgram 即使被标成 yes，在官方标签接入并验过之前也不渲染入口。
 */
function miniProgramLine(item: PublishableContent, _capability: ChannelCapability) {
  if (!item.miniProgram) return "";
  return `<p style="margin:8px 0 0;">小程序入口尚未接入，请长按本篇二维码。</p>`;
}

function metaLine(item: PublishableContent, muted: string) {
  const bits: string[] = [];
  if (item.showAuthor !== false && item.authorName) bits.push(item.authorName);
  if (item.showDate !== false && item.displayDate) bits.push(item.displayDate);
  if (item.showTags !== false && item.tags?.length) bits.push(item.tags.join(" / "));
  if (item.commentCount != null) bits.push(`${item.commentCount} 条评论`);
  if (!bits.length) return "";
  return `<p style="margin:0 0 8px;color:${muted};font-size:13px;">${escapeHtml(bits.join(" · "))}</p>`;
}

function cardHtml(item: PublishableContent, qrImageUrl: string, input: Required<Pick<ArticleRenderInput, "capability" | "mode">> & { theme: PublishingTheme; layout: ArticleRenderResult["layout"] }) {
  const ink = color(input.theme.ink, "#1c1917");
  const muted = color(input.theme.muted, "#57534e");
  const accent = color(input.theme.accent, "#1d4ed8");
  const card = color(input.theme.card, "#ffffff");
  const radius = Math.max(0, Math.min(24, Math.round(input.theme.radius)));
  const qrOk = imageSrcAllowed(qrImageUrl, input.mode);
  const qr = qrOk
    ? `<img src="${escapeHtml(qrImageUrl)}" alt="长按识别进入原帖" width="180" height="180" style="width:180px;height:180px;" />`
    : "";
  const swipe = input.layout === "swipe-with-fallback";
  const hint = swipe ? "左滑看二维码 →" : "长按二维码进入原帖";
  const qrHint = swipe ? "长按识别进入原帖" : "长按识别进入这一篇";
  const front = `<section style="display:inline-block;width:100%;vertical-align:top;white-space:normal;box-sizing:border-box;padding:16px;">
<h2 style="margin:0 0 8px;font-size:18px;line-height:1.4;">${escapeHtml(item.title)}</h2>
${metaLine(item, muted)}
${item.summary ? `<p style="margin:0 0 8px;line-height:1.7;">${escapeHtml(item.summary)}</p>` : ""}
${paragraphs(item.bodyBlocks, input.mode)}
${detailLink(item, input.capability)}
${miniProgramLine(item, input.capability)}
<p style="margin:12px 0 0;color:${accent};font-size:14px;">${hint}</p>
</section>`;
  const back = `<section style="display:inline-block;width:100%;vertical-align:top;white-space:normal;box-sizing:border-box;padding:16px;text-align:center;">
${qr}
<p style="margin:8px 0 0;">${qrHint}</p>
</section>`;
  const body = swipe
    ? `<section style="overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch;">${front}${back}</section>`
    : `${front}${back}`;
  return `<section data-card="item" data-source-id="${escapeHtml(item.ref.sourceId)}" style="margin:0 0 16px;border-radius:${radius}px;overflow:hidden;background:${card};color:${ink};">${body}</section>`;
}

function footerHtml(qrImageUrl: string, caption: string, mode: "preview" | "wechat", theme: PublishingTheme) {
  if (!qrImageUrl || !imageSrcAllowed(qrImageUrl, mode)) return "";
  const card = color(theme.card, "#ffffff");
  return `<section data-card="footer" data-source-id="collection-cta" style="margin:16px 0;padding:16px;text-align:center;background:${card};">
<p style="margin:0 0 8px;">${escapeHtml(caption || "扫码了解更多")}</p>
<img src="${escapeHtml(qrImageUrl)}" alt="${escapeHtml(caption || "合集入口二维码")}" width="180" height="180" style="width:180px;height:180px;" />
</section>`;
}

function brandHtml(brand: PublishingBrand, muted: string) {
  const lines = [brand.name, brand.line || "", brand.account ? `关注微信公众号：${brand.account}` : "", brand.contact || ""]
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => `<p style="margin:0 0 4px;color:${muted};font-size:13px;">${escapeHtml(line)}</p>`).join("");
}

function wrapArticle(inner: string, theme: PublishingTheme, layout: ArticleRenderResult["layout"]) {
  const background = color(theme.background, "#f7f5f2");
  const ink = color(theme.ink, "#1c1917");
  return `<article data-layout="${layout}" data-layout-version="${PUBLISHING_LAYOUT_VERSION}" style="background:${background};color:${ink};padding:12px;">${inner}</article>`;
}

export function renderWechatArticle(input: ArticleRenderInput): ArticleRenderResult {
  const capability = input.capability ?? DEFAULT_WECHAT_CAPABILITY;
  const theme = input.theme ?? publishingTheme(input.collection.templateKey);
  const mode = input.mode ?? "wechat";
  const layout: ArticleRenderResult["layout"] = capability.swipePreserved === "no" ? "stacked" : "swipe-with-fallback";
  const brand = input.brand ?? DEFAULT_PUBLISHING_BRAND;
  if (input.qrImageUrls.length !== input.collection.items.length) {
    throw new Error("每篇内容都要有自己的二维码图片");
  }
  const cards = input.collection.items.map((item, index) =>
    cardHtml(item, input.qrImageUrls[index] || "", { capability, mode, theme, layout }),
  );
  const intro = input.collection.intro
    ? `<p style="margin:0 0 16px;line-height:1.7;">${escapeHtml(input.collection.intro)}</p>`
    : "";
  const footer = footerHtml(input.footerQrImageUrl || "", input.footerCaption || "", mode, theme);
  const tail = `${footer}${brandHtml(brand, color(theme.muted, "#57534e"))}`;
  const batches = packBatches(cards, intro, tail, theme, layout);
  return { html: batches[0] || wrapArticle(intro + tail, theme, layout), batches, layout };
}

function packBatches(cards: string[], intro: string, tail: string, theme: PublishingTheme, layout: ArticleRenderResult["layout"]) {
  const batches: string[][] = [];
  let current: string[] = [];
  let size = intro.length + tail.length;
  for (const card of cards) {
    if (current.length && size + card.length > PUBLISHING_HTML_BUDGET) {
      batches.push(current);
      current = [];
      size = intro.length + tail.length;
    }
    current.push(card);
    size += card.length;
  }
  if (current.length || !batches.length) batches.push(current);
  return batches.map((group, index) => {
    const pageIntro = index === 0 ? intro : `<p style="margin:0 0 12px;">（续）${escapeHtml(String(index + 1))}</p>`;
    const pageTail = index === batches.length - 1 ? tail : "";
    return wrapArticle(pageIntro + group.join("") + pageTail, theme, layout);
  });
}
