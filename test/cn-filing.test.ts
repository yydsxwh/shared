import assert from "node:assert/strict";
import { test } from "node:test";

import {
  KEMIAO_NET_FILING,
  filingForHost,
  renderCompanyPreviewHtml,
  renderFilingFooterHtml,
} from "../src/legal/cn-filing";

test("kemiao.net 与 www 使用广东主体，ICP 和许可证分成两项", () => {
  for (const host of ["kemiao.net", "www.kemiao.net", "WWW.Kemiao.NET", "kemiao.net:443"]) {
    const filing = filingForHost(host);
    assert.ok(filing);
    assert.equal(filing.companyName, "广东颗秒科技有限公司");
    assert.equal(filing.icpSubjectNo, "粤ICP备2026137476号");
    assert.equal(filing.telecomLicenseNo, "粤B2-20264235");
    assert.notEqual(filing.icpSubjectNo, filing.telecomLicenseNo);
    assert.equal(filing.icpSubjectNo.endsWith("-1"), false);
  }
});

test("其他域名、后缀和伪造主机拿不到 kemiao.net 的备案号", () => {
  const rejected = [
    null,
    undefined,
    "",
    "yydsxwh.com",
    "www.yydsxwh.com",
    "account.yydsxwh.com",
    "xiaowenhua.net",
    "www.xiaowenhua.net",
    "kemiao.net.evil.example",
    "notkemiao.net",
    "evilkemiao.net",
    "kemiao.net.yydsxwh.com",
    "https://kemiao.net/",
    "kemiao.net/path",
    "user@kemiao.net",
    "0.0.0.0",
    "115.29.231.152",
    "47.250.154.77",
  ];
  for (const host of rejected) {
    assert.equal(filingForHost(host), null, `expected no filing for ${String(host)}`);
    const footer = renderFilingFooterHtml(host);
    assert.equal(footer.includes(KEMIAO_NET_FILING.icpSubjectNo), false);
    assert.equal(footer.includes(KEMIAO_NET_FILING.telecomLicenseNo), false);
  }
});

test("公司预览页只渲染 kemiao.net 页脚，并标明尚未完成备案详情核验", () => {
  const html = renderCompanyPreviewHtml();
  assert.match(html, /粤ICP备2026137476号/);
  assert.match(html, /粤B2-20264235/);
  assert.match(html, /https:\/\/beian\.miit\.gov\.cn\//);
  assert.match(html, /public-page-observed/);
  assert.equal(html.includes("粤ICP备2026137476号-1"), false);
  assert.equal(html.includes("yydsxwh.com"), false);
  assert.equal(html.includes("xiaowenhua.net"), false);
  assert.equal(html.includes(KEMIAO_NET_FILING.icpSubjectNo + KEMIAO_NET_FILING.telecomLicenseNo), false);
});
