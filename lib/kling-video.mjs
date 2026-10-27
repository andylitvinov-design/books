// Official Kling 3.0 API adapter. Server only: never expose the bearer key in browser code.
const API_ORIGIN = 'https://api-singapore.klingai.com';
const SAFE_TASK_ID = /^[A-Za-z0-9_-]{8,128}$/;
const SAFE_EXTERNAL_ID = /^hh_kling_[A-Za-z0-9_-]{12,64}$/;

export class KlingInputError extends Error {
  constructor() { super('validation'); this.code = 'validation'; }
}
const invalid = () => { throw new KlingInputError(); };

export function normalizeKlingScene(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) invalid();
  if (input.mode !== 'text' && input.mode !== 'image') invalid();
  if (typeof input.prompt !== 'string') invalid();
  const prompt = input.prompt.trim();
  if (prompt.length < 12 || prompt.length > 2500) invalid();
  const duration = Number(input.duration);
  // Kling 3.0 permits 3-second no-audio shots, minimizing render spend.
  if (![3, 5, 10].includes(duration)) invalid();
  const aspectRatio = input.aspectRatio;
  if (!['16:9', '9:16', '1:1'].includes(aspectRatio)) invalid();
  const resolution = input.resolution;
  if (!['720p', '1080p'].includes(resolution)) invalid();
  const externalTaskId = input.externalTaskId;
  if (typeof externalTaskId !== 'string' || !SAFE_EXTERNAL_ID.test(externalTaskId)) invalid();

  const imageUrl = String(input.imageUrl ?? '').trim();
  if (input.mode === 'text' && imageUrl) invalid();
  if (input.mode === 'image') {
    if (!imageUrl || input.publicImageApproved !== true) invalid();
    let parsed;
    try { parsed = new URL(imageUrl); } catch { invalid(); }
    // Only already-public site images. No signed URLs, Drive, client photos or other hosts.
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'holistichouse.vercel.app'
        || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash
        || !/^\/images\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g)$/.test(parsed.pathname)) invalid();
  }
  return { mode: input.mode, prompt, duration, aspectRatio, resolution, imageUrl, externalTaskId };
}

export function klingRequestForScene(scene) {
  const settings = {
    duration: scene.duration,
    resolution: scene.resolution,
    audio: 'off',
    multi_shot: false,
    ...(scene.mode === 'text' ? { aspect_ratio: scene.aspectRatio } : {}),
  };
  const options = { external_task_id: scene.externalTaskId };
  return scene.mode === 'text'
    ? { path: '/text-to-video/kling-3.0', body: { prompt: scene.prompt, settings, options } }
    : { path: '/image-to-video/kling-3.0', body: {
      contents: [
        { type: 'prompt', text: scene.prompt },
        { type: 'first_frame', url: scene.imageUrl },
      ], settings, options,
    } };
}

function requireApiKey(apiKey) {
  if (typeof apiKey !== 'string' || apiKey.trim().length < 12) throw new Error('not_configured');
  return apiKey.trim();
}

async function getProviderData(response) {
  if (!response?.ok) throw new Error('provider_unavailable');
  let data;
  try { data = await response.json(); } catch { throw new Error('provider_unavailable'); }
  if (data?.code !== 0 || !data.data) throw new Error('provider_unavailable');
  return data.data;
}

// Explicit owner-only, read-only API-key/resource handshake; no render task, no billing.
// Kling's package remaining quantities can lag by up to 12 hours: never use as a spend cap.
export async function checkKlingAccount({ apiKey, fetchImpl = fetch, now = Date.now() } = {}) {
  const key = requireApiKey(apiKey);
  const ms = Number.isFinite(now) && now > 0 ? Math.floor(now) : Date.now();
  const params = new URLSearchParams({
    start_time: String(ms - 90 * 86400000),
    end_time: String(ms),
  });
  const response = await fetchImpl(`${API_ORIGIN}/account/costs?${params}`, {
    method: 'GET', cache: 'no-store', redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  const data = await getProviderData(response);
  if (data.code !== undefined && data.code !== 0) throw new Error('provider_unavailable');
  const packages = Array.isArray(data.resource_pack_subscribe_infos) ? data.resource_pack_subscribe_infos : [];
  const hasActivePackage = packages.some(item => item?.status === 'online' && Number(item?.remaining_quantity) > 0);
  return { connected: true, hasActivePackage, balanceDelayed: true };
}

export async function submitKlingScene(scene, { apiKey, fetchImpl = fetch } = {}) {
  const key = requireApiKey(apiKey);
  const normalized = normalizeKlingScene(scene);
  const { path, body } = klingRequestForScene(normalized);
  const response = await fetchImpl(API_ORIGIN + path, {
    method: 'POST',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(22000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await getProviderData(response);
  if (typeof data.id !== 'string' || !SAFE_TASK_ID.test(data.id)) throw new Error('provider_unavailable');
  return { taskId: data.id, externalTaskId: normalized.externalTaskId, status: data.status || 'submitted' };
}

function safeVideoUrl(value) {
  if (typeof value !== 'string' || value.length > 2500) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export async function queryKlingScene(taskId, { apiKey, fetchImpl = fetch, external = false } = {}) {
  const key = requireApiKey(apiKey);
  if (typeof taskId !== 'string' ||
      !(external ? SAFE_EXTERNAL_ID : SAFE_TASK_ID).test(taskId)) invalid();
  const queryKey = external ? 'external_task_ids' : 'task_ids';
  const response = await fetchImpl(`${API_ORIGIN}/tasks?${queryKey}=${encodeURIComponent(taskId)}`, {
    method: 'GET',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  const data = await getProviderData(response);
  const tasks = Array.isArray(data) ? data : data?.result;
  const task = Array.isArray(tasks) ? tasks.find(item =>
    (external ? item?.external_id : item?.id) === taskId) : null;
  if (!task) return { status: 'not_found', taskId };
  const output = Array.isArray(task.outputs) ? task.outputs.find(item => item?.type === 'video') : null;
  return {
    taskId: String(task.id || taskId),
    externalTaskId: typeof task.external_id === 'string' ? task.external_id : null,
    status: ['submitted','processing','succeeded','failed'].includes(task.status)
      ? task.status : 'unknown',
    videoUrl: task.status === 'succeeded' ? safeVideoUrl(output?.url) : null,
    duration: task.status === 'succeeded' ? Number(output?.duration) || null : null,
  };
}
