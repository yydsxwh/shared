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
 * 现阶段是各站点自己的 user id；account 上线后换成全局 user sub，
 * 头名称不变，调用方无需再改一次。
 */
export const PLATFORM_ACTOR_HEADER = "x-platform-actor";

/** 便于把调用方日志与 platform 日志对上 */
export const PLATFORM_REQUEST_ID_HEADER = "x-request-id";
