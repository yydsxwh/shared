/**
 * Observability 契约：字段先统一，集群以后再接。
 *
 * 本轮不部署 metrics / tracing / 错误聚合平台。
 * 实现侧先保证这些字段能被记录，采集时不用回头改每个调用点。
 */

export type PlatformLogLevel = "debug" | "info" | "warn" | "error";

export type PlatformErrorClass =
  | "CLIENT_ERROR"
  | "AUTH_ERROR"
  | "PROVIDER_ERROR"
  | "INTERNAL_ERROR";

export type PlatformRequestLog = {
  ts: string;
  level: PlatformLogLevel;
  service: "platform";
  module: string;
  message: string;
  requestId: string;
  clientId?: string | null;
  route?: string;
  durationMs?: number;
  result?: "ok" | "error";
  status?: number;
  errorCode?: string;
  errorClass?: PlatformErrorClass;
};

/**
 * 默认禁止写入日志的内容。
 * 实现用键名脱敏；调用方也不要把这些字段传进 logger。
 */
export const PLATFORM_LOG_REDACT_HINTS = [
  "secret",
  "token",
  "password",
  "authorization",
  "apiKey",
  "accessKey",
  "prompt",
  "reply",
  "cookie",
  "credential",
  "signature",
] as const;

/** 预留：以后接 metrics / tracing 时用的名字，现在不要为此建集群 */
export const PLATFORM_OBSERVABILITY_FUTURE = [
  "metrics",
  "distributed-tracing",
  "error-tracking",
] as const;
