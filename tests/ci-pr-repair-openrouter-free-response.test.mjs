import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { extractAssistantText, requestFreePatch } =
  require('../scripts/ci-pr-repair-openrouter-free.cjs');

const MODEL = 'cohere/north-mini-code:free';
const catalog = {
  data: [{
    id: MODEL,
    pricing: { prompt: '0', completion: '0' },
    architecture: { input_modalities: ['text'], output_modalities: ['text'] }
  }]
};
function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) };
}

test('preserves a plain string completion', () => {
  assert.equal(extractAssistantText('diff --git a/a.js b/a.js'), 'diff --git a/a.js b/a.js');
});

test('normalizes OpenRouter structured text content blocks', () => {
  assert.equal(extractAssistantText([
    { type: 'text', text: 'diff --git a/a.js b/a.js\n' },
    { type: 'output_text', text: '@@ -1 +1 @@\n-old\n+new' }
  ]), 'diff --git a/a.js b/a.js\n\n@@ -1 +1 @@\n-old\n+new');
});

test('fails closed on refusal, non-text blocks, empty and oversized content', () => {
  assert.throws(() => extractAssistantText([{ type: 'refusal', text: 'not a patch' }]),
    /FREE_AI_OPENROUTER_MODEL_REFUSED/);
  assert.throws(() => extractAssistantText([{ type: 'image_url', image_url: {} }]),
    /FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID/);
  assert.throws(() => extractAssistantText([{ type: 'text', text: '  ' }]),
    /FREE_AI_OPENROUTER_PATCH_RESPONSE_EMPTY/);
  assert.throws(() => extractAssistantText('x'.repeat(40001)),
    /FREE_AI_OPENROUTER_PATCH_RESPONSE_TOO_LARGE/);
});

test('accepts structured text from a zero-cost OpenRouter completion end-to-end', async () => {
  let calls = 0;
  const fetchImpl = async (url, options = {}) => {
    calls += 1;
    if (options.method === 'GET') return response(catalog);
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    const sent = JSON.parse(options.body);
    assert.equal(sent.model, MODEL);
    assert.equal(sent.provider.allow_fallbacks, false);
    assert.equal(sent.provider.max_price.prompt, 0);
    return response({
      model: MODEL,
      usage: { cost: 0, cost_details: { upstream_inference_cost: 0 } },
      choices: [{
        finish_reason: 'stop',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'diff --git a/a.js b/a.js\n' },
            { type: 'text', text: '@@ -1 +1 @@\n-old\n+new' }]
        }
      }]
    });
  };
  const result = await requestFreePatch({
    prompt: 'make a tiny safe patch',
    key: 'test-only-key',
    model: 'auto',
    fetchImpl
  });
  assert.equal(result, 'diff --git a/a.js b/a.js\n\n@@ -1 +1 @@\n-old\n+new');
  assert.equal(calls, 2);
});
