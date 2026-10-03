/**
 * 高风险操作要求最近几分钟内重新验证过。
 * 这个标记和 OAuth state、CSRF token 不是一回事。
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const STEP_UP_COOKIE = "yyds_step_up";
export const STEP_UP_WINDOW_SEC = 10 * 60;

export function stepUpEnforceEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.STEP_UP_ENFORCE === "true" || env.STEP_UP_ENFORCE === "1";
}

export function signStepUp(input: { secret: string; userId: string; at?: number }): string {
  const at = input.at ?? Date.now();
  const mac = createHmac("sha256", input.secret).update(`${input.userId}.${at}`).digest("base64url");
  return `${at}.${mac}`;
}

export function stepUpIsFresh(input: {
  secret: string;
  userId: string;
  token: string;
  now?: number;
  windowSec?: number;
}): boolean {
  const [rawAt, mac] = input.token.split(".");
  if (!rawAt || !mac) return false;
  const at = Number(rawAt);
  if (!Number.isFinite(at)) return false;
  const expected = createHmac("sha256", input.secret).update(`${input.userId}.${at}`).digest("base64url");
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  const now = input.now ?? Date.now();
  const windowMs = (input.windowSec ?? STEP_UP_WINDOW_SEC) * 1000;
  return now >= at && now - at <= windowMs;
}
