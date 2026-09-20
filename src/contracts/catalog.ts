/**
 * platform Catalog API 契约：公司产品目录的唯一机器可读来源。
 *
 * 这里只放「这个产品是什么、在哪些端有、正式页面在哪」这类机器可读事实。
 * 营销文案、分类、卡片排版属于软件产品中心的运营内容，留在 softwarelist。
 */

export const PRODUCT_PLATFORMS = [
  "WEB",
  "WINDOWS",
  "MACOS",
  "LINUX",
  "ANDROID",
  "IOS",
  "HARMONYOS",
] as const;
export type ProductPlatform = (typeof PRODUCT_PLATFORMS)[number];

export const CATALOG_PRODUCT_STATUSES = [
  "PLANNED",
  "COMING_SOON",
  "BETA",
  "LIVE",
  "SUNSET",
] as const;
export type CatalogProductStatus = (typeof CATALOG_PRODUCT_STATUSES)[number];

export type CatalogProduct = {
  /** 稳定机器标识，一经发布不可改，跨系统引用都用它 */
  productId: string;
  /** URL 片段，可改；改了要留 redirect */
  slug: string;
  name: string;
  /** 一句话说明，供各端占位展示；正式文案以各站运营内容为准 */
  tagline: string;
  status: CatalogProductStatus;
  /** 网页版入口；纯客户端产品为 null */
  webUrl: string | null;
  iconUrl: string | null;
  supportedPlatforms: ProductPlatform[];
  /**
   * 对应 Releases 模块里的产品键。
   * 与 productId 分开：不是每个产品都发安装包。
   */
  releaseProductKey: string | null;
  /** 是否在公开目录中露出（内部工具设为 false） */
  listed: boolean;
  sortWeight: number;
  createdAt: string;
  updatedAt: string;
};

export type ListCatalogQuery = {
  status?: CatalogProductStatus;
  platform?: ProductPlatform;
  /** 默认只返回 listed=true */
  includeUnlisted?: boolean;
};

export type ListCatalogResponse = {
  products: CatalogProduct[];
};

export type GetCatalogProductResponse = {
  product: CatalogProduct;
};
