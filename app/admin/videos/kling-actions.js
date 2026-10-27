'use server';

import { requireAdminRequest } from '@/lib/prescriptions/admin';
import { KlingInputError, normalizeKlingScene, queryKlingScene, submitKlingScene } from '@/lib/kling-video.mjs';

function config() {
  return {
    apiKey: process.env.KLING_API_KEY || '',
    enabled: process.env.HH_KLING_PAID_GENERATION_ENABLED === 'true',
  };
}
function codeFor(error) {
  return error instanceof KlingInputError ? 'validation'
    : error?.message === 'not_configured' ? 'not_configured'
    : 'provider_unavailable';
}

// No renderer is called by a page load, a status read, or a saved draft.
// The paid external request requires current server-side admin auth + explicit opt-in.
export async function generateKlingSceneAction(input) {
  if (!await requireAdminRequest()) return { ok: false, error: 'unauthorized' };
  if (input?.paidApproved !== true) return { ok: false, error: 'approval' };
  const { apiKey, enabled } = config();
  if (!enabled) return { ok: false, error: 'disabled' };
  if (!apiKey) return { ok: false, error: 'not_configured' };
  try {
    const scene = normalizeKlingScene(input);
    // By default a paid API submission is limited to a 3s silent 720p shot.
    // Premium 5/10s and 1080p need a second, separately approved server flag.
    if (process.env.HH_KLING_PREMIUM_RENDER_ENABLED !== 'true' &&
        (scene.duration !== 3 || scene.resolution !== '720p'))
      return { ok: false, error: 'low_cost_only' };
    return { ok: true, result: await submitKlingScene(scene, { apiKey }) };
  } catch (error) {
    // A timed-out provider request might have been accepted; preserve caller's
    // ID for readback instead of silently issuing a second paid request.
    return { ok: false, error: codeFor(error),
      externalTaskId: typeof input?.externalTaskId === 'string' &&
        /^hh_kling_[a-zA-Z0-9_-]{12,64}$/.test(input.externalTaskId) ? input.externalTaskId : null };
  }
}

export async function checkKlingSceneAction(input) {
  if (!await requireAdminRequest()) return { ok: false, error: 'unauthorized' };
  const { apiKey } = config();
  if (!apiKey) return { ok: false, error: 'not_configured' };
  try {
    const taskId = input?.taskId;
    return { ok: true, result: await queryKlingScene(taskId, {
      apiKey, external: input?.external === true,
    }) };
  } catch (error) {
    return { ok: false, error: codeFor(error) };
  }
}
