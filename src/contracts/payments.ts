/**
 * platform Payments API 契约：只管「钱怎么付」。
 *
 * 边界：platform 负责发起支付、对接渠道、验签回调、幂等落账，然后给产品一个
 * 明确的履约结果；产品收到结果后执行自己的业务（MathCode 加额度、课程开通、
 * 优惠券与分销结算等），platform 不碰这些。
 *
 * 回调一律不信客户端：只认渠道验签通过的服务端通知，且按 providerEventId 幂等。
 */

export const PAYMENT_PROVIDERS = ["WECHAT", "ALIPAY", "MOCK"] as const;
/** MOCK 只用于本地与测试环境，生产必须显式关闭 */
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/** 微信支付形态：扫码 / 微信内 / 手机浏览器 */
export const PAYMENT_METHODS = ["NATIVE", "JSAPI", "H5", "PAGE", "WAP"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "CREATED",
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type PaymentIntent = {
  paymentId: string;
  /** 调用方自己的订单号；同一 clientId 下唯一，重复创建返回原单 */
  clientOrderNo: string;
  clientId: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  /** 分，整数 */
  amountCents: number;
  currency: "CNY";
  subject: string;
  status: PaymentStatus;
  /** 付款人业务身份 */
  payerId: string | null;
  /** 渠道侧交易号，支付成功后才有 */
  providerTransactionId: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  /** 回传给产品用于履约的上下文，platform 原样保存不解释 */
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

/** 按 method 不同，前端需要的调起参数不同 */
export type PaymentAction =
  | { kind: "QR_CODE"; codeUrl: string }
  | { kind: "REDIRECT"; url: string }
  | { kind: "JSAPI_PARAMS"; params: Record<string, string> }
  | { kind: "FORM"; html: string }
  | { kind: "NONE" };

export type CreatePaymentRequest = {
  clientOrderNo: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  amountCents: number;
  subject: string;
  payerId?: string;
  /** 微信 JSAPI 必填 */
  payerOpenId?: string;
  /** 支付完成后回跳的产品页面 */
  returnUrl?: string;
  expiresInSeconds?: number;
  metadata?: Record<string, string>;
};

export type CreatePaymentResponse = {
  payment: PaymentIntent;
  action: PaymentAction;
};

export type GetPaymentResponse = {
  payment: PaymentIntent;
};

export type RefundRequest = {
  /** 同一 paymentId 下唯一，用于退款幂等 */
  clientRefundNo: string;
  amountCents: number;
  reason?: string;
};

export type RefundRecord = {
  refundId: string;
  paymentId: string;
  clientRefundNo: string;
  amountCents: number;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
};

/**
 * 支付成功后 platform 通知产品的履约事件。
 *
 * 产品侧处理必须幂等：同一 eventId 重复送达要当作一次。
 * 只有 platform 验签通过的渠道回调才会产生本事件。
 */
export type PaymentFulfillmentEvent = {
  eventId: string;
  type: "payment.succeeded" | "payment.refunded" | "payment.failed";
  occurredAt: string;
  payment: PaymentIntent;
};

export const PAYMENT_WEBHOOK_SIGNATURE_HEADER = "x-platform-signature";
export const PAYMENT_WEBHOOK_TIMESTAMP_HEADER = "x-platform-timestamp";

/** 超过这个偏移的回调视为重放，直接拒 */
export const PAYMENT_WEBHOOK_MAX_SKEW_SECONDS = 300;
