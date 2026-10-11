/** platform Payments 客户端 */

import type {
  CollectionCheckoutRequest,
  CollectionCheckoutResponse,
  CollectionEntry,
  CreateCollectionEntryRequest,
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentResponse,
  PaymentAuditRecord,
  PaymentChannelStatus,
  PaymentFulfillmentEnvelope,
  PaymentIntent,
  PaymentListQuery,
  PaymentListResponse,
  PaymentSummary,
  PublicCollectionEntry,
  PublicPaymentView,
  RefundRecord,
  RefundRequest,
} from "../contracts/payments";
import type { PlatformHttpClient } from "./http";

export class PaymentClient {
  constructor(private readonly http: PlatformHttpClient) {}

  /**
   * 创建支付。按 clientOrderNo 幂等：同一订单重复调用返回原支付单，
   * 不会重复下单，前端重试是安全的。
   */
  createPayment(input: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    return this.http.request("/payments", { method: "POST", json: input });
  }

  async getPayment(paymentId: string): Promise<PaymentIntent> {
    const res = await this.http.request<GetPaymentResponse>(
      `/payments/${encodeURIComponent(paymentId)}`,
    );
    return res.payment;
  }

  /** 用产品自己的订单号反查，避免产品侧还要额外存 paymentId */
  async getPaymentByOrderNo(clientOrderNo: string): Promise<PaymentIntent | null> {
    try {
      const res = await this.http.request<GetPaymentResponse>("/payments/by-order-no", {
        query: { clientOrderNo },
      });
      return res.payment;
    } catch (error) {
      if ((error as { code?: string })?.code === "NOT_FOUND") return null;
      throw error;
    }
  }

  refund(paymentId: string, input: RefundRequest): Promise<RefundRecord> {
    return this.http.request(
      `/payments/${encodeURIComponent(paymentId)}/refunds`,
      { method: "POST", json: input },
    );
  }

  /** 向渠道查单并在金额一致时补偿落账。不接受调用方声明的“已付款”。 */
  syncPayment(paymentId: string): Promise<{ payment: PaymentIntent }> {
    return this.http.request(`/payments/${encodeURIComponent(paymentId)}/sync`, {
      method: "POST",
    });
  }

  listPayments(query: PaymentListQuery = {}): Promise<PaymentListResponse> {
    return this.http.request("/payments", { query: compactQuery(query) });
  }

  summary(query: Pick<PaymentListQuery, "from" | "to" | "entryId"> = {}): Promise<PaymentSummary> {
    return this.http.request("/payments/summary", { query: compactQuery(query) });
  }

  channels(): Promise<{ channels: PaymentChannelStatus[] }> {
    return this.http.request("/payment-channels");
  }

  createCollectionEntry(input: CreateCollectionEntryRequest): Promise<{ entry: CollectionEntry }> {
    return this.http.request("/collection-entries", { method: "POST", json: input });
  }

  listCollectionEntries(query: { status?: string; cursor?: string; limit?: number } = {}): Promise<{
    entries: CollectionEntry[];
    nextCursor: string | null;
  }> {
    return this.http.request("/collection-entries", { query: compactQuery(query) });
  }

  getCollectionEntry(entryId: string): Promise<{ entry: CollectionEntry }> {
    return this.http.request(`/collection-entries/${encodeURIComponent(entryId)}`);
  }

  /** 公众页用。只返回付款需要的字段。 */
  getPublicCollectionEntry(publicToken: string): Promise<{ entry: PublicCollectionEntry }> {
    return this.http.request(
      `/collection-entries/by-token/${encodeURIComponent(publicToken)}`,
    );
  }

  disableCollectionEntry(entryId: string): Promise<{ entry: CollectionEntry }> {
    return this.http.request(
      `/collection-entries/${encodeURIComponent(entryId)}/disable`,
      { method: "POST" },
    );
  }

  checkoutCollection(input: CollectionCheckoutRequest): Promise<CollectionCheckoutResponse> {
    return this.http.request("/collection-entries/checkout", {
      method: "POST",
      json: input,
    });
  }

  /**
   * 用创建时发下的 claim 查这一笔。claim 不对时与订单不存在是同一种响应。
   */
  getPublicPayment(paymentId: string, claim: string): Promise<{ payment: PublicPaymentView }> {
    return this.http.request(`/payments/${encodeURIComponent(paymentId)}/public-view`, {
      headers: { "x-payment-claim": claim },
    });
  }

  listAudits(query: { cursor?: string; limit?: number } = {}): Promise<{
    audits: PaymentAuditRecord[];
    nextCursor: string | null;
  }> {
    return this.http.request("/payment-audits", { query: compactQuery(query) });
  }

  listFulfillmentEvents(limit = 20): Promise<{ events: PaymentFulfillmentEnvelope[] }> {
    return this.http.request("/payment-events", { query: { limit } });
  }

  ackFulfillmentEvent(eventId: string): Promise<{ ok: true }> {
    return this.http.request(`/payment-events/${encodeURIComponent(eventId)}/ack`, {
      method: "POST",
    });
  }

  /** 用授权 code 换 openid。code 与 app secret 都不进浏览器。 */
  exchangeWechatOpenId(code: string): Promise<{ openid: string }> {
    return this.http.request("/payments/wechat/openid", {
      method: "POST",
      json: { code },
    });
  }
}

function compactQuery(
  query: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number | boolean | undefined> {
  const out: Record<string, string | number | boolean | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    out[key] = value;
  }
  return out;
}
