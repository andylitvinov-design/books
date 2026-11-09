'use strict';
/* Owner-only bridge to the existing Holistic House AI Advisor.
 * The Director owner session is verified by the existing private Supabase store.
 * No browser-supplied owner ID, arbitrary destination, or task execution is accepted.
 */
const crypto = require('node:crypto');
const { callStore, sendJson, isOriginAllowed, tokenFromRequest } = require('../lib/commander-private-store');

const ADVISOR_URL = 'https://holistichouse.vercel.app/api/holistic-agent/director-turn';
const AUDIENCE = 'holistic-house-ai-advisor';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCALES = new Set(['ru','en','es']);
const clean = (value, max) => typeof value === 'string'
  ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '';

function secret() {
  return process.env.HH_PM_HOLISTIC_ADVISOR_BRIDGE_SECRET || '';
}
async function requireOwner(req) {
  if (!tokenFromRequest(req)) throw Object.assign(Error('OWNER_SESSION_REQUIRED'), { status: 401 });
  const status = await callStore(req, 'status', {}, { method: 'GET' });
  if (status.status !== 200 || status.data?.owner !== true || status.data?.privateStoreConfigured !== true)
    throw Object.assign(Error('OWNER_SESSION_REQUIRED'), { status: status.status === 401 ? 401 : 403 });
}
function input(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('INVALID_BODY');
  const requestId = body.requestId;
  const message = clean(body.message, 1200);
  const locale = body.locale;
  if (!UUID.test(requestId || '') || message.length < 2 || !LOCALES.has(locale)) throw Error('INVALID_ADVISOR_INPUT');
  const history = body.history === undefined ? [] : body.history;
  if (!Array.isArray(history) || history.length > 6) throw Error('INVALID_ADVISOR_HISTORY');
  const safeHistory = history.map(row => {
    if (!row || !['user','assistant'].includes(row.role) || typeof row.text !== 'string' || row.text.length > 800)
      throw Error('INVALID_ADVISOR_HISTORY');
    return { role: row.role, text: clean(row.text, 800) };
  });
  return {
    schemaVersion: 1, audience: AUDIENCE, actor: 'verified-director-owner',
    requestId, locale, message, history: safeHistory,
  };
}
module.exports = async function(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Vary', 'Cookie, Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!isOriginAllowed(req)) return sendJson(res, 403, { error: 'CROSS_ORIGIN_DENIED' });
  try {
    await requireOwner(req);
    if (process.env.HH_PM_HOLISTIC_ADVISOR_ENABLED !== 'true') return sendJson(res, 503, { error: 'ADVISOR_BRIDGE_DISABLED' });
    const key = secret();
    if (key.length < 32) return sendJson(res, 503, { error: 'ADVISOR_BRIDGE_NOT_CONFIGURED' });
    if (Number(req.headers?.['content-length'] || 0) > 12000) return sendJson(res, 413, { error: 'PAYLOAD_TOO_LARGE' });
    let raw = req.body;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { return sendJson(res, 400, { error: 'INVALID_JSON' }); }
    }
    const payload = input(raw);
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.createHmac('sha256', key)
      .update(timestamp + '.' + payload.requestId + '.' + AUDIENCE + '.' + body)
      .digest('hex');
    const response = await fetch(ADVISOR_URL, {
      method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(9000),
      headers: {
        'Content-Type': 'application/json', Accept: 'application/json',
        'x-hh-director-timestamp': timestamp,
        'x-hh-director-request-id': payload.requestId,
        'x-hh-director-signature': signature,
      },
      body,
    });
    const text = await response.text();
    if (text.length > 6000) throw Error('ADVISOR_RESPONSE_TOO_LARGE');
    let result;
    try { result = JSON.parse(text); } catch { throw Error('ADVISOR_INVALID_RESPONSE'); }
    if (!response.ok) return sendJson(res, response.status, { error: clean(result.error, 80) || 'ADVISOR_UNAVAILABLE' });
    if (result.schemaVersion !== 1 || result.requestId !== payload.requestId ||
        typeof result.reply !== 'string' || !result.reply.trim() ||
        typeof result.source !== 'string' || result.reportType !== 'ADVISORY_ONLY' ||
        result.modelUsed !== false) throw Error('ADVISOR_RESPONSE_CONTRACT_FAILED');
    return sendJson(res, 200, {
      requestId: payload.requestId, reply: result.reply.slice(0, 3000),
      source: clean(result.source, 80), status: clean(result.status, 40) || 'answered',
      model: 'Holistic House AI Advisor · rules', modelUsed: false,
      reportType: 'ADVISORY_ONLY', observedAt: new Date().toISOString(),
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 503;
    const code = /^[A-Z0-9_]{2,80}$/.test(error?.message || '') ? error.message : 'ADVISOR_UNAVAILABLE';
    return sendJson(res, status, { error: code });
  }
};
module.exports.__test = { input, AUDIENCE };
