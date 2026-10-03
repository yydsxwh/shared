/**
 * 服务端代为请求 URL 之前的校验。
 *
 * 默认只允许 http/https，并且目标不能是本机、内网、链路本地或云元数据。
 * DNS 解析后还要再查一次 IP，避免域名先解析成公网、连接时改到内网。
 */

import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google",
]);

export type PublicUrlDecision =
  | { ok: true; url: URL }
  | { ok: false; reason: string };

export function ipIsBlocked(ip: string): boolean {
  const value = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!value || isIP(value) === 0) return true;
  if (value === "::1" || value === "0.0.0.0" || value === "::") return true;
  if (value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) return true;
  if (value.startsWith("::ffff:")) return ipIsBlocked(value.slice(7));

  const parts = value.split(".").map((item) => Number(item));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function validatePublicHttpUrl(raw: string): PublicUrlDecision {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "invalid-url" };
  }
  if (url.username || url.password) return { ok: false, reason: "userinfo" };
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "scheme" };
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    return { ok: false, reason: "host" };
  }
  if (isIP(host) && ipIsBlocked(host)) return { ok: false, reason: "ip" };
  return { ok: true, url };
}

export async function assertResolvedPublicUrl(
  raw: string,
  lookup: (hostname: string) => Promise<string[]>,
): Promise<PublicUrlDecision> {
  const parsed = validatePublicHttpUrl(raw);
  if (!parsed.ok) return parsed;
  if (isIP(parsed.url.hostname)) return parsed;
  let addresses: string[];
  try {
    addresses = await lookup(parsed.url.hostname);
  } catch {
    return { ok: false, reason: "dns" };
  }
  if (addresses.length === 0) return { ok: false, reason: "dns" };
  if (addresses.some((ip) => ipIsBlocked(ip))) return { ok: false, reason: "dns-rebinding" };
  return parsed;
}
