/**
 * 安全响应头。
 *
 * CSP 先用 Report-Only，避免一上线就把微信、地图、字体拦死。
 * HSTS 不带 includeSubDomains / preload，确认全部子域都是 HTTPS 之前不能加。
 */

export type HeaderPair = { key: string; value: string };

export function contentSecurityPolicyReportOnly(): string {
  const script = [
    "'self'",
    "https://res.wx.qq.com",
    "https://open.weixin.qq.com",
    "https://webapi.amap.com",
    "https://unpkg.com",
  ].join(" ");
  const connect = [
    "'self'",
    "https://account.yydsxwh.com",
    "https://www.yydsxwh.com",
    "https://api.weixin.qq.com",
    "https://restapi.amap.com",
  ].join(" ");
  return [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    `connect-src ${connect}`,
    "frame-src 'self' https://open.weixin.qq.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://account.yydsxwh.com",
  ].join("; ");
}

export function securityHeaders(env: NodeJS.ProcessEnv = process.env): HeaderPair[] {
  const headers: HeaderPair[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicyReportOnly() },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
  if (env.NODE_ENV === "production") {
    headers.push({ key: "Strict-Transport-Security", value: "max-age=15552000" });
  }
  return headers;
}
