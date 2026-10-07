/**
 * Cookie 会话的修改请求校验。
 *
 * OAuth 的 state 只保护授权回跳，不能当成全站 CSRF token。
 * 这里同时看 Origin / Sec-Fetch-Site，以及可选的双提交 token。
 * CSRF_ENFORCE 默认关闭，避免还没改完表单就把线上登录打断。
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CSRF_COOKIE_NAME = "yyds_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type CsrfDecision =
  | { ok: true }
  | { ok: false; status: 403; reason: "origin" | "fetch-site" | "token" };

function header(req: Request, name: string): string {
  return (req.headers.get(name) || "").trim();
}

export function csrfEnforceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CSRF_ENFORCE === "true" || env.CSRF_ENFORCE === "1";
}

export function isAllowedMutationOrigin(origin: string, allowed: readonly string[]): boolean {
  if (!origin) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password) return false;
  const normalized = parsed.origin;
  return allowed.some((item) => {
    try {
      return new URL(item).origin === normalized;
    } catch {
      return item === normalized;
    }
  });
}

export function signCsrfToken(secret: string, sessionId = ""): string {
  const nonce = randomBytes(18).toString("base64url");
  const mac = createHmac("sha256", secret).update(`${sessionId}.${nonce}`).digest("base64url");
  return `${nonce}.${mac}`;
}

export function verifyCsrfToken(secret: string, token: string, sessionId = ""): boolean {
  const [nonce, mac] = token.split(".");
  if (!nonce || !mac) return false;
  const expected = createHmac("sha256", secret).update(`${sessionId}.${nonce}`).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function readCookie(headerValue: string | null, name: string): string {
  if (!headerValue) return "";
  for (const part of headerValue.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

/**
 * 有 Origin 就只接受白名单。没有 Origin 时，Sec-Fetch-Site=cross-site 也拒绝。
 * token 校验只在 CSRF_ENFORCE 打开时强制，避免旧表单突然全部 403。
 */
export function checkCookieMutation(input: {
  method: string;
  origin: string;
  secFetchSite: string;
  allowedOrigins: readonly string[];
  enforceToken: boolean;
  headerToken: string;
  cookieToken: string;
  secret: string;
  sessionId?: string;
}): CsrfDecision {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return { ok: true };
  if (input.origin) {
    if (!isAllowedMutationOrigin(input.origin, input.allowedOrigins)) {
      return { ok: false, status: 403, reason: "origin" };
    }
  } else if (input.secFetchSite.toLowerCase() === "cross-site") {
    return { ok: false, status: 403, reason: "fetch-site" };
  }
  if (!input.enforceToken) return { ok: true };
  if (
    !input.headerToken ||
    input.headerToken !== input.cookieToken ||
    !verifyCsrfToken(input.secret, input.headerToken, input.sessionId || "")
  ) {
    return { ok: false, status: 403, reason: "token" };
  }
  return { ok: true };
}

export function checkRequestCsrf(
  req: Request,
  input: { allowedOrigins: readonly string[]; secret: string; sessionId?: string; env?: NodeJS.ProcessEnv },
): CsrfDecision {
  return checkCookieMutation({
    method: req.method,
    origin: header(req, "origin"),
    secFetchSite: header(req, "sec-fetch-site"),
    allowedOrigins: input.allowedOrigins,
    enforceToken: csrfEnforceEnabled(input.env),
    headerToken: header(req, CSRF_HEADER_NAME),
    cookieToken: readCookie(req.headers.get("cookie"), CSRF_COOKIE_NAME),
    secret: input.secret,
    sessionId: input.sessionId,
  });
}
