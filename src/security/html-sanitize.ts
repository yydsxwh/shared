/**
 * 富文本只留下排版标签。脚本、事件属性和 javascript: 链接一律去掉。
 * 这是服务端兜底，不能代替浏览器自己的转义。
 */

const ALLOWED = new Set([
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "a",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "code",
  "pre",
]);

function safeHref(value: string): string | null {
  const href = value.trim();
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href) || href.startsWith("/")) {
    if (href.startsWith("//") || href.toLowerCase().includes("javascript:")) return null;
    return href;
  }
  return null;
}

export function sanitizeHtml(input: string): string {
  let html = input.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(/<\s*(script|iframe|object|embed|svg|style|link|meta|form|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  html = html.replace(/<\s*(script|iframe|object|embed|svg|style|link|meta|form|math)\b[^>]*\/?\s*>/gi, "");
  html = html.replace(/<\/?([a-zA-Z0-9:-]+)([^>]*)>/g, (full, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED.has(tag)) return "";
    if (full.startsWith("</")) return `</${tag}>`;
    if (tag === "br") return "<br>";
    if (tag === "a") {
      const match = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const href = safeHref(match?.[2] || match?.[3] || "");
      return href ? `<a href="${href.replace(/"/g, "")}" rel="noopener noreferrer">` : "<a>";
    }
    return `<${tag}>`;
  });
  return html;
}
