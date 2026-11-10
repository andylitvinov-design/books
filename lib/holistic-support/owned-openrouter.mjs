/**
 * First-party OpenRouter free-tier adapter for Agent Director.
 * It uses only the official free router, verifies the routed model and zero USD
 * usage from the response, and never retries through a paid model.
 */
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const FREE_ROUTER_MODEL = 'openrouter/free';
const MODEL_ID = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*:free$/i;

export function openRouterFreeConfig(env = process.env) {
  const apiKey = env.HH_AGENT_OPENROUTER_API_KEY;
  if (typeof apiKey !== 'string' || apiKey.trim().length < 20 ||
      apiKey.length > 500 || /\s/.test(apiKey)) return null;
  return { apiKey, model: FREE_ROUTER_MODEL };
}

function validMessages(messages) {
  return Array.isArray(messages) && messages.length > 0 && messages.length <= 10 &&
    messages.every(item =>
      ['system', 'user', 'assistant'].includes(item?.role) &&
      typeof item.content === 'string' && item.content.length <= 7000);
}

export async function generateOwnedOpenRouter(request, {
  apiKey, fetcher = fetch, signal,
} = {}) {
  if (typeof apiKey !== 'string' || apiKey.trim().length < 20 ||
      apiKey.length > 500 || /\s/.test(apiKey)) {
    throw Error('OPENROUTER_API_KEY_NOT_CONFIGURED');
  }
  const messages = Array.isArray(request?.messages) ? request.messages : [];
  if (!validMessages(messages)) throw Error('OPENROUTER_INVALID_PROMPT');

  let response;
  try {
    response = await fetcher(ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      signal,
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'HTTP-Referer': 'https://holistichouse.vercel.app',
        'X-Title': 'Holistic House Agent Director',
      },
      body: JSON.stringify({
        model: FREE_ROUTER_MODEL,
        messages,
        stream: false,
        max_tokens: 650,
        temperature: 0.35,
        // Provider failover is disabled. The free-router may choose only a free model.
        provider: { allow_fallbacks: false },
      }),
    });
  } catch {
    throw Error('OPENROUTER_REQUEST_FAILED');
  }
  if (!response?.ok) {
    if (response?.status === 401 || response?.status === 403)
      throw Error('OPENROUTER_AUTH_FAILED');
    if (response?.status === 429) throw Error('OPENROUTER_FREE_LIMIT_REACHED');
    throw Error('OPENROUTER_REQUEST_FAILED');
  }

  let data;
  try {
    const raw = await response.text();
    if (raw.length > 24000) throw Error('too large');
    data = JSON.parse(raw);
  } catch {
    throw Error('OPENROUTER_RESPONSE_INVALID');
  }

  const actualModel = typeof data?.model === 'string' ? data.model : '';
  if (!MODEL_ID.test(actualModel)) throw Error('OPENROUTER_NON_FREE_MODEL_REJECTED');

  // Do not accept a response unless OpenRouter reports the actual inference cost as exactly $0.
  const cost = data?.usage?.cost;
  if (typeof cost !== 'number' || !Number.isFinite(cost) || cost !== 0)
    throw Error('OPENROUTER_COST_NOT_VERIFIED_ZERO');

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim())
    throw Error('OPENROUTER_EMPTY_RESPONSE');

  return { text: content, model: actualModel, costUsd: cost };
}
