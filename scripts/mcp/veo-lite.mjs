#!/usr/bin/env node
/**
 * Holistic House Veo Lite MCP (stdio). No new service, no dependency or subscription.
 * Default OFF: tools/list and quotes never send provider requests.
 * Credential-bearing tools run only when the local operator explicitly configures
 * the Google Cloud project, dedicated service account, private GCS prefix and flags.
 */
import { createInterface } from 'node:readline';
import { normalizeVeoScene, quoteVeoScene, queryVeoScene, submitVeoScene } from '../../lib/veo-video.mjs';

const toolSchema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const sceneProperties = {
  prompt: { type: 'string', minLength: 20, maxLength: 2000, description: 'Visual shot only. Never send private client data.' },
  duration: { type: 'integer', enum: [4, 6, 8] },
  aspectRatio: { type: 'string', enum: ['16:9', '9:16'] },
  resolution: { type: 'string', enum: ['1080p'] },
  generateAudio: { type: 'boolean', enum: [false] },
  publicContentApproved: { type: 'boolean', enum: [true] },
  negativePrompt: { type: 'string', maxLength: 400 },
};
const sceneRequired = ['prompt', 'duration', 'aspectRatio', 'resolution', 'generateAudio', 'publicContentApproved'];
const tools = [
  { name: 'veo_lite_readiness', description: 'Offline readiness and feature flags; never reveals credential values or incurs charges.', inputSchema: toolSchema({}) },
  { name: 'veo_lite_quote', description: 'Offline quote for one Veo 3.1 Lite silent 1080p clip (USD, taxes/retries/storage not included). Never submits a job.', inputSchema: toolSchema(sceneProperties, sceneRequired) },
  { name: 'veo_lite_generate', description: 'PAID: creates exactly one silent Vertex AI job; requires flags, signed-in operator action, explicit rights and charge approval, and precise approved max. Never retry automatically.', inputSchema: toolSchema({
    ...sceneProperties,
    paidApproved: { type: 'boolean', enum: [true] },
    approvedMaxUsdCents: { type: 'integer', minimum: 20, maximum: 40 },
  }, [...sceneRequired, 'paidApproved', 'approvedMaxUsdCents']) },
  { name: 'veo_lite_status', description: 'Read-only status of an existing Google Cloud operation; never creates or retries a render.', inputSchema: toolSchema({
    operationName: { type: 'string', minLength: 45, maxLength: 300 },
  }, ['operationName']) },
];

function config() {
  return {
    projectId: process.env.HH_VEO_GCP_PROJECT_ID || '',
    outputGcsUri: process.env.HH_VEO_GCS_OUTPUT_URI || '',
    serviceAccountJson: process.env.HH_VEO_SERVICE_ACCOUNT_JSON || '',
  };
}
const configured = () => Boolean(config().projectId && config().outputGcsUri && config().serviceAccountJson);
const paid = () => process.env.HH_VEO_PAID_ENABLED === 'true' && process.env.HH_VEO_MCP_ALLOW_SUBMIT === 'true';

function textResult(value, isError = false) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }], isError };
}
function safeError(e) {
  if (e?.code === 'validation' || e?.message === 'validation') return 'validation';
  if (e?.message === 'not_configured') return 'not_configured';
  if (e?.message === 'disabled' || e?.message === 'approval' || e?.message === 'quote_changed') return e.message;
  return 'provider_unavailable';
}
async function handleTool(name, args = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return textResult({ error: 'validation' }, true);
  if (name === 'veo_lite_readiness') return textResult({
    model: 'veo-3.1-lite-generate-001', region: 'us-central1', silent: true,
    configured: configured(), paidGenerationEnabled: paid(),
    note: 'No provider connection is established by these flags alone.',
  });
  if (name === 'veo_lite_quote') {
    try { return textResult(quoteVeoScene(args)); }
    catch (error) { return textResult({ error: safeError(error) }, true); }
  }
  if (name === 'veo_lite_generate') {
    if (!paid()) return textResult({ error: 'disabled' }, true);
    if (!configured()) return textResult({ error: 'not_configured' }, true);
    if (args.paidApproved !== true || args.publicContentApproved !== true)
      return textResult({ error: 'approval' }, true);
    try {
      const scene = normalizeVeoScene(args);
      const quote = quoteVeoScene(args);
      if (args.approvedMaxUsdCents !== quote.estimatedUsdCents)
        return textResult({ error: 'quote_changed' }, true);
      const result = await submitVeoScene({ ...scene, publicContentApproved: true }, config());
      return textResult(result);
    } catch (error) {
      // Unknown provider result is not proof of failure. Never auto-repeat.
      return textResult({ error: safeError(error), mayHaveSubmitted: true }, true);
    }
  }
  if (name === 'veo_lite_status') {
    if (!configured()) return textResult({ error: 'not_configured' }, true);
    try { return textResult(await queryVeoScene(args.operationName, config())); }
    catch (error) { return textResult({ error: safeError(error) }, true); }
  }
  return textResult({ error: 'unknown_tool' }, true);
}
const serverInfo = { name: 'holistic-house-veo-lite-silent', version: '0.1.0' };
async function dispatch(req) {
  if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') return null;
  if (req.method === 'notifications/initialized' || req.method === 'notifications/cancelled') return null;
  if (req.id === undefined || req.id === null) return null;
  try {
    if (req.method === 'initialize') return {
      jsonrpc: '2.0', id: req.id,
      result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo },
    };
    if (req.method === 'ping') return { jsonrpc: '2.0', id: req.id, result: {} };
    if (req.method === 'tools/list') return { jsonrpc: '2.0', id: req.id, result: { tools } };
    if (req.method === 'tools/call') {
      const name = req.params?.name;
      if (typeof name !== 'string' || !tools.some(x => x.name === name))
        return { jsonrpc: '2.0', id: req.id, error: { code: -32602, message: 'Invalid tool' } };
      return { jsonrpc: '2.0', id: req.id, result: await handleTool(name, req.params?.arguments ?? {}) };
    }
    return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: 'Method not found' } };
  } catch {
    return { jsonrpc: '2.0', id: req.id, error: { code: -32603, message: 'Internal error' } };
  }
}
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of input) {
  if (line.length > 20000) continue;
  let request;
  try { request = JSON.parse(line); } catch { continue; }
  const response = await dispatch(request);
  if (response) process.stdout.write(JSON.stringify(response) + '\n');
}
