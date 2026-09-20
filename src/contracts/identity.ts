/**
 * Platform 用户身份契约：Verified User Context。
 *
 * Account 已是公司正式 Identity Provider（OIDC / OAuth / 全局 `usr_*` sub）。
 * Platform **不**再实现第二套账号，也不直接信任浏览器传来的用户头。
 *
 * 当前可落地的信任链：
 *
 * ```
 * Browser / App
 *   → Product Backend（验证产品 Session / OIDC）
 *   → Platform（只验证 Service Identity）
 *   → 再接受该可信后端传递的用户上下文
 * ```
 *
 * `X-Platform-Actor` 仅在 Bearer 服务凭证已通过后才有意义。
 * 浏览器直接带 `X-Platform-Actor: usr_别人` 且没有服务凭证，必须被拒绝。
 *
 * 长期扩展点（本文件只定义，**不实现**校验器，避免再造一套 OAuth）：
 * - account 签发的短期 user assertion
 * - 可信产品后端签名的短期 JWT
 * - 标准 token exchange
 *
 * Owner 已拍板公开标识（2026-09-20）：
 * issuer / JWKS URL / Platform audience。这些是资源标识，不是 Secret。
 * Discovery 是否真返回这些值、JWKS 行为、aud 兼容性：
 * `NEEDS_ACCOUNT_INTEGRATION`（要打开 account 仓库联调，不要猜源码）。
 */

/** Account 站点根。Owner 拍板，已上线 */
export const ACCOUNT_PUBLIC_ORIGIN = "https://account.yydsxwh.com";

/** OIDC issuer。Owner 拍板 */
export const ACCOUNT_ISSUER = "https://account.yydsxwh.com";

/**
 * JWKS URL。Owner 拍板的正式定义。
 * 该 URL 现在是否按标准返回密钥：`NEEDS_ACCOUNT_INTEGRATION`。
 */
export const ACCOUNT_JWKS_URI =
  "https://account.yydsxwh.com/.well-known/jwks.json";

/** Platform 预发。Owner 拍板。DNS/TLS 是否已挂上：仍要运维执行 */
export const PLATFORM_STAGING_ORIGIN = "https://api-staging.yydsxwh.com";

/** Platform 生产资源标识。Owner 拍板。当前五模块仍是 NOT_DEPLOYED */
export const PLATFORM_PRODUCTION_ORIGIN = "https://api.yydsxwh.com";

/**
 * Platform 作为资源服务器的 audience。
 * 用生产资源标识，不要把 andyyyds / softwarelist / rishi 的 client_id 当成 aud。
 * 预发域名不同，长期身份模型仍用这个 aud。
 */
export const PLATFORM_RESOURCE_AUDIENCE = "https://api.yydsxwh.com";

/** 兼容头：由**已通过服务认证**的产品后端传递最终用户标识 */
export const PLATFORM_ACTOR_HEADER = "x-platform-actor";

/**
 * 预留：短期 user assertion（JWT）。
 * 本轮 platform 不验签、不要求调用方发送。头名称先冻结，避免以后再改一次。
 */
export const PLATFORM_USER_ASSERTION_HEADER = "x-platform-user-assertion";

export type UserContextSource =
  | "trusted-service"
  | "account-assertion"
  | "product-assertion";

/**
 * 经过可信路径之后，platform 模块看到的用户上下文。
 * 当前实现来源只有 `trusted-service`（服务 token 通过后的 Actor 头）。
 */
export type VerifiedUserContext = {
  /** account 全局 sub（`usr_…`）；产品尚未接 OIDC 时可能仍是站点本地 user id */
  sub: string;
  source: UserContextSource;
  clientId: string;
  issuedAt?: number;
  expiresAt?: number;
};

/** 尚未验签的 assertion 载荷形状；校验器属于 platform，本轮不实现 */
export type UserAssertionEnvelope = {
  header: typeof PLATFORM_USER_ASSERTION_HEADER;
  token: string;
  format: "account-jwt" | "product-jwt";
};

/**
 * platform 校验 account assertion 时的配置形状。
 * 公开 URL 可用上面的常量作默认；验签实现仍是
 * `NEEDS_ACCOUNT_INTEGRATION`，本轮不写校验器。
 */
export type AccountIntegrationConfig = {
  issuer: string;
  jwksUri: string;
  /** 必须是 Platform 资源标识，不是产品 client_id */
  audience: string | string[];
  clockSkewSec?: number;
};

export const ACCOUNT_INTEGRATION_DEFAULTS: AccountIntegrationConfig = {
  issuer: ACCOUNT_ISSUER,
  jwksUri: ACCOUNT_JWKS_URI,
  audience: PLATFORM_RESOURCE_AUDIENCE,
};

export const ACCOUNT_INTEGRATION_REQUIREMENTS = [
  "issuer",
  "jwks",
  "sub",
  "audience",
  "service-or-user-assertion-policy",
] as const;

export type AccountIntegrationRequirement =
  (typeof ACCOUNT_INTEGRATION_REQUIREMENTS)[number];
