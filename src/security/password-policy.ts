/**
 * 新密码规则：要够长，也要能放下密码管理器生成的长密码。
 * 不因为缺少特殊字符而拒绝。登录校验不能 trim，否则尾部空格会被悄悄吃掉。
 *
 * bcrypt 只使用前 72 字节。更长的密码要等 Argon2id 落地后才有完整强度。
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyResult = { ok: true } | { ok: false; error: string };

export function checkNewPassword(password: string): PasswordPolicyResult {
  if (password !== password.trim() && password.trim().length === 0) {
    return { ok: false, error: "密码不能为空" };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `密码至少 ${PASSWORD_MIN_LENGTH} 位` };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, error: `密码不能超过 ${PASSWORD_MAX_LENGTH} 位` };
  }
  return { ok: true };
}

/** 登录只拒绝空密码，不 trim，也不在这里套新密码长度。 */
export function passwordForLogin(password: string): string {
  return password;
}
