/** platform Catalog 客户端：公司产品目录的唯一读取入口 */

import type {
  CatalogProduct,
  GetCatalogProductResponse,
  ListCatalogQuery,
  ListCatalogResponse,
} from "../contracts/catalog";
import type { PlatformHttpClient } from "./http";

export class CatalogClient {
  constructor(private readonly http: PlatformHttpClient) {}

  async listProducts(query: ListCatalogQuery = {}): Promise<CatalogProduct[]> {
    const res = await this.http.request<ListCatalogResponse>("/catalog/products", {
      query: {
        status: query.status,
        platform: query.platform,
        includeUnlisted: query.includeUnlisted,
      },
    });
    return res.products;
  }

  /** productId 或 slug 都可以查 */
  async getProduct(idOrSlug: string): Promise<CatalogProduct> {
    const res = await this.http.request<GetCatalogProductResponse>(
      `/catalog/products/${encodeURIComponent(idOrSlug)}`,
    );
    return res.product;
  }
}
