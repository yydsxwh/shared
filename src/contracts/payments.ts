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

/**
 * 单笔支付金额硬边界（人民币分）。
 * 入口还可以再收紧，但不能放宽超过这里：0 与负数不是付款，过大金额先拦在我们这边。
 */
export const PAYMENT_AMOUNT_MIN_CENTS = 1;
export const PAYMENT_AMOUNT_MAX_CENTS = 50_000_000;

export function isBoundedAmountCents(
  value: unknown,
  min: number = PAYMENT_AMOUNT_MIN_CENTS,
  max: number = PAYMENT_AMOUNT_MAX_CENTS,
): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

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
  /** 由收款入口创建时才有；普通产品订单为空 */
  collectionEntryId: string | null;
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
  /** 支付完成后回跳的产品页面。必须落在服务端白名单域名内。 */
  returnUrl?: string;
  expiresInSeconds?: number;
  metadata?: Record<string, string>;
  /**
   * 微信 H5 需要付款人 IP。只由产品服务端填写，浏览器不要自己报。
   */
  clientIp?: string;
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
  /** 发起退款的登录用户；系统补偿可为空 */
  operatorId: string | null;
  /** 渠道退款单号，受理后才有 */
  providerRefundId: string | null;
  reason: string | null;
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

/**
 * 收款入口：一张长期码或一条固定金额链接。
 * 每次付款另开支付单，入口本身不是渠道交易号。
 */
export const COLLECTION_AMOUNT_MODES = ["OPEN", "FIXED"] as const;
export type CollectionAmountMode = (typeof COLLECTION_AMOUNT_MODES)[number];

export const COLLECTION_USAGE_MODES = ["SINGLE", "REUSABLE"] as const;
export type CollectionUsageMode = (typeof COLLECTION_USAGE_MODES)[number];

/** PAID 只用于单次入口已有成功支付；EXPIRED 由 expiresAt 推导，也可被写成状态 */
export const COLLECTION_STATUSES = ["ACTIVE", "DISABLED", "EXPIRED", "PAID"] as const;
export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

/** 公众收银台可选渠道。MOCK 永远不出现在这里。 */
export const PUBLIC_PAYMENT_PROVIDERS = ["WECHAT", "ALIPAY"] as const;
export type PublicPaymentProvider = (typeof PUBLIC_PAYMENT_PROVIDERS)[number];

export const PAYMENT_CHANNEL_READINESS = [
  "NOT_CONFIGURED",
  "DISABLED",
  "IMPLEMENTED",
  "UNVERIFIED",
] as const;
export type PaymentChannelReadiness = (typeof PAYMENT_CHANNEL_READINESS)[number];

export type PaymentChannelStatus = {
  provider: PaymentProvider;
  readiness: PaymentChannelReadiness;
  /** 当前进程实际允许下单的形态；未获批的产品不要列进来 */
  methods: PaymentMethod[];
  /** 真实商户交易是否已在生产验证。代码就绪不等于已验证。 */
  productionVerified: boolean;
  detail: string;
};

export type CollectionEntry = {
  entryId: string;
  clientId: string;
  publicToken: string;
  amountMode: CollectionAmountMode;
  usageMode: CollectionUsageMode;
  status: CollectionStatus;
  title: string;
  memo: string;
  payeeName: string;
  /** FIXED 时锁定；OPEN 时为空，由付款人在上下限内填写 */
  amountCents: number | null;
  minAmountCents: number;
  maxAmountCents: number;
  currency: "CNY";
  allowedProviders: PublicPaymentProvider[];
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 浏览器可见字段。不含 clientId、创建者、内部备注以外的运营信息。 */
export type PublicCollectionEntry = {
  publicToken: string;
  amountMode: CollectionAmountMode;
  usageMode: CollectionUsageMode;
  status: CollectionStatus;
  title: string;
  memo: string;
  payeeName: string;
  amountCents: number | null;
  minAmountCents: number;
  maxAmountCents: number;
  currency: "CNY";
  allowedProviders: PublicPaymentProvider[];
  /** 与商户已开通形态的交集，前端只能在这里面选 */
  availableMethods: Partial<Record<PublicPaymentProvider, PaymentMethod[]>>;
  expiresAt: string | null;
};

export type CreateCollectionEntryRequest = {
  amountMode: CollectionAmountMode;
  usageMode: CollectionUsageMode;
  title: string;
  memo?: string;
  payeeName: string;
  /** FIXED 必填，且客户端之后不能改价 */
  amountCents?: number;
  minAmountCents?: number;
  maxAmountCents?: number;
  allowedProviders?: PublicPaymentProvider[];
  expiresAt?: string | null;
};

export type CollectionCheckoutRequest = {
  publicToken: string;
  provider: PublicPaymentProvider;
  method: PaymentMethod;
  /** OPEN 必填；FIXED 若传入必须与锁定金额一致，否则拒绝 */
  amountCents?: number;
  payerNote?: string;
  /** 同一入口下的幂等键。重复提交返回原支付单，不会再向渠道下第二笔。 */
  idempotencyKey?: string;
  clientIp?: string;
  returnUrl?: string;
  /** 微信 JSAPI：必须是公众号网页授权拿到的 openid，不是账号中心用户 id */
  payerOpenId?: string;
};

export type PublicPaymentView = {
  paymentId: string;
  amountCents: number;
  currency: "CNY";
  provider: PaymentProvider;
  method: PaymentMethod;
  subject: string;
  status: PaymentStatus;
  expiresAt: string | null;
  paidAt: string | null;
};

export type CollectionCheckoutResponse = {
  payment: PublicPaymentView;
  action: PaymentAction;
  /**
   * 查询这一笔支付状态的凭证，只在首次创建时返回。
   * 不是服务 token，也看不了别的订单。
   */
  claim: string;
};

export type PaymentListQuery = {
  status?: PaymentStatus;
  provider?: PaymentProvider;
  entryId?: string;
  /** 订单号或支付单号，精确匹配 */
  q?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

export type PaymentListResponse = {
  payments: PaymentIntent[];
  nextCursor: string | null;
};

export type PaymentSummary = {
  currency: "CNY";
  count: number;
  succeededCount: number;
  succeededAmountCents: number;
  pendingRefundAmountCents: number;
  succeededRefundAmountCents: number;
};

export type PaymentAuditRecord = {
  auditId: string;
  action: string;
  actorId: string | null;
  targetType: string;
  targetId: string;
  detail: Record<string, string>;
  createdAt: string;
};

export type PaymentFulfillmentEnvelope = {
  event: PaymentFulfillmentEvent;
  timestamp: number;
  signature: string;
};
