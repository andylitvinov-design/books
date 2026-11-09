'use server';

import { requireAdminRequest } from '@/lib/prescriptions/admin';
import {
  VeoInputError, normalizeVeoScene, quoteVeoScene,
  queryVeoScene, submitVeoScene,
} from '@/lib/veo-video.mjs';

// Owner-only pilot; no customer paid access, public render endpoint, or auto-publishing.
function providerConfig() {
  return {
    projectId: process.env.HH_VEO_GCP_PROJECT_ID || '',
    outputGcsUri: process.env.HH_VEO_GCS_OUTPUT_URI || '',
    serviceAccountJson: process.env.HH_VEO_SERVICE_ACCOUNT_JSON || '',
    enabled: process.env.HH_VEO_PAID_ENABLED === 'true',
  };
}
function safeCode(error) {
  if (error instanceof VeoInputError) return 'validation';
  if (error?.message === 'not_configured') return 'not_configured';
  return 'provider_unavailable';
}

export async function generateVeoSceneAction(input) {
  if (!await requireAdminRequest()) return { ok: false, error: 'unauthorized' };
  const config = providerConfig();
  if (!config.enabled) return { ok: false, error: 'disabled' };
  if (!config.projectId || !config.outputGcsUri || !config.serviceAccountJson)
    return { ok: false, error: 'not_configured' };
  if (input?.paidApproved !== true || input?.publicContentApproved !== true)
    return { ok: false, error: 'approval' };
  try {
    const scene = normalizeVeoScene(input);
    const quote = quoteVeoScene({ ...scene, publicContentApproved: true });
    // No unlimited budget, auto retry or alternate expensive model.
    if (input.approvedMaxUsdCents !== quote.estimatedUsdCents)
      return { ok: false, error: 'quote_changed' };
    return { ok: true, result: await submitVeoScene({
      ...scene, publicContentApproved: true,
    }, config) };
  } catch (error) {
    // A timeout is an UNKNOWN result; the caller must not automatically retry.
    return { ok: false, error: safeCode(error), mayHaveSubmitted: true };
  }
}

export async function checkVeoSceneAction(input) {
  if (!await requireAdminRequest()) return { ok: false, error: 'unauthorized' };
  const config = providerConfig();
  if (!config.projectId || !config.outputGcsUri || !config.serviceAccountJson)
    return { ok: false, error: 'not_configured' };
  try {
    return { ok: true, result: await queryVeoScene(input?.operationName, config) };
  } catch (error) {
    return { ok: false, error: safeCode(error) };
  }
}
