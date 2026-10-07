/** Pure configuration contract. Credentials are server-only. */
export const AI_PROVIDER_IDS = ['openai', 'anthropic', 'qwen', 'custom'] as const;
export type AiProviderId = typeof AI_PROVIDER_IDS[number];
export const AI_PROVIDER_LABELS: Record<AiProviderId, string> = { openai: 'OpenAI', anthropic: 'Anthropic Claude', qwen: '阿里云百炼 / Qwen', custom: '自定义 OpenAI-Compatible' };
export const AI_BASE_URLS: Record<AiProviderId, string> = { openai: 'https://api.openai.com/v1', anthropic: 'https://api.anthropic.com/v1', qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1', custom: '' };
export interface AiConnection { provider: AiProviderId; baseUrl: string; apiKey: string; model: string; fallbackModel: string; timeoutMs: number; maxRetries: number }
export function isAiProvider(value: unknown): value is AiProviderId { return AI_PROVIDER_IDS.includes(value as AiProviderId); }
export function emptyConnection(provider: AiProviderId): AiConnection { return { provider, baseUrl: AI_BASE_URLS[provider], apiKey: '', model: '', fallbackModel: '', timeoutMs: 45000, maxRetries: 1 }; }
export function maskedConnection(value: AiConnection): AiConnection { return { ...value, apiKey: value.apiKey ? '********' : '' }; }
export function mergeConnection(current: AiConnection, patch: Partial<AiConnection>): AiConnection {
  const next = { ...current, ...patch, provider: current.provider };
  if (!patch.apiKey || /^[*•]+/.test(patch.apiKey)) next.apiKey = current.apiKey;
  if (typeof next.baseUrl !== 'string' || typeof next.model !== 'string' || typeof next.apiKey !== 'string' || typeof next.fallbackModel !== 'string') throw new Error('配置格式错误');
  next.baseUrl = next.baseUrl.trim().replace(/\/+$/, '');
  if (next.baseUrl) { const url = new URL(next.baseUrl); if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Base URL 必须为无凭据的 HTTPS 地址'); }
  for (const key of ['model', 'fallbackModel'] as const) { next[key] = next[key].trim(); if (next[key].length > 160) throw new Error('模型名过长'); }
  if (next.apiKey.length > 2000) throw new Error('密钥过长');
  if (!Number.isInteger(next.timeoutMs) || next.timeoutMs < 3000 || next.timeoutMs > 120000 || !Number.isInteger(next.maxRetries) || next.maxRetries < 0 || next.maxRetries > 2) throw new Error('超时或重试范围错误');
  return next;
}
export function inferAiProvider(baseUrl: string): AiProviderId { if (/anthropic\.com/.test(baseUrl)) return 'anthropic'; if (/dashscope/.test(baseUrl)) return 'qwen'; if (!baseUrl || /api\.openai\.com/.test(baseUrl)) return 'openai'; return 'custom'; }
export interface AiMoveInput { fen: string; sideToMove: string; legalMoves: readonly string[]; recentNotation: readonly string[]; maxOutputTokens: number; reasoningEffort?: string; model?: string }
export interface AiMoveAnswer { ucci: string | null; reason: string; provider: AiProviderId; model: string; requestId: string; usage: { inputTokens: number; outputTokens: number; reasoningTokens: number }; calls: number; usageComplete?: boolean }
