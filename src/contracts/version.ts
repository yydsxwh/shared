/**
 * platform API 版本策略。
 *
 * 路径带版本号（`/v1/...`）。v1 内只做向后兼容的变更：可以加可选字段、加枚举值的
 * 消费端必须容忍未知值；不能删字段、不能改字段含义、不能把可选变必填。
 * 破坏性变更一律开 v2，v1 至少保留到所有调用方升级完成并在文档中标注下线时间。
 */

export const PLATFORM_API_VERSION = "v1" as const;

export type PlatformApiVersion = typeof PLATFORM_API_VERSION;

/** 调用方自报家门，便于 platform 侧统计与定位是谁在调 */
export const PLATFORM_CLIENT_HEADER = "x-platform-client";

/** 服务间认证：调用方（站点）的服务凭证 */
export const PLATFORM_SERVICE_TOKEN_HEADER = "authorization";

/**
 * 代表最终用户发起时带上的用户标识。
 *
 * **不能被浏览器直接信任。** 只有 Bearer 服务凭证验证通过后，
 * platform 才接受这个头（由产品后端在验过自己的 Session / OIDC 之后填写）。
 *
 * Account 已是正式 IdP。产品完成 OIDC 接入后，这里应传全局 `usr_*` sub；
 * 头名称不变。尚未接入的站点仍可能传本地 user id。
 *
 * 长期见 `contracts/identity` 的 Verified User Context / assertion 扩展点。
 */
export const PLATFORM_ACTOR_HEADER = "x-platform-actor";

/** 便于把调用方日志与 platform 日志对上 */
export const PLATFORM_REQUEST_ID_HEADER = "x-request-id";
