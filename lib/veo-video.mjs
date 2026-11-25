/**
 * Google Cloud Veo 3.1 Lite — server-only, no-audio provider adapter.
 * Paid operations are NEVER initiated by imports, previews or status checks.
 * The caller must enforce admin/owner approval and a durable cost gate.
 * https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/generate-videos-from-text
 */
import { sign } from 'node:crypto';

export const VEO_LITE_MODEL = 'veo-3.1-lite-generate-001';
export const VEO_LITE_REGION = 'us-central1';
export const VEO_LITE_SILENT_1080_USD_PER_SECOND = 0.05;
const MODEL_PREFIX = '/publishers/google/models/' + VEO_LITE_MODEL;
const PROJECT_RE = /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/;
const OPERATION_RE = /^[a-zA-Z0-9-]{8,128}$/;
const SAFE_GCS_PREFIX = /^gs:\/\/[a-z0-9][a-z0-9._-]{2,62}\/[a-zA-Z0-9/_-]+\/$/;
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export class VeoInputError extends Error {
  constructor() { super('validation'); this.code = 'validation'; }
}
const invalid = () => { throw new VeoInputError(); };
const failProvider = () => { throw new Error('provider_unavailable'); };

export function normalizeVeoScene(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid();
  if (input.mode !== undefined && input.mode !== 'text') invalid();
  if (typeof input.prompt !== 'string') invalid();
  const prompt = input.prompt.trim();
  if (prompt.length < 20 || prompt.length > 2000) invalid();
  const duration = input.duration;
  if (![4, 6, 8].includes(duration)) invalid();
  const aspectRatio = input.aspectRatio;
  if (!['16:9', '9:16'].includes(aspectRatio)) invalid();
  if (input.resolution !== '1080p') invalid();
  if (input.generateAudio !== undefined && input.generateAudio !== false) invalid();
  if (input.imageUrl || input.image || input.audio || input.voice || input.clientId) invalid();
  if (input.publicContentApproved !== true) invalid();
  const negativePrompt = input.negativePrompt === undefined ? '' : String(input.negativePrompt).trim();
  if (negativePrompt.length > 400) invalid();
  return Object.freeze({
    mode: 'text', prompt, duration, aspectRatio, resolution: '1080p',
    generateAudio: false, negativePrompt,
  });
}

export function quoteVeoScene(input) {
  const scene = normalizeVeoScene(input);
  const usdCents = scene.duration * 5;
  return Object.freeze({
    model: VEO_LITE_MODEL, duration: scene.duration, aspectRatio: scene.aspectRatio,
    resolution: scene.resolution, generateAudio: false, currency: 'USD',
    estimatedUsdCents: usdCents, attemptCount: 1, taxesAndOtherCostsExcluded: true,
    providerRateUsdPerSecond: VEO_LITE_SILENT_1080_USD_PER_SECOND,
  });
}

export function validateVeoConfig({ projectId, outputGcsUri } = {}) {
  if (typeof projectId !== 'string' || !PROJECT_RE.test(projectId)) throw new Error('not_configured');
  if (typeof outputGcsUri !== 'string' || !SAFE_GCS_PREFIX.test(outputGcsUri) ||
      outputGcsUri.includes('..') || outputGcsUri.includes('//', 5)) throw new Error('not_configured');
  return { projectId, outputGcsUri };
}

export function veoRequestForScene(input, config) {
  const scene = normalizeVeoScene(input);
  const { projectId, outputGcsUri } = validateVeoConfig(config);
  const path = '/v1/projects/' + projectId + '/locations/' + VEO_LITE_REGION + MODEL_PREFIX;
  return Object.freeze({
    url: 'https://' + VEO_LITE_REGION + '-aiplatform.googleapis.com' + path + ':predictLongRunning',
    body: {
      instances: [{ prompt: scene.prompt }],
      parameters: {
        durationSeconds: scene.duration,
        aspectRatio: scene.aspectRatio,
        resolution: scene.resolution,
        sampleCount: 1,
        generateAudio: false,
        personGeneration: 'allow_adult',
        storageUri: outputGcsUri,
        ...(scene.negativePrompt ? { negativePrompt: scene.negativePrompt } : {}),
      },
    },
  });
}

