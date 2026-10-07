/**
 * Have I Been Pwned 的区间接口：只提交 SHA-1 前 5 位，不提交原始密码。
 * 网络失败时按配置放行或拒绝，默认放行，避免公开接口抖动导致无法注册。
 */

import { createHash } from "node:crypto";

export type PwnedDecision = {
  breached: boolean;
  checked: boolean;
  failOpen: boolean;
};

export async function checkPwnedPassword(input: {
  password: string;
  enabled: boolean;
  failClosed?: boolean;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<PwnedDecision> {
  if (!input.enabled) return { breached: false, checked: false, failOpen: false };
  const digest = createHash("sha1").update(input.password).digest("hex").toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!response.ok) throw new Error(`hibp ${response.status}`);
    const body = await response.text();
    const breached = body.split(/\r?\n/).some((line) => line.split(":")[0]?.toUpperCase() === suffix);
    return { breached, checked: true, failOpen: false };
  } catch {
    if (input.failClosed) return { breached: true, checked: false, failOpen: false };
    return { breached: false, checked: false, failOpen: true };
  }
}

export function pwnedCheckEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PWNED_PASSWORD_CHECK_ENABLED === "true" || env.PWNED_PASSWORD_CHECK_ENABLED === "1";
}
