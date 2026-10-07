/** Server-side adapters; never import this module in a browser component. */
import type { AiConnection, AiMoveInput, AiMoveAnswer } from './providers';
const schema = { type: 'object', additionalProperties: false, properties: { ucci: { type: 'string' }, reason: { type: 'string' } }, required: ['ucci', 'reason'] };
type Content = { type?: string; text?: string };
type Json = { output?: Array<{ content?: Content[] }>; content?: Content[]; choices?: Array<{ message?: { content?: string } }>; usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number; output_tokens_details?: { reasoning_tokens?: number; thinking_tokens?: number }; completion_tokens_details?: { reasoning_tokens?: number } } };
export class AiProviderError extends Error { constructor(readonly status: number) { super(`AI 服务请求失败（${status || '连接或响应异常'}）`); } }
export interface AiProviderAdapter { generateStructuredMove(config: AiConnection, input: AiMoveInput): Promise<AiMoveAnswer>; testConnection(config: AiConnection): Promise<AiMoveAnswer> }
abstract class Adapter implements AiProviderAdapter {
  constructor(protected readonly transport: typeof fetch = fetch) {}
  protected abstract wire(config: AiConnection, input: AiMoveInput, prompt: string): { path: string; headers: Record<string, string>; body: Record<string, unknown> };
  protected abstract read(payload: Json): { value: unknown; input: number; output: number; reasoning: number };
  async generateStructuredMove(config: AiConnection, input: AiMoveInput): Promise<AiMoveAnswer> {
    const prompt = `你是中国象棋引擎。只从合法列表选择一步 UCCI，reason 用二十个字以内中文。返回 JSON。\n行棋方：${input.sideToMove}\nFEN：${input.fen}\n合法着法：${input.legalMoves.join(' ')}\n近期棋谱：${input.recentNotation.join(' ')}`;
    const wire = this.wire(config, input, prompt);
    let payload: Json;
    try {
      const response = await this.transport(`${config.baseUrl}${wire.path}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(config.timeoutMs), headers: { 'Content-Type': 'application/json', ...wire.headers }, body: JSON.stringify(wire.body) });
      if (!response.ok) throw new AiProviderError(response.status);
      payload = await response.json() as Json;
    } catch (error) { if (error instanceof AiProviderError) throw error; throw new AiProviderError(0); }
    const result = this.read(payload);
    let value: { ucci?: unknown; reason?: unknown } = {};
    try { value = typeof result.value === 'string' ? JSON.parse(result.value) : result.value as typeof value; } catch { /* Illegal output still carries billable usage. */ }
    const count = (v: number) => Number.isFinite(v) && v >= 0 ? Math.round(v) : 0;
    return { ucci: typeof value?.ucci === 'string' && input.legalMoves.includes(value.ucci) ? value.ucci : null, reason: typeof value?.reason === 'string' ? value.reason.slice(0, 80).split(config.apiKey).join('[redacted]') : '', provider: config.provider, model: config.model, requestId: '', usage: { inputTokens: count(result.input), outputTokens: count(result.output), reasoningTokens: count(result.reasoning) }, calls: 1 };
  }
  testConnection(config: AiConnection) { return this.generateStructuredMove(config, { fen: 'connection-test', sideToMove: 'red', legalMoves: ['a0a1'], recentNotation: [], maxOutputTokens: 256 }); }
}
export class OpenAIAdapter extends Adapter {
  protected wire(c: AiConnection, i: AiMoveInput, prompt: string) { return { path: '/responses', headers: { Authorization: `Bearer ${c.apiKey}` }, body: { model: c.model, input: prompt, max_output_tokens: i.maxOutputTokens, ...(i.reasoningEffort && i.reasoningEffort !== 'auto' ? { reasoning: { effort: i.reasoningEffort } } : {}), text: { format: { type: 'json_schema', name: 'xiangqi_move', strict: true, schema } } } }; }
  protected read(p: Json) { return { value: (p.output ?? []).flatMap((x) => x.content ?? []).filter((x) => x.type === 'output_text').map((x) => x.text).join(''), input: Number(p.usage?.input_tokens), output: Number(p.usage?.output_tokens), reasoning: Number(p.usage?.output_tokens_details?.reasoning_tokens ?? 0) }; }
}
export class AnthropicAdapter extends Adapter {
  protected wire(c: AiConnection, i: AiMoveInput, prompt: string) { return { path: '/messages', headers: { 'x-api-key': c.apiKey, 'anthropic-version': '2023-06-01' }, body: { model: c.model, max_tokens: i.maxOutputTokens, messages: [{ role: 'user', content: prompt }], output_config: { ...(i.reasoningEffort && i.reasoningEffort !== 'auto' ? { effort: i.reasoningEffort } : {}), format: { type: 'json_schema', schema } } } }; }
  protected read(p: Json) { return { value: (p.content ?? []).filter((x) => x.type === 'text').map((x) => x.text).join(''), input: Number(p.usage?.input_tokens ?? 0) + Number(p.usage?.cache_read_input_tokens ?? 0) + Number(p.usage?.cache_creation_input_tokens ?? 0), output: Number(p.usage?.output_tokens), reasoning: Number(p.usage?.output_tokens_details?.thinking_tokens ?? 0) }; }
}
export class QwenOpenAICompatibleAdapter extends Adapter {
  protected wire(c: AiConnection, i: AiMoveInput, prompt: string) { return { path: '/chat/completions', headers: { Authorization: `Bearer ${c.apiKey}` }, body: { model: c.model, max_tokens: i.maxOutputTokens, messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } } }; }
  protected read(p: Json) { return { value: p.choices?.[0]?.message?.content, input: Number(p.usage?.prompt_tokens), output: Number(p.usage?.completion_tokens), reasoning: Number(p.usage?.completion_tokens_details?.reasoning_tokens ?? 0) }; }
}
export function aiAdapter(provider: AiConnection['provider'], transport?: typeof fetch): AiProviderAdapter { return provider === 'openai' ? new OpenAIAdapter(transport) : provider === 'anthropic' ? new AnthropicAdapter(transport) : new QwenOpenAICompatibleAdapter(transport); }