export async function serviceAccountAccessToken(serviceAccountJson, { fetchImpl = fetch } = {}) {
  if (typeof serviceAccountJson !== 'string' || !serviceAccountJson.trim()) throw new Error('not_configured');
  let account;
  try { account = JSON.parse(serviceAccountJson); } catch { throw new Error('not_configured'); }
  if (!account || account.type !== 'service_account' ||
      typeof account.client_email !== 'string' ||
      !/^[a-z0-9._+-]+@[a-z0-9.-]+\.iam\.gserviceaccount\.com$/.test(account.client_email) ||
      typeof account.private_key !== 'string' || !account.private_key.includes('PRIVATE KEY') ||
      (account.token_uri && account.token_uri !== GOOGLE_TOKEN_URL)) throw new Error('not_configured');
  const now = Math.floor(Date.now() / 1000);
  const encoded = item => Buffer.from(JSON.stringify(item)).toString('base64url');
  const unsigned = encoded({ alg: 'RS256', typ: 'JWT' }) + '.' + encoded({
    iss: account.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: GOOGLE_TOKEN_URL, iat: now, exp: now + 300,
  });
  let signature;
  try { signature = sign('RSA-SHA256', Buffer.from(unsigned), account.private_key).toString('base64url'); }
  catch { throw new Error('not_configured'); }
  let response;
  try {
    response = await fetchImpl(GOOGLE_TOKEN_URL, {
      method: 'POST', cache: 'no-store', redirect: 'error',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: unsigned + '.' + signature,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch { failProvider(); }
  if (!response?.ok) failProvider();
  let result;
  try { result = await response.json(); } catch { failProvider(); }
  if (typeof result?.access_token !== 'string' || result.access_token.length < 10 ||
      result.token_type !== 'Bearer') failProvider();
  return result.access_token;
}

function endpointForOperation(name, projectId) {
  const prefix = 'projects/' + projectId + '/locations/' + VEO_LITE_REGION + MODEL_PREFIX + '/operations/';
  if (typeof name !== 'string' || !name.startsWith(prefix) ||
      !OPERATION_RE.test(name.slice(prefix.length))) invalid();
  return 'https://' + VEO_LITE_REGION + '-aiplatform.googleapis.com/v1/projects/' +
    projectId + '/locations/' + VEO_LITE_REGION + MODEL_PREFIX + ':fetchPredictOperation';
}

async function googleRequest(url, body, token, fetchImpl) {
  if (typeof token !== 'string' || token.length < 10) throw new Error('not_configured');
  let response;
  try {
    response = await fetchImpl(url, {
      method: 'POST', redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(25000),
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch { failProvider(); }
  if (!response?.ok) failProvider();
  try { return await response.json(); } catch { failProvider(); }
}

/** One call = one potentially billable generation. NEVER retry automatically. */
export async function submitVeoScene(input, {
  projectId, outputGcsUri, serviceAccountJson, accessToken, fetchImpl = fetch,
} = {}) {
  const config = validateVeoConfig({ projectId, outputGcsUri });
  const request = veoRequestForScene(input, config);
  const token = accessToken || await serviceAccountAccessToken(serviceAccountJson, { fetchImpl });
  const data = await googleRequest(request.url, request.body, token, fetchImpl);
  endpointForOperation(data?.name, config.projectId);
  return Object.freeze({
    operationName: data.name, status: 'submitted', model: VEO_LITE_MODEL,
    estimatedUsdCents: quoteVeoScene(input).estimatedUsdCents,
    generateAudio: false,
  });
}

/** Read-only; no paid task creation and no background polling. */
export async function queryVeoScene(operationName, {
  projectId, outputGcsUri, serviceAccountJson, accessToken, fetchImpl = fetch,
} = {}) {
  const config = validateVeoConfig({ projectId, outputGcsUri });
  const url = endpointForOperation(operationName, config.projectId);
  const token = accessToken || await serviceAccountAccessToken(serviceAccountJson, { fetchImpl });
  const data = await googleRequest(url, { operationName }, token, fetchImpl);
  if (data?.name && data.name !== operationName) failProvider();
  if (!data?.done) return Object.freeze({ operationName, status: 'processing', videoGcsUri: null });
  if (data.error || data.response?.raiMediaFilteredCount > 0)
    return Object.freeze({ operationName, status: 'failed', videoGcsUri: null });
  const video = Array.isArray(data.response?.videos) ? data.response.videos.find(v => v?.mimeType === 'video/mp4') : null;
  const uri = video?.gcsUri;
  if (typeof uri !== 'string' || !uri.startsWith(config.outputGcsUri) ||
      uri.includes('..') || !/\.mp4$/.test(uri)) failProvider();
  return Object.freeze({ operationName, status: 'succeeded', videoGcsUri: uri, generateAudio: false });
}
