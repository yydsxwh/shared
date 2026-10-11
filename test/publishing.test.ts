import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_WECHAT_CAPABILITY,
  assertCollectionExportable,
  canonicalPublishingJson,
  parsePublishingCollection,
  type PublishableContent,
  type PublishingCollection,
} from "../src/contracts/publishing";
import { renderWechatArticle } from "../src/publishing/html";
import { canonicalPublicUrl, qrTargetsFor } from "../src/publishing/targets";

function item(id: string, overrides: Partial<PublishableContent> = {}): PublishableContent {
  return {
    ref: { product: "forum", sourceType: "post", sourceId: id, sourceVersion: "1" },
    title: `帖子 ${id}`,
    summary: "摘要",
    bodyBlocks: [{ kind: "paragraph", text: "正文" }],
    images: [],
    publicWebUrl: `https://www.yydsxwh.com/forum/uibe/p/${id}`,
    publicVisibility: "PUBLIC",
    allowExport: true,
    commentCount: 3,
    tags: ["校园"],
    displayDate: "2026-10-11",
    authorName: "同学",
    ...overrides,
  };
}

function collection(items: PublishableContent[], title = "校园精选"): PublishingCollection {
  return {
    title,
    digest: "本周公开帖",
    intro: "纵向排列，每篇自己滑动。",
    items,
    layoutVersion: 1,
    templateKey: "forum-wall",
    presetKey: "forum-digest",
  };
}

test("keeps each post in its own card and its own qr image", () => {
  const items = [item("a"), item("b"), item("c")];
  const qr = [
    "https://mmbiz.qpic.cn/a.png",
    "https://mmbiz.qpic.cn/b.png",
    "https://mmbiz.qpic.cn/c.png",
  ];
  const rendered = renderWechatArticle({
    collection: collection(items),
    qrImageUrls: qr,
    capability: DEFAULT_WECHAT_CAPABILITY,
    mode: "wechat",
  });
  assert.equal(rendered.layout, "swipe-with-fallback");
  assert.equal(rendered.batches.length, 1);
  const html = rendered.html;
  const a = html.indexOf('data-source-id="a"');
  const b = html.indexOf('data-source-id="b"');
  const c = html.indexOf('data-source-id="c"');
  assert.ok(a >= 0 && a < b && b < c);
  assert.equal(html.split("https://mmbiz.qpic.cn/a.png").length - 1, 1);
  assert.equal(html.split("https://mmbiz.qpic.cn/b.png").length - 1, 1);
  assert.match(html, /左滑看二维码/);
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /<script/i);
  assert.match(html, /<img src="https:\/\/mmbiz\.qpic\.cn\/a\.png"/);
});

test("renders 20 and 50 posts vertically and splits oversized articles", () => {
  for (const count of [20, 50]) {
    const items = Array.from({ length: count }, (_, index) => item(`p${index}`));
    const rendered = renderWechatArticle({
      collection: collection(items),
      qrImageUrls: items.map((_, index) => `https://mmbiz.qpic.cn/${index}.png`),
      mode: "wechat",
    });
    assert.equal(rendered.html.match(/data-card="item"/g)?.length, count > 0 ? rendered.batches[0]!.match(/data-card="item"/g)?.length : 0);
    const total = rendered.batches.reduce((sum, batch) => sum + (batch.match(/data-card="item"/g)?.length ?? 0), 0);
    assert.equal(total, count);
  }
  const huge = item("long", { summary: "很长".repeat(400), bodyBlocks: [{ kind: "paragraph", text: "段落".repeat(400) }] });
  const many = [huge, huge && item("next")].filter(Boolean) as PublishableContent[];
  const split = renderWechatArticle({
    collection: collection([
      item("long", { summary: "甲".repeat(500), bodyBlocks: [{ kind: "paragraph", text: "乙".repeat(800) }] }),
      item("next", { summary: "丙".repeat(500), bodyBlocks: [{ kind: "paragraph", text: "丁".repeat(800) }] }),
    ]),
    qrImageUrls: ["https://mmbiz.qpic.cn/1.png", "https://mmbiz.qpic.cn/2.png"],
    mode: "wechat",
  });
  assert.ok(split.batches.length >= 1);
  assert.ok(split.batches.every((batch) => batch.length < 20_000));
});

test("shows a real link only after external-link capability is confirmed", () => {
  const rendered = renderWechatArticle({
    collection: collection([item("a")]),
    qrImageUrls: ["https://mmbiz.qpic.cn/a.png"],
    capability: { ...DEFAULT_WECHAT_CAPABILITY, canUseExternalArticleLink: "yes", canLinkMiniProgram: "yes" },
    mode: "wechat",
  });
  assert.match(rendered.html, /<a href="https:\/\/www\.yydsxwh\.com\/forum\/uibe\/p\/a">查看原帖及评论<\/a>/);
  const withMini = renderWechatArticle({
    collection: collection([item("a", { miniProgram: { appId: "wx1234567890abcdef", path: "pages/post/index?id=a" } })]),
    qrImageUrls: ["https://mmbiz.qpic.cn/a.png"],
    capability: { ...DEFAULT_WECHAT_CAPABILITY, canLinkMiniProgram: "yes" },
    mode: "wechat",
  });
  assert.match(withMini.html, /小程序入口尚未接入/);
  assert.doesNotMatch(withMini.html, /pages\/post/);
  assert.doesNotMatch(withMini.html, /<mp-miniprogram/);
  const hidden = renderWechatArticle({
    collection: collection([item("a", { miniProgram: { appId: "wx1234567890abcdef", path: "pages/post/index?id=a" } })]),
    qrImageUrls: ["https://mmbiz.qpic.cn/a.png"],
    mode: "wechat",
  });
  assert.doesNotMatch(hidden.html, /pages\/post/);
  assert.match(hidden.html, /请长按本篇二维码/);
});

