/**
 * 内容导出与公众号草稿客户端。
 * serviceToken 只在产品服务端持有。本客户端不会调用发表或群发接口。
 */

import type { ChannelCapability, ExportJobView, PublishingCollection } from "../contracts/publishing";
import type { PlatformHttpClient } from "./http";

export type PublishingStatus = {
  enabled: boolean;
  wechatConfigured: boolean;
  capability: ChannelCapability;
};

export type CreatePublishJobInput = {
  idempotencyKey: string;
  collection: PublishingCollection;
  capability?: ChannelCapability;
  /** 与 collection.items 一一对应的 PNG，base64，不含 data: 前缀。 */
  qrPngBase64: string[];
  footerQrPngBase64?: string;
  coverPngBase64?: string;
  force?: boolean;
};

export type PublishJobResponse = {
  job: ExportJobView;
  reused: boolean;
  /** 再次同步时为 true：微信侧会新增草稿，旧 media_id 仍在。 */
  createdAnotherDraft: boolean;
};

export class PublishingClient {
  constructor(private readonly http: PlatformHttpClient) {}

  status(): Promise<PublishingStatus> {
    return this.http.request<PublishingStatus>("/publishing/status");
  }

  createJob(input: CreatePublishJobInput): Promise<PublishJobResponse> {
    return this.http.request<PublishJobResponse>("/publishing/jobs", {
      method: "POST",
      json: input,
    });
  }

  getJob(id: string): Promise<{ job: ExportJobView }> {
    return this.http.request<{ job: ExportJobView }>(`/publishing/jobs/${encodeURIComponent(id)}`);
  }
}
