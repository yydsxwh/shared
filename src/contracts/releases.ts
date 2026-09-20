/**
 * platform Releases API 契约：统一软件版本与安装包下载。
 *
 * 解决现状里安装包文件名写死、两个站点各维护一套下载逻辑的问题：
 * 发新版只在 platform 登记 Release + Asset，各站点查 latest 即可，
 * 不用再回去改前端里的 apk / exe 文件名。
 *
 * 安装包字节由 Storage 模块保管，这里只存版本元数据与 fileId 关联。
 */

import type { ProductPlatform } from "./catalog";

export const RELEASE_CHANNELS = ["STABLE", "BETA", "ALPHA"] as const;
export type ReleaseChannel = (typeof RELEASE_CHANNELS)[number];

export const RELEASE_STATUSES = ["DRAFT", "PUBLISHED", "REVOKED"] as const;
/** REVOKED=已撤回，latest 查询要跳过，但历史链接仍可解释 */
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const RELEASE_ARCHITECTURES = [
  "X64",
  "X86",
  "ARM64",
  "ARMV7",
  "UNIVERSAL",
] as const;
export type ReleaseArchitecture = (typeof RELEASE_ARCHITECTURES)[number];

export type ReleaseAsset = {
  assetId: string;
  /** 指向 Storage 里的对象；下载时换短期签名 URL */
  fileId: string;
  platform: ProductPlatform;
  architecture: ReleaseArchitecture;
  fileName: string;
  sizeBytes: number;
  /** 形如 `sha256:abc...`，供客户端校验完整性 */
  checksum: string | null;
  /** 供应商要求的额外标记，如 Android 的 versionCode */
  labels: Record<string, string>;
};

export type Release = {
  releaseId: string;
  /** 对应 CatalogProduct.releaseProductKey */
  productKey: string;
  /** 语义化版本，同一 productKey+channel 下唯一 */
  version: string;
  channel: ReleaseChannel;
  status: ReleaseStatus;
  /** 未发布时为 null */
  releasedAt: string | null;
  changelog: string;
  /** 低于此版本必须升级才能继续使用 */
  minimumUpgradeFrom: string | null;
  assets: ReleaseAsset[];
  createdAt: string;
  updatedAt: string;
};

export type ListReleasesQuery = {
  channel?: ReleaseChannel;
  platform?: ProductPlatform;
  status?: ReleaseStatus;
  limit?: number;
};

export type ListReleasesResponse = {
  releases: Release[];
};

export type GetReleaseResponse = {
  release: Release;
};

export type LatestReleaseQuery = {
  /** 默认 STABLE */
  channel?: ReleaseChannel;
  /** 带上后只返回有该端安装包的版本 */
  platform?: ProductPlatform;
  architecture?: ReleaseArchitecture;
};

/** 下载时才换签名链接，避免把长期可用的地址写进页面 */
export type ReleaseDownloadResponse = {
  releaseId: string;
  version: string;
  asset: ReleaseAsset;
  url: string;
  expiresAt: string;
};

export type CreateReleaseRequest = {
  productKey: string;
  version: string;
  channel: ReleaseChannel;
  changelog?: string;
  minimumUpgradeFrom?: string;
};

export type AddReleaseAssetRequest = {
  fileId: string;
  platform: ProductPlatform;
  architecture: ReleaseArchitecture;
  checksum?: string;
  labels?: Record<string, string>;
};

export type PublishReleaseRequest = {
  releasedAt?: string;
};
