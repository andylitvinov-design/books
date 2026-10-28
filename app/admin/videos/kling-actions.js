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
    // Cheapest verified presets by modality: text 3.0 3s silent or
    // approved public image 2.5 Turbo 5s, both at 720p.
    // Premium 1080p/longer clips require a separate, OFF-by-default flag.
    const budgetDuration = scene.mode === 'image' ? 5 : 3;
    if (process.env.HH_KLING_PREMIUM_RENDER_ENABLED !== 'true' &&
        (scene.duration !== budgetDuration || scene.resolution !== '720p'))
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
