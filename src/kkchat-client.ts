/**
 * 产品后端调用 KKChat。
 * 服务凭证只放在调用方服务器上。浏览器不要构造这个客户端。
 */

import type { ProductId } from "./contracts/config";

export type KkchatMessageType = "TEXT" | "SYSTEM" | "ACTION_CARD";

export type KkchatProfile = {
  displayName?: string;
  kkNumber?: number | null;
  username?: string | null;
  avatarUrl?: string;
};

export type KkchatDirectInput = {
  senderSub: string;
  recipientSub: string;
  businessType?: string | null;
  businessRefId?: string | null;
  senderProfile?: KkchatProfile;
  recipientProfile?: KkchatProfile;
};

export type KkchatSendInput = {
  senderSub: string;
  recipientSub?: string;
  conversationId?: string;
  body: string;
  messageType?: KkchatMessageType;
  businessType?: string | null;
  businessRefId?: string | null;
  idempotencyKey: string;
  senderProfile?: KkchatProfile;
  recipientProfile?: KkchatProfile;
  /**
   * 兼容旧调用。KKChat 自己按未读周期决定要不要发微信，
   * 产品不要靠这个开关绕过未读合并。
   */
  notifyWechat?: boolean;
  senderName?: string;
};

export type KkchatConversationRef = {
  conversationId: string;
  href: string;
  url: string;
};

export type KkchatSendResult = KkchatConversationRef & {
  duplicate: boolean;
  wechatPlanned?: number;
};

export type KkchatGroupInput = {
  creatorSub: string;
  title: string;
  memberSubs: string[];
  businessType: string;
  businessRefId: string;
  profiles?: Array<KkchatProfile & { accountSub: string }>;
};

export type KkchatAnnouncementInput = {
  senderSub: string;
  conversationId: string;
  body: string;
  courseName: string;
  idempotencyKey: string;
  senderName?: string;
};

export function conversationHref(conversationId: string) {
  return `/app/conversations/${encodeURIComponent(conversationId)}`;
}

/** 浏览器可打开的地址。未配置时用规划中的正式域名。 */
export function kkchatPublicOrigin(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.KKCHAT_URL || env.NEXT_PUBLIC_KKCHAT_URL || "https://kkchat.yydsxwh.com";
  return configured.replace(/\/$/, "");
}

export class KkchatClient {
  constructor(
    private readonly options: {
      baseUrl: string;
      serviceToken: string;
      sourceProduct: ProductId;
      fetchImpl?: typeof fetch;
    },
  ) {
    if (!options.baseUrl.trim()) throw new Error("KKChat 地址未配置");
    if (!options.serviceToken.trim()) throw new Error("KKChat 服务凭证未配置");
  }

  ensureDirect(input: KkchatDirectInput): Promise<KkchatConversationRef> {
    return this.request("/api/service/direct", { method: "POST", json: input });
  }

  sendMessage(input: KkchatSendInput): Promise<KkchatSendResult> {
    return this.request("/api/service/messages", { method: "POST", json: input });
  }

  ensureGroup(input: KkchatGroupInput): Promise<KkchatConversationRef> {
    return this.request("/api/service/groups", { method: "POST", json: input });
  }

  sendAnnouncement(input: KkchatAnnouncementInput): Promise<KkchatSendResult> {
    return this.request("/api/service/announcements", { method: "POST", json: input });
  }

  unread(accountSub: string): Promise<{ accountSub: string; count: number }> {
    return this.request("/api/service/unread", { method: "GET", query: { accountSub } });
  }

  private async request<T>(path: string, init: { method: string; json?: unknown; query?: Record<string, string> }): Promise<T> {
    const url = new URL(`${this.options.baseUrl.replace(/\/$/, "")}${path}`);
    for (const [key, value] of Object.entries(init.query || {})) url.searchParams.set(key, value);
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.options.serviceToken}`,
      "x-kkchat-product": this.options.sourceProduct,
      accept: "application/json",
    };
    if (init.json !== undefined) headers["content-type"] = "application/json";
    const response = await (this.options.fetchImpl || fetch)(url, {
      method: init.method,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) throw new Error(payload.error || `KKChat ${response.status}`);
    return payload;
  }
}

/** 没配地址或凭证时返回 null，让产品界面显示「未配置」而不是抛到页面上。 */
export function kkchatClientFromEnv(sourceProduct: ProductId, env: NodeJS.ProcessEnv = process.env) {
  const baseUrl = env.KKCHAT_INTERNAL_URL || env.KKCHAT_URL || "";
  const serviceToken = env.KKCHAT_SERVICE_TOKEN || "";
  if (!baseUrl.trim() || !serviceToken.trim()) return null;
  return new KkchatClient({ baseUrl, serviceToken, sourceProduct });
}
