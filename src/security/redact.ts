/**
 * 日志脱敏。只保留字段名和长度，不保留密码、令牌、验证码和证件号。
 */

const SENSITIVE_KEY = /(pass(word)?|secret|token|authorization|cookie|api[-_]?key|sms|code|credential|private|idnumber|id_number)/i;

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.length === 0) return "";
    return `[redacted:${value.length}]`;
  }
  if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (typeof value === "object") return redactRecord(value as Record<string, unknown>);
  return "[redacted]";
}

export function redactRecord(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = SENSITIVE_KEY.test(key) ? redactValue(value) : value;
  }
  return output;
}

export function redactText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(/(password|client_secret|access_token|refresh_token|api[_-]?key)=([^&\s]+)/gi, "$1=[redacted]");
}
