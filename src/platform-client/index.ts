/**
 * platform 客户端入口。
 *
 * 产品侧只做一件事：从服务端环境变量组装一次 client，然后调方法。
 * serviceToken 绝不能出现在浏览器包里——只在服务端（Route Handler、
 * Server Component、脚本）构造本客户端。
 */

import { PlatformHttpClient, type PlatformClientOptions } from "./http";
import { CatalogClient } from "./catalog";
import { PaymentClient } from "./payments";
import { ReleaseClient } from "./releases";
import { StorageClient } from "./storage";

export { PlatformApiError, PlatformHttpClient } from "./http";
export type { PlatformClientOptions, RequestOptions } from "./http";
export { CatalogClient } from "./catalog";
export { PaymentClient } from "./payments";
export { ReleaseClient } from "./releases";
export { StorageClient } from "./storage";

export type PlatformClient = {
  http: PlatformHttpClient;
  storage: StorageClient;
  catalog: CatalogClient;
  releases: ReleaseClient;
  payments: PaymentClient;
  /** 派生一个代表指定用户的客户端，避免请求间共享 actor 造成串号 */
  withActor(actorId: string | null): PlatformClient;
};

export function createPlatformClient(
  options: PlatformClientOptions,
): PlatformClient {
  return fromHttp(new PlatformHttpClient(options), options);
}

function fromHttp(
  http: PlatformHttpClient,
  options: PlatformClientOptions,
): PlatformClient {
  return {
    http,
    storage: new StorageClient(http),
    catalog: new CatalogClient(http),
    releases: new ReleaseClient(http),
    payments: new PaymentClient(http),
    withActor: (actorId) =>
      fromHttp(http.withActor(actorId), { ...options, actorId }),
  };
}
