/**
 * platform AI API 契约。
 *
 * 边界：platform 持有 Provider、Base URL、API Key、模型路由、限流与用量记录；
 * 产品只说「我要做什么用途、给这些消息」，**不得自己保存任何厂商 Key**。
 *
 * 目标架构：产品 → shared AI Client → platform AI API → Qwen / OpenAI / 其他模型。
 *
 * 接口按 OpenAI 兼容的 chat/completions 语义设计——现有调用方（一键翻译、
 * MathCode 视觉识别）都是这个形状，迁移不需要改提示词与消息结构。
 */

/** 用途标识：platform 据此决定用哪个 provider 与模型，产品不必关心型号 */
export const AI_PURPOSES = [
  /** 正文一键翻译等纯文本任务 */
  "translate",
  /** 截图 / PDF 转 LaTeX 等视觉任务，必须路由到带视觉能力的模型 */
  "vision-ocr",
  /** 摘要、改写等通用文本任务 */
  "general",
] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

export type AiTextPart = { type: "text"; text: string };
export type AiImagePart = { type: "image_url"; image_url: { url: string } };
export type AiContentPart = AiTextPart | AiImagePart;

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  /** 纯文本用 string；多模态用 parts 数组 */
  content: string | AiContentPart[];
};

export type AiChatRequest = {
  /** 用途；与 model 二选一，两个都给时 model 优先 */
  purpose?: AiPurpose;
  /**
   * 指定模型，形如 `provider/model`（如 `dashscope/qwen-vl-max`）。
   * 只在产品确实要钉死型号时用，否则交给 purpose 路由，换模型不必改产品代码。
   */
  model?: string;
  messages: AiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** 上限受 platform 侧配置约束 */
  timeoutMs?: number;
  /** 便于在用量统计里按业务维度归类，不参与路由 */
  metadata?: Record<string, string>;
};

export type AiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** 百万分之一元；provider 未配置单价时为 null */
  costMicros: number | null;
};

export type AiChatResponse = {
  /** 与 platform 日志对账用 */
  requestId: string;
  /** 实际使用的 `provider/model`，可能与请求不同（走了 fallback） */
  model: string;
  provider: string;
  content: string;
  usage: AiUsage;
  latencyMs: number;
  /** true 表示首选 provider 失败后由备选完成 */
  fallbackUsed: boolean;
};

// ---------------------------------------------------------------------------
// 管理面（Studio 用）
// ---------------------------------------------------------------------------

export type AiProviderHealth = "HEALTHY" | "DEGRADED" | "UNCONFIGURED";

/**
 * Provider 的**非敏感**视图。
 * 永远不包含 API Key：只说明有没有配、从哪个环境变量读，供 Studio 展示与排查。
 */
export type AiProviderStatus = {
  providerId: string;
  label: string;
  baseUrl: string;
  /** 只报有无，不报值 */
  hasApiKey: boolean;
  /** Key 来自哪个环境变量名，便于运维定位，不含值 */
  apiKeyEnvName: string;
  models: Array<{
    id: string;
    vision: boolean;
    costPerMillionInputMicros: number | null;
    costPerMillionOutputMicros: number | null;
  }>;
  health: AiProviderHealth;
  /** 连续失败次数，达到阈值后在有备选时被跳过 */
  consecutiveFailures: number;
  lastErrorAt: string | null;
};

export type ListAiProvidersResponse = {
  providers: AiProviderStatus[];
};

export type AiRouteStatus = {
  purpose: AiPurpose;
  /** 按顺序尝试；第一个不可用时自动往后走 */
  candidates: string[];
  resolved: string | null;
};

export type ListAiRoutesResponse = {
  routes: AiRouteStatus[];
  defaultModel: string | null;
};

export type AiUsageBucket = {
  clientId: string;
  purpose: string;
  provider: string;
  model: string;
  calls: number;
  failedCalls: number;
  promptTokens: number;
  completionTokens: number;
  costMicros: number;
};

export type AiUsageSummaryResponse = {
  from: string;
  to: string;
  buckets: AiUsageBucket[];
  totals: {
    calls: number;
    failedCalls: number;
    totalTokens: number;
    costMicros: number;
  };
};
