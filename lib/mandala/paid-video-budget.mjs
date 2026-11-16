/**
 * Owner-only, NO-NETWORK planning estimate for a 30-second paid Video Studio film.
 * A cost estimate is NOT a provider quote, payment receipt, entitlement or render approval.
 * Client wishes, photos, private reports and personal data are never accepted here.
 */
import { videoCartProduct } from '../commerce/cart.js';
import {
  VEO_LITE_MODEL, VEO_LITE_SILENT_1080_USD_PER_SECOND,
} from '../veo-video.mjs';

export const PAID_VIDEO_BUDGET_VERSION = 'hh-30s-budget-v1-20261116';
const ALLOWED_KEYS = new Set(['tier', 'strategy', 'aspectRatio']);
const ALLOWED_FORMATS = new Set(['16:9', '9:16']);
const TARGET_SECONDS = 30;
const PLANS = Object.freeze({
  extra: Object.freeze({ hybrid: Object.freeze([6]) }),
  pro: Object.freeze({
    hybrid: Object.freeze([6, 6]),
    all_ai: Object.freeze([6, 6, 6, 6, 6]),
  }),
});
const invalid = () => { throw new TypeError('invalid_paid_video_budget'); };

export function planThirtySecondVideoBudget(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !ALLOWED_KEYS.has(key))) invalid();
  const { tier = 'pro', strategy = 'hybrid', aspectRatio = '16:9' } = input;
  if (!Object.hasOwn(PLANS, tier) ||
      !Object.hasOwn(PLANS[tier], strategy) ||
      !ALLOWED_FORMATS.has(aspectRatio)) invalid();

  const product = videoCartProduct(tier === 'extra' ? 'video-extra' : 'video-pro');
  if (!product) throw Error('video_product_unavailable');
  const aiDurationsSeconds = [...PLANS[tier][strategy]];
  const aiSeconds = aiDurationsSeconds.reduce((sum, duration) => sum + duration, 0);
  if (aiSeconds > TARGET_SECONDS ||
      aiDurationsSeconds.some(seconds => ![4, 6, 8].includes(seconds))) invalid();
  const rateCentsPerSecond = Math.round(VEO_LITE_SILENT_1080_USD_PER_SECOND * 100);
  if (rateCentsPerSecond !== 5) throw Error('video_price_requires_review');

  const estimatedUsdCents = aiDurationsSeconds.reduce(
    (sum, seconds) => sum + seconds * rateCentsPerSecond, 0,
  );
  return Object.freeze({
    version: PAID_VIDEO_BUDGET_VERSION,
    kind: 'illustrative_cost_not_a_server_verified_paid_quote',
    tier, strategy, aspectRatio,
    durationSeconds: TARGET_SECONDS,
    aiSeconds, librarySeconds: TARGET_SECONDS - aiSeconds,
    aiDurationsSeconds: Object.freeze(aiDurationsSeconds),
    customerOffer: Object.freeze({
      id: product.id, currency: product.currency, amountMinor: product.amountMinor,
    }),
    providerEstimate: Object.freeze({
      model: VEO_LITE_MODEL, currency: 'USD', estimatedUsdCents,
      rateUsdPerSecond: VEO_LITE_SILENT_1080_USD_PER_SECOND,
      attempts: 1, resolution: '1080p', generatedAudio: false,
    }),
    canSubmit: false, paymentVerified: false, masterReady: false,
    externalContentPolicy: 'approved_public_fictional_only',
    exclusions: Object.freeze([
      'retries', 'provider_price_changes', 'taxes', 'currency_conversion',
      'licensed_media', 'audio', 'montage', 'storage', 'human_quality_assurance',
    ]),
  });
}
