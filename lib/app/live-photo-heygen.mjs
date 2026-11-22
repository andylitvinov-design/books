/**
 * Server-side, opt-in HeyGen Video 1 image-to-video adapter.
 * No provider request happens on import or on disabled status reads.
 * Never return provider API keys, user photographs or signed CDN URLs.
 */
const API = 'https://api.heygen.com/v3';
const VIDEO_ENDPOINT = API + '/models/videos';
const SAFE_VIDEO_ID = /^[A-Za-z0-9_-]{8,128}$/;
const SAFE_ASSET_ID = /^[A-Za-z0-9_-]{8,128}$/;
const MOTION = Object.freeze({
  // Reusable coach-quality short motion: one natural gesture, stable identity.
  smile: 'The person looks into the camera, gradually forms a gentle warm smile, blinks naturally once and makes a tiny relaxed head movement. No speech.',
  greeting: 'The person looks warmly at the camera, gives one small friendly greeting nod, then smiles naturally and stays relaxed. No speech or hand gesture.',
  wave: 'The person smiles warmly and makes one gentle greeting wave with a hand and forearm already visible in the original photo. Preserve natural arm and finger anatomy. If no hand is visible, never invent an arm or hand: gently smile instead. No speech.',
  blink: 'The person naturally blinks once or twice and breathes subtly while maintaining a calm expression. No speech.',
  turn: 'The person makes a very small relaxed head turn toward the camera and settles naturally, without exaggerated motion. No speech.',
});
export const LIVE_PHOTO_MOTIONS = Object.freeze(Object.keys(MOTION));
export const LIVE_PHOTO_MAX_BYTES = 12_000_000;

