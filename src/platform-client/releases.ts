/** platform Releases 客户端：版本查询与安装包下载 */

import type {
  GetReleaseResponse,
  LatestReleaseQuery,
  ListReleasesQuery,
  ListReleasesResponse,
  Release,
  ReleaseArchitecture,
  ReleaseDownloadResponse,
} from "../contracts/releases";
import type { ProductPlatform } from "../contracts/catalog";
import type { PlatformHttpClient } from "./http";

export class ReleaseClient {
  constructor(private readonly http: PlatformHttpClient) {}

  async listReleases(
    productKey: string,
    query: ListReleasesQuery = {},
  ): Promise<Release[]> {
    const res = await this.http.request<ListReleasesResponse>(
      `/releases/${encodeURIComponent(productKey)}`,
      {
        query: {
          channel: query.channel,
          platform: query.platform,
          status: query.status,
          limit: query.limit,
        },
      },
    );
    return res.releases;
  }

  /** 没有符合条件的已发布版本时返回 null，调用方据此显示「准备中」 */
  async getLatest(
    productKey: string,
    query: LatestReleaseQuery = {},
  ): Promise<Release | null> {
    try {
      const res = await this.http.request<GetReleaseResponse>(
        `/releases/${encodeURIComponent(productKey)}/latest`,
        {
          query: {
            channel: query.channel,
            platform: query.platform,
            architecture: query.architecture,
          },
        },
      );
      return res.release;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async getVersion(productKey: string, version: string): Promise<Release | null> {
    try {
      const res = await this.http.request<GetReleaseResponse>(
        `/releases/${encodeURIComponent(productKey)}/${encodeURIComponent(version)}`,
      );
      return res.release;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  /** 换取短期下载链接；不要缓存返回的 URL */
  createDownload(input: {
    productKey: string;
    platform: ProductPlatform;
    architecture?: ReleaseArchitecture;
    /** 缺省取该 channel 的最新已发布版本 */
    version?: string;
    channel?: string;
  }): Promise<ReleaseDownloadResponse> {
    const version = input.version ?? "latest";
    return this.http.request(
      `/releases/${encodeURIComponent(input.productKey)}/${encodeURIComponent(version)}/download`,
      {
        method: "POST",
        json: {
          platform: input.platform,
          architecture: input.architecture,
          channel: input.channel,
        },
      },
    );
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "NOT_FOUND"
  );
}
