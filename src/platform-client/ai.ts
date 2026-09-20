/**
 * platform AI 客户端。
 *
 * 产品只说用途和消息，不碰 Provider、Base URL、API Key。
 * 想换模型或换厂商时改 platform 配置即可，产品代码不动。
 */

import type {
  AiChatRequest,
  AiChatResponse,
  AiUsageSummaryResponse,
  ListAiProvidersResponse,
  ListAiRoutesResponse,
} from "../contracts/ai";
import type { PlatformHttpClient } from "./http";

export class AiClient {
  constructor(private readonly http: PlatformHttpClient) {}

  /**
   * 发起一次对话补全。
   * 超时、限流、fallback、用量记录都在 platform 侧完成，这里只管收结果。
   */
  chat(input: AiChatRequest): Promise<AiChatResponse> {
    return this.http.request("/ai/chat", { method: "POST", json: input });
  }

  /** 管理面：Provider 状态。返回值不含任何 Key，只报有没有配 */
  listProviders(): Promise<ListAiProvidersResponse> {
    return this.http.request("/ai/providers");
  }

  /** 管理面：用途 → 模型的路由表 */
  listRoutes(): Promise<ListAiRoutesResponse> {
    return this.http.request("/ai/routes");
  }

  /** 管理面：用量与成本统计 */
  getUsage(query: { from?: string; to?: string } = {}): Promise<AiUsageSummaryResponse> {
    return this.http.request("/ai/usage", {
      query: { from: query.from, to: query.to },
    });
  }
}
