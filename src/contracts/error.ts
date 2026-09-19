/**
 * platform API 的统一错误模型。
 *
 * 所有 platform 接口失败时都返回同一形状，调用方只需按 code 分支，
 * 不要去 match message 文案（message 面向人，随时可能改）。
 */

export const PLATFORM_ERROR_CODES = [
  /** 入参不合法：缺字段、格式错、枚举值不认识 */
  "INVALID_REQUEST",
  /** 没带凭证或凭证无效 */
  "UNAUTHENTICATED",
  /** 身份有效但无权操作该对象 */
  "PERMISSION_DENIED",
  /** 对象不存在，或存在但对调用方不可见 */
  "NOT_FOUND",
  /** 唯一键冲突 */
  "ALREADY_EXISTS",
  /** 状态不满足：如对未完成上传的文件取下载链接 */
  "FAILED_PRECONDITION",
  /** 超出该 namespace 的大小上限 */
  "PAYLOAD_TOO_LARGE",
  /** MIME 或扩展名不在白名单 */
  "UNSUPPORTED_MEDIA_TYPE",
  /** 触发限流 */
  "RATE_LIMITED",
  /** 下游供应商（OSS / 支付渠道）不可用 */
  "PROVIDER_UNAVAILABLE",
  /** 兜底：platform 内部错误 */
  "INTERNAL",
] as const;

export type PlatformErrorCode = (typeof PLATFORM_ERROR_CODES)[number];

export type PlatformErrorBody = {
  error: {
    code: PlatformErrorCode;
    message: string;
    /** 面向排查的补充字段，不参与控制流 */
    details?: Record<string, unknown>;
  };
  /** 便于把调用方日志和 platform 日志对上 */
  requestId: string;
};

/** 各错误码对应的 HTTP 状态；HTTP 状态只是传输层表现，判断一律用 code */
export const PLATFORM_ERROR_STATUS: Record<PlatformErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  FAILED_PRECONDITION: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function isPlatformErrorCode(value: string): value is PlatformErrorCode {
  return (PLATFORM_ERROR_CODES as readonly string[]).includes(value);
}

export function isPlatformErrorBody(value: unknown): value is PlatformErrorBody {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<PlatformErrorBody>;
  return Boolean(
    body.error &&
      typeof body.error === "object" &&
      typeof body.error.code === "string" &&
      isPlatformErrorCode(body.error.code),
  );
}
