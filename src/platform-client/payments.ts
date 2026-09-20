/** platform Payments 客户端 */

import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  GetPaymentResponse,
  PaymentIntent,
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
}
