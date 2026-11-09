/**
 * 大陆备案和许可证只按精确主机名出示。
 * kemiao.net 的主体备案号不能因为同公司、同服务器或请求头里夹带域名就套到其他站点。
 * 当前状态来自用户材料和该域名公开页上的编号，还不是工信部备案详情的在线核验。
 */

export const CN_FILING_CHECK_PUBLIC_PAGE = "public-page-observed" as const;

export type CnFilingCheckStatus = typeof CN_FILING_CHECK_PUBLIC_PAGE;

export type CnFiling = {
  hosts: readonly string[];
  companyName: string;
  icpSubjectNo: string;
  icpUrl: string;
  telecomLicenseNo: string;
  checkStatus: CnFilingCheckStatus;
};

export const KEMIAO_NET_FILING: CnFiling = {
  hosts: ["kemiao.net", "www.kemiao.net"],
  companyName: "广东颗秒科技有限公司",
  icpSubjectNo: "粤ICP备2026137476号",
  icpUrl: "https://beian.miit.gov.cn/",
  telecomLicenseNo: "粤B2-20264235",
  checkStatus: CN_FILING_CHECK_PUBLIC_PAGE,
};

const FILINGS: readonly CnFiling[] = [KEMIAO_NET_FILING];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** 只接受主机名或「主机名:端口」。带协议、路径、用户信息的值一律没有备案。 */
export function normalizeFilingHost(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  let host = input.trim().toLowerCase();
  if (!host || host.length > 253) return null;
  if (/[\s/@\\?#]|:\/\//.test(host)) return null;
  if (host.endsWith(".")) host = host.slice(0, -1);
  const colon = host.lastIndexOf(":");
  if (colon !== -1) {
    const port = host.slice(colon + 1);
    if (!/^\d{1,5}$/.test(port)) return null;
    const portNumber = Number(port);
    if (portNumber < 1 || portNumber > 65535) return null;
    host = host.slice(0, colon);
  }
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  if (host.startsWith(".") || host.endsWith(".") || host.includes("..")) return null;
  return host;
}

export function filingForHost(input: string | null | undefined): CnFiling | null {
  const host = normalizeFilingHost(input);
  if (!host) return null;
  return FILINGS.find((filing) => filing.hosts.includes(host)) ?? null;
}

export function renderFilingFooterHtml(input: string | null | undefined): string {
  const filing = filingForHost(input);
  if (!filing) return "";
  const company = escapeHtml(filing.companyName);
  const icpNo = escapeHtml(filing.icpSubjectNo);
  const licenseNo = escapeHtml(filing.telecomLicenseNo);
  const icpUrl = escapeHtml(filing.icpUrl);
  return [
    '<footer class="filing-footer">',
    `<p>版权所有：${company}</p>`,
    `<p><a href="${icpUrl}" rel="noopener noreferrer">${icpNo}</a></p>`,
    `<p>增值电信业务经营许可证：${licenseNo}</p>`,
    "</footer>",
  ].join("");
}

export function renderCompanyPreviewHtml(): string {
  const filing = KEMIAO_NET_FILING;
  const footer = renderFilingFooterHtml("www.kemiao.net");
  const company = escapeHtml(filing.companyName);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="filing-check" content="${filing.checkStatus}">
  <title>${company}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #1f2937;
      background: #f8fafc;
      line-height: 1.7;
    }
    .page { max-width: 40rem; margin: 0 auto; padding: 1.5rem 1.25rem 2rem; }
    h1 { font-size: 1.75rem; line-height: 1.3; margin: 0 0 0.75rem; }
    p { margin: 0.5rem 0; }
    .filing-footer {
      margin-top: 2.5rem;
      padding-top: 1rem;
      border-top: 1px solid #d6d3d1;
      font-size: 0.95rem;
    }
    .filing-footer a {
      color: #1d4ed8;
      display: inline-flex;
      align-items: center;
      min-height: 2.75rem;
    }
  </style>
</head>
<body>
  <main class="page">
    <h1>${company}</h1>
    <p>网站：kemiao.net</p>
    <p>经营业务：信息服务业务（仅限互联网信息服务）。</p>
    <p>许可范围不包含信息搜索查询服务，也不包含信息即时交互服务。</p>
    ${footer}
  </main>
</body>
</html>
`;
}
