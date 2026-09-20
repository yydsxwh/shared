/**
 * platform API 的调用底座：统一 URL 拼接、认证头、错误模型与超时。
 *
 * 各产品不要自己写 fetch 字符串，否则错误处理与版本升级会散落到每个仓库。
 * 本文件只做传输，不含任何密钥默认值：serviceToken 必须由调用方从服务端环境注入。
 */

import {
  isPlatformErrorBody,
  type PlatformErrorBody,
  type PlatformErrorCode,
} from "../contracts/error";
import {
  PLATFORM_ACTOR_HEADER,
  PLATFORM_API_VERSION,
  PLATFORM_CLIENT_HEADER,
  PLATFORM_REQUEST_ID_HEADER,
} from "../contracts/version";

export class PlatformApiError extends Error {
  readonly code: PlatformErrorCode;
  readonly status: number;
  readonly requestId: string | null;
  readonly details: Record<string, unknown> | undefined;

  constructor(input: {
    code: PlatformErrorCode;
    message: string;
    status: number;
    requestId?: string | null;
    details?: Record<string, unknown>;
  }) {
    super(input.message);
    this.name = "PlatformApiError";
    this.code = input.code;
    this.status = input.status;
    this.requestId = input.requestId ?? null;
    this.details = input.details;
  }
}

export type PlatformClientOptions = {
  /** platform 服务地址，如 https://platform.yydsxwh.com */
  baseUrl: string;
  /** 服务间凭证，只能来自服务端环境变量 */
  serviceToken: string;
  /** 调用方标识，platform 用它做配额与审计 */
  clientId: string;
  /**
   * 代表哪个最终用户发起；服务端后台任务可不填。
   * 只能由**已验证产品 Session 的后端**填写，禁止从浏览器原样转发未校验的用户 id。
   */
  actorId?: string | null;
  timeoutMs?: number;
  /** 便于测试注入；默认用全局 fetch */
  fetch?: typeof fetch;
};

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** JSON 请求体；与 body 二选一 */
  json?: unknown;
  /** 原始请求体，用于 multipart 代传 */
  body?: BodyInit;
  query?: Record<string, string | number | boolean | undefined>;
  /** 覆盖本次请求的用户身份 */
  actorId?: string | null;
  requestId?: string;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 15_000;

export class PlatformHttpClient {
  private readonly options: PlatformClientOptions;

  constructor(options: PlatformClientOptions) {
    if (!options.baseUrl) throw new Error("platform baseUrl 未配置");
    if (!options.serviceToken) throw new Error("platform serviceToken 未配置");
    this.options = options;
  }

  get actorId(): string | null {
    return this.options.actorId ?? null;
  }

  /** 派生一个代表指定用户的客户端，避免在请求间共享 actor 造成串号 */
  withActor(actorId: string | null): PlatformHttpClient {
    return new PlatformHttpClient({ ...this.options, actorId });
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const doFetch = this.options.fetch ?? globalThis.fetch;
    const url = this.buildUrl(path, options.query);

    const headers: Record<string, string> = {
      authorization: `Bearer ${this.options.serviceToken}`,
      [PLATFORM_CLIENT_HEADER]: this.options.clientId,
      accept: "application/json",
    };
    const actor = options.actorId !== undefined ? options.actorId : this.actorId;
    if (actor) headers[PLATFORM_ACTOR_HEADER] = actor;
    if (options.requestId) headers[PLATFORM_REQUEST_ID_HEADER] = options.requestId;

    let body = options.body;
    if (options.json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(options.json);
    }

    const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer = new AbortController();
    const timeout = setTimeout(() => timer.abort(), timeoutMs);
    // 调用方自己的取消信号也要能中断请求
    options.signal?.addEventListener("abort", () => timer.abort(), { once: true });

    let response: Response;
    try {
      response = await doFetch(url, {
        method: options.method ?? "GET",
        headers,
        body,
        signal: timer.signal,
      });
    } catch (cause) {
      throw new PlatformApiError({
        code: "PROVIDER_UNAVAILABLE",
        message: `platform 请求失败：${(cause as Error)?.message || "network error"}`,
        status: 0,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    const parsed = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      throw toPlatformApiError(parsed, response.status, text);
    }
    return parsed as T;
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const base = this.options.baseUrl.replace(/\/+$/, "");
    const suffix = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${base}/${PLATFORM_API_VERSION}${suffix}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
    return url.toString();
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toPlatformApiError(
  parsed: unknown,
  status: number,
  rawText: string,
): PlatformApiError {
  if (isPlatformErrorBody(parsed)) {
    const body = parsed as PlatformErrorBody;
    return new PlatformApiError({
      code: body.error.code,
      message: body.error.message,
      status,
      requestId: body.requestId,
      details: body.error.details,
    });
  }
  // 反代 502、网关超时等拿不到 platform 错误体，按状态码归一
  return new PlatformApiError({
    code: status >= 500 ? "PROVIDER_UNAVAILABLE" : "INTERNAL",
    message: rawText.slice(0, 200) || `platform 返回 ${status}`,
    status,
  });
}