test("stacks cards and drops the swipe hint when phones cannot keep the gesture", () => {
  const rendered = renderWechatArticle({
    collection: collection([item("a")]),
    qrImageUrls: ["https://mmbiz.qpic.cn/a.png"],
    capability: { ...DEFAULT_WECHAT_CAPABILITY, swipePreserved: "no" },
    mode: "wechat",
  });
  assert.equal(rendered.layout, "stacked");
  assert.doesNotMatch(rendered.html, /左滑/);
  assert.match(rendered.html, /长按二维码进入原帖/);
  assert.match(rendered.html, /<img src="https:\/\/mmbiz\.qpic\.cn\/a\.png"/);
});

test("escapes text, keeps traditional chinese, and omits a missing comment count", () => {
  const rendered = renderWechatArticle({
    collection: collection([
      item("a", {
        title: "標題 <script>",
        summary: "繁體「引號」& 符号",
        commentCount: null,
        bodyBlocks: [{ kind: "paragraph", text: "第一段\n第二段" }],
        images: [{ url: "https://evil.example/qr.png", alt: "作者上传的码" }],
      }),
    ]),
    qrImageUrls: ["https://mmbiz.qpic.cn/nav.png"],
    mode: "wechat",
  });
  assert.match(rendered.html, /標題 &lt;script&gt;/);
  assert.match(rendered.html, /繁體「引號」&amp; 符号/);
  assert.doesNotMatch(rendered.html, /条评论/);
  assert.match(rendered.html, /第一段/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.doesNotMatch(rendered.html, /evil\.example/);
  assert.match(rendered.html, /https:\/\/mmbiz\.qpic\.cn\/nav\.png/);
  const droppedCdn = renderWechatArticle({
    collection: collection([
      item("cdn", { bodyBlocks: [{ kind: "image", url: "https://cdn.yydsxwh.com/private.png?access_token=abc", alt: "签名图" }] }),
    ]),
    qrImageUrls: ["https://mmbiz.qpic.cn/nav.png"],
    mode: "wechat",
  });
  assert.doesNotMatch(droppedCdn.html, /cdn\.yydsxwh\.com/);
  assert.doesNotMatch(droppedCdn.html, /access_token/);
  const preview = renderWechatArticle({
    collection: collection([
      item("a", { images: [{ url: "https://cdn.yydsxwh.com/post.png", alt: "配图" }], bodyBlocks: [{ kind: "image", url: "https://cdn.yydsxwh.com/post.png", alt: "作者上传的码" }] }),
    ]),
    qrImageUrls: ["https://mmbiz.qpic.cn/nav.png"],
    mode: "preview",
  });
  assert.match(preview.html, /cdn\.yydsxwh\.com\/post\.png/);
  assert.match(preview.html, /mmbiz\.qpic\.cn\/nav\.png/);
  assert.notEqual(
    preview.html.indexOf("cdn.yydsxwh.com/post.png"),
    preview.html.indexOf("mmbiz.qpic.cn/nav.png"),
  );
});

test("rejects private, paid, homepage and shared qr targets", () => {
  const parsed = parsePublishingCollection(collection([
    item("a", { publicVisibility: "PRIVATE", allowExport: true }),
  ]));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const blocked = assertCollectionExportable(parsed.value);
  assert.equal(blocked.ok, false);
  const paid = assertCollectionExportable(collection([item("a", { publicVisibility: "PAID" })]));
  assert.equal(paid.ok, false);
  assert.equal(canonicalPublicUrl("https://www.yydsxwh.com/").ok, false);
  assert.equal(canonicalPublicUrl("https://evil.example/forum/uibe/p/a").ok, false);
  const cleaned = canonicalPublicUrl("https://www.yydsxwh.com/forum/uibe/p/a?token=secret&access_token=abc&ok=1");
  assert.equal(cleaned.ok, true);
  if (cleaned.ok) {
    assert.equal(cleaned.url.includes("token"), false);
    assert.match(cleaned.url, /ok=1/);
  }
  const dup = qrTargetsFor([
    item("a", { publicWebUrl: "https://www.yydsxwh.com/forum/uibe/p/same" }),
    item("b", { publicWebUrl: "https://www.yydsxwh.com/forum/uibe/p/same?token=1" }),
  ]);
  assert.equal(dup.ok, false);
  const distinct = qrTargetsFor([item("a"), item("b")]);
  assert.equal(distinct.ok, true);
  assert.equal(distinct.targets?.length, 2);
  assert.notEqual(distinct.targets?.[0]?.publicWebUrl, distinct.targets?.[1]?.publicWebUrl);
});

test("canonical json ignores qr bytes and stays stable", () => {
  const left = canonicalPublishingJson(collection([item("a")]));
  const right = canonicalPublishingJson(collection([item("a")]));
  assert.equal(left, right);
  assert.equal(left.includes("mmbiz"), false);
});
