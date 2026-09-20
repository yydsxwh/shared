/**
 * Platform 服务身份（Service Identity）。
 *
 * 与最终用户身份严格分开：
 * - Service Identity：产品后端持有的 `PLATFORM_SERVICE_TOKEN`
 * - End User Identity：仅在服务身份通过后，由该后端附带的用户上下文
 *
 * 每个产品 / 服务一把（可多把以便轮换）token。
 * 禁止全公司永久共用同一把：一把泄漏不应等于所有产品失守。
 *
 * 轮换：为同一 clientId 再登记一把新 token，切流量后再撤旧的。
 * 吊销：从 `PLATFORM_SERVICE_TOKENS` 去掉该 token 并重启进程。
 *
 * 日志与 API 响应禁止输出完整 token。
 */

export const PLATFORM_SERVICE_SCOPES = [
  "ai",
  "storage",
  "catalog",
  "releases",
  "payments",
] as const;

export type PlatformServiceScope = (typeof PLATFORM_SERVICE_SCOPES)[number];

export const PLATFORM_SERVICE_SCOPE_SET = new Set<string>(PLATFORM_SERVICE_SCOPES);

export function isPlatformServiceScope(value: string): value is PlatformServiceScope {
  return PLATFORM_SERVICE_SCOPE_SET.has(value);
}

/**
 * 解析 `ai+storage+catalog` 或 `*` / `all`。
 * 未写 scope 时表示当前五个已实现模块全部放开（向后兼容）。
 */
export function parseServiceScopes(raw: string | undefined): PlatformServiceScope[] {
  const text = raw?.trim();
  if (!text || text === "*" || text.toLowerCase() === "all") {
    return [...PLATFORM_SERVICE_SCOPES];
  }
  const parts = text.split("+").map((p) => p.trim().toLowerCase()).filter(Boolean);
  const scopes: PlatformServiceScope[] = [];
  for (const part of parts) {
    if (!isPlatformServiceScope(part)) {
      throw new Error(`未知的服务权限：${part}`);
    }
    if (!scopes.includes(part)) scopes.push(part);
  }
  if (scopes.length === 0) {
    throw new Error("服务权限列表不能为空");
  }
  return scopes;
}

export type ServiceIdentity = {
  clientId: string;
  scopes: readonly PlatformServiceScope[];
};

/** 凭证材料本身不得进入日志或管理面响应 */
export type ServiceCredential = ServiceIdentity & {
  token: string;
};
