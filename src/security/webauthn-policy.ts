/**
 * Passkey 的站点约束和一次性 challenge。
 * 正式域名必须是 HTTPS。localhost 只给开发用。
 * 签名校验交给 @simplewebauthn/server，这里不自己解析认证器报文。
 */

import { randomBytes } from "node:crypto";

export type WebAuthnChallenge = {
  id: string;
  challenge: string;
  expiresAt: number;
  used: boolean;
};

export function createWebAuthnChallenge(now = Date.now(), ttlMs = 5 * 60 * 1000): WebAuthnChallenge {
  return {
    id: randomBytes(16).toString("base64url"),
    challenge: randomBytes(32).toString("base64url"),
    expiresAt: now + ttlMs,
    used: false,
  };
}

export function consumeWebAuthnChallenge(
  stored: WebAuthnChallenge | null,
  presented: string,
  now = Date.now(),
): { ok: true; challenge: WebAuthnChallenge } | { ok: false; reason: string } {
  if (!stored) return { ok: false, reason: "missing" };
  if (stored.used) return { ok: false, reason: "replay" };
  if (stored.expiresAt <= now) return { ok: false, reason: "expired" };
  if (stored.challenge !== presented) return { ok: false, reason: "mismatch" };
  return { ok: true, challenge: { ...stored, used: true } };
}

export function webAuthnRelyingParty(input: {
  origin: string;
  configuredRpId?: string;
}): { ok: true; rpId: string; origin: string } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(input.origin);
  } catch {
    return { ok: false, reason: "origin" };
  }
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1";
  if (url.protocol !== "https:" && !local) return { ok: false, reason: "https" };
  const rpId = (input.configuredRpId || host).toLowerCase();
  if (rpId !== host && !host.endsWith(`.${rpId}`)) return { ok: false, reason: "rp-id" };
  return { ok: true, rpId, origin: url.origin };
}
