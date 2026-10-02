/**
 * 产品后端调用 Platform 通知中心。
 * 只接受服务凭证。不要在浏览器包里构造这个客户端。
 */

import type {
  NotificationDeliveryView,
  NotificationProviderStatus,
  NotificationSendRequest,
} from "../contracts/notifications";
import type { PlatformHttpClient } from "./http";

export type NotificationProviderReport = {
  channel: "IN_APP" | "WECHAT_OFFICIAL_ACCOUNT" | "WECHAT_MINIPROGRAM_SUBSCRIBE" | "SMS";
  status: NotificationProviderStatus;
  detail: string | null;
};

export type NotificationStatusReport = {
  providers: NotificationProviderReport[];
  usage: { window: string; sent: number; failed: number };
  completion: Record<string, boolean | number | string | null>;
};

export type NotificationTestResult = {
  status: NotificationProviderStatus;
  detail: string | null;
  delivery: NotificationDeliveryView | null;
};

export class NotificationClient {
  constructor(private readonly http: PlatformHttpClient) {}

  send(input: NotificationSendRequest): Promise<{ deliveries: NotificationDeliveryView[] }> {
    return this.http.request("/v1/notifications/send", { method: "POST", json: input });
  }

  /** 只测当前登录站长自己的绑定，不接受任意手机号。 */
  testSend(input: {
    kind: "connect" | "send";
    channel: "WECHAT_OFFICIAL_ACCOUNT" | "WECHAT_MINIPROGRAM_SUBSCRIBE" | "SMS";
    recipientUserSub: string;
  }): Promise<NotificationTestResult> {
    return this.http.request("/v1/notifications/test", { method: "POST", json: input });
  }

  status(productId: string): Promise<NotificationStatusReport> {
    return this.http.request("/v1/notifications/providers/status", { query: { productId } });
  }

  exchangeMiniProgramCode(code: string): Promise<{ appId: string; openId: string; unionId: string | null }> {
    return this.http.request("/v1/notifications/wechat/miniprogram/code", { method: "POST", json: { code } });
  }
}
