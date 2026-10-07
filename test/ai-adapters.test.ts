import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aiAdapter } from '../src/ai/adapters';
import { emptyConnection, maskedConnection, mergeConnection, AI_PROVIDER_IDS } from '../src/ai/providers';
const input = { fen: 'test', sideToMove: 'red', legalMoves: ['a0a1'], recentNotation: [], maxOutputTokens: 800, reasoningEffort: 'high' };
for (const provider of AI_PROVIDER_IDS) test(`${provider}: correct wire protocol, legal move and usage`, async () => {
  const config = { ...emptyConnection(provider), baseUrl: 'https://provider.test/v1', apiKey: 'test-private-key', model: 'test-model' };
  const fetcher: typeof fetch = async (url, init) => {
    const body = JSON.parse(String(init?.body)); const headers = new Headers(init?.headers);
    assert.equal(body.model, 'test-model');
    assert.equal(init?.redirect, 'error');
    if (provider === 'anthropic') {
      assert.equal(String(url), 'https://provider.test/v1/messages'); assert.equal(headers.get('x-api-key'), config.apiKey); assert.equal(headers.get('authorization'), null); assert.equal(headers.get('anthropic-version'), '2023-06-01'); assert.equal(body.output_config.format.type, 'json_schema');
      return Response.json({ content: [{ type: 'text', text: '{"ucci":"a0a1","reason":"前进"}' }], usage: { input_tokens: 10, output_tokens: 3 } });
    }
    assert.equal(headers.get('authorization'), `Bearer ${config.apiKey}`);
    if (provider === 'openai') { assert.equal(String(url), 'https://provider.test/v1/responses'); assert.equal(body.text.format.strict, true); assert.equal(body.reasoning.effort, 'high'); return Response.json({ output: [{ content: [{ type: 'output_text', text: '{"ucci":"a0a1","reason":"前进"}' }] }], usage: { input_tokens: 10, output_tokens: 3 } }); }
    assert.equal(String(url), 'https://provider.test/v1/chat/completions'); assert.equal(body.response_format.type, 'json_object');
    return Response.json({ choices: [{ message: { content: '{"ucci":"a0a1","reason":"前进"}' } }], usage: { prompt_tokens: 10, completion_tokens: 3 } });
  };
  const result = await aiAdapter(provider, fetcher).generateStructuredMove(config, input);
  assert.equal(result.ucci, 'a0a1'); assert.equal(result.usage.inputTokens, 10); assert.equal(result.usage.outputTokens, 3); assert.ok(!JSON.stringify(result).includes(config.apiKey));
});
test('invalid JSON and illegal move retain usage, cannot execute', async () => {
  for (const content of ['garbage', '{"ucci":"a0a2"}']) {
    const response = await aiAdapter('qwen', async () => Response.json({ choices: [{ message: { content } }], usage: { prompt_tokens: 20, completion_tokens: 5 } })).generateStructuredMove({ ...emptyConnection('qwen'), apiKey: 'secret', model: 'model' }, input);
    assert.equal(response.ucci, null); assert.equal(response.usage.inputTokens, 20);
  }
});
test('error bodies never expose secret; mask and blank saves preserve key', async () => {
  const config = { ...emptyConnection('openai'), apiKey: 'test-secret', model: 'test-model' };
  const adapter = aiAdapter('openai', async () => new Response('test-secret', { status: 401 }));
  await assert.rejects(adapter.testConnection(config), error => !String(error).includes('test-secret'));
  assert.equal(mergeConnection(config, maskedConnection(config)).apiKey, config.apiKey);
  assert.equal(mergeConnection(config, { apiKey: '' }).apiKey, config.apiKey);
  assert.throws(() => mergeConnection(config, { baseUrl: 'http://unsafe.test' }));
});