// Disabling new metered submissions must not prevent archiving an already-accepted job.
export function hasLivePhotoProviderKey(env = process.env) {
  return typeof env.HH_LIVE_PHOTO_HEYGEN_API_KEY === 'string' &&
    env.HH_LIVE_PHOTO_HEYGEN_API_KEY.trim().length >= 20;
}
export function isLivePhotoCreationEnabled(env = process.env) {
  return env.HH_LIVE_PHOTOS_ENABLED === 'true' &&
    env.HH_LIVE_PHOTOS_SPEND_APPROVED === 'true' &&
    hasLivePhotoProviderKey(env);
}
export function buildLivePhotoPrompt(motion) {
  if (!Object.hasOwn(MOTION, motion)) throw Error('INVALID_LIVE_PHOTO_MOTION');
  return MOTION[motion] +
    ' One adult subject in one continuous natural shot. Preserve the exact identity, facial features, face shape, skin tone, hairstyle, clothing, original lighting, framing and background. ' +
    ' Fixed camera, natural blinks and realistic facial anatomy. No artificial face warping, identity drift, morphing, exaggerated expressions, duplicated limbs, distorted hands or extra fingers. ' +
    ' No other people, no new objects, no talking, no speech, no lip sync, no words, no subtitles, no logos, no music, no camera movement or cuts.';
}
export function buildHeyGenLivePhotoBody(assetId, motion) {
  if (typeof assetId !== 'string' || !SAFE_ASSET_ID.test(assetId)) throw Error('INVALID_HEYGEN_ASSET');
  return {
    model: 'heygen-video-1',
    mode: 'image_to_video',
    image: { type: 'asset_id', asset_id: assetId },
    prompt: buildLivePhotoPrompt(motion),
    duration: 5,
    resolution: '768p',
  };
}
export function isAllowedHeyGenDownloadUrl(value) {
  if (typeof value !== 'string' || value.length > 4000 || /[\r\n]/.test(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && !u.hash &&
      (u.hostname.endsWith('.heygen.ai') || u.hostname === 'heygen.ai' ||
        u.hostname.endsWith('.heygen.com') || u.hostname === 'heygen.com');
  } catch { return false; }
}
function key() {
  if (!hasLivePhotoProviderKey()) throw Error('HEYGEN_LIVE_PHOTO_NOT_ENABLED');
  return process.env.HH_LIVE_PHOTO_HEYGEN_API_KEY.trim();
}
function unpack(value) {
  const data = value?.data && typeof value.data === 'object' ? value.data : value;
  if (!data || typeof data !== 'object') throw Error('HEYGEN_INVALID_RESPONSE');
  return data;
}
async function providerJson(url, { method = 'GET', body, idempotency, file } = {}) {
  const headers = { 'x-api-key': key() };
  if (body) headers['Content-Type'] = 'application/json';
  if (idempotency) headers['Idempotency-Key'] = idempotency;
  const form = file ? new FormData() : null;
  if (form) form.append('file', new Blob([file], { type: 'image/jpeg' }), 'portrait.jpg');
  const response = await fetch(url, {
    method, headers, body: form || (body ? JSON.stringify(body) : undefined),
    redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw Error('HEYGEN_PROVIDER_UNAVAILABLE');
  let json;
  try { json = await response.json(); } catch { throw Error('HEYGEN_INVALID_RESPONSE'); }
  return unpack(json);
}
export async function uploadHeyGenPortrait(jpeg) {
  const result = await providerJson(API + '/assets', { method: 'POST', file: jpeg });
  const assetId = result.asset_id || result.id;
  if (typeof assetId !== 'string' || !SAFE_ASSET_ID.test(assetId)) throw Error('HEYGEN_INVALID_ASSET');
  return assetId;
}
export async function submitHeyGenLivePhoto(assetId, motion, requestId) {
  if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId))
    throw Error('INVALID_IDEMPOTENCY_KEY');
  const data = await providerJson(VIDEO_ENDPOINT, {
    method: 'POST', body: { ...buildHeyGenLivePhotoBody(assetId, motion),
      callback_url: 'https://holistichouse.vercel.app/api/integrations/heygen/live-photo',
      callback_id: requestId }, idempotency: requestId,
  });
  const id = data.video_id || data.id;
  if (typeof id !== 'string' || !SAFE_VIDEO_ID.test(id)) throw Error('HEYGEN_INVALID_JOB');
  return id;
}
export async function getHeyGenLivePhotoStatus(videoId) {
  if (typeof videoId !== 'string' || !SAFE_VIDEO_ID.test(videoId))
    throw Error('HEYGEN_INVALID_JOB');
  const data = await providerJson(VIDEO_ENDPOINT + '/' + encodeURIComponent(videoId));
  const resultId = data.video_id || data.id || videoId;
  if (resultId !== videoId) throw Error('HEYGEN_INVALID_JOB');
  const raw = String(data.status || '').toLowerCase();
  const state = ['completed', 'failed', 'cancelled'].includes(raw) ? raw :
    ['pending', 'queued', 'processing', 'generating', 'in_progress', 'waiting', 'thinking'].includes(raw) ? 'processing' : 'unknown';
  return { state, url: state === 'completed' && isAllowedHeyGenDownloadUrl(data.video_url || data.url) ?
    (data.video_url || data.url) : null };
}
export async function downloadHeyGenLivePhoto(url) {
  if (!isAllowedHeyGenDownloadUrl(url)) throw Error('HEYGEN_INVALID_VIDEO_URL');
  const res = await fetch(url, {
    method: 'GET', headers: { Accept: 'video/mp4' }, redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(45000),
  });
  const length = Number(res.headers.get('content-length') || 0);
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !res.body || (length > LIVE_PHOTO_MAX_BYTES) ||
    (type && !/^(video\/mp4|application\/octet-stream)(;|$)/i.test(type)))
    throw Error('HEYGEN_VIDEO_DOWNLOAD_FAILED');
  const reader = res.body.getReader(), chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIVE_PHOTO_MAX_BYTES) throw Error('HEYGEN_VIDEO_TOO_LARGE');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const mp4 = Buffer.concat(chunks);
  if (mp4.length < 1024 || mp4.toString('ascii', 4, 8) !== 'ftyp')
    throw Error('HEYGEN_INVALID_MP4');
  return mp4;
}
