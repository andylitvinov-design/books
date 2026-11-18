import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planThirtySecondVideoBudget, PAID_VIDEO_BUDGET_VERSION } from '../lib/mandala/paid-video-budget.mjs';
import { quoteVeoScene } from '../lib/veo-video.mjs';
import { videoCartProduct } from '../lib/commerce/cart.js';

test('30s Extra hybrid is one 6s Veo clip, no automatic paid launch', () => {
  const quote = planThirtySecondVideoBudget({tier:'extra',strategy:'hybrid',aspectRatio:'9:16'});
  assert.equal(quote.version, PAID_VIDEO_BUDGET_VERSION);
  assert.equal(quote.durationSeconds, 30);
  assert.equal(quote.aiSeconds, 6);
  assert.equal(quote.librarySeconds, 24);
  assert.deepEqual(quote.aiDurationsSeconds, [6]);
  assert.equal(quote.customerOffer.amountMinor, videoCartProduct('video-extra').amountMinor);
  assert.equal(quote.providerEstimate.estimatedUsdCents, 30);
  assert.equal(quote.providerEstimate.generatedAudio, false);
  assert.equal(quote.canSubmit, false);
  assert.equal(quote.paymentVerified, false);
  assert.equal(quote.masterReady, false);
});

test('30s PRO estimates 12s hybrid versus 30s full AI without promising delivery', () => {
  const hybrid = planThirtySecondVideoBudget({tier:'pro'});
  const all = planThirtySecondVideoBudget({tier:'pro',strategy:'all_ai'});
  assert.equal(hybrid.aiSeconds, 12);
  assert.equal(hybrid.librarySeconds, 18);
  assert.equal(hybrid.providerEstimate.estimatedUsdCents, 60);
  assert.equal(all.aiSeconds, 30);
  assert.equal(all.librarySeconds, 0);
  assert.equal(all.providerEstimate.estimatedUsdCents, 150);
  assert.equal(all.aiDurationsSeconds.length, 5);
  assert.equal(hybrid.customerOffer.amountMinor, videoCartProduct('video-pro').amountMinor);
  assert.equal(all.canSubmit, false);
});

test('the planning rate matches real Veo single-shot price code', () => {
  const source = {
    mode: 'text',
    prompt: 'A calm tracking shot of a public coastal landscape with natural moving waves and sunlight.',
    duration: 6, resolution: '1080p', aspectRatio: '16:9',
    publicContentApproved: true, generateAudio: false,
  };
  const shot = quoteVeoScene(source);
  assert.equal(shot.estimatedUsdCents, planThirtySecondVideoBudget().providerEstimate.estimatedUsdCents / 2);
});

test('unknown tiers, mixed currencies, formats and private content are rejected', () => {
  for (const value of [
    null, [], {tier:'basic'}, {tier:'pro',strategy:'premium'},
    {tier:'extra',strategy:'all_ai'}, {aspectRatio:'1:1'},
    {tier:'pro',clientId:'person-123'}, {prompt:'private medical notes'},
    {amountMinor:1}, {tier:'video-pro'}, {tier:null}, {strategy:null},
    {aspectRatio:'16:9',audio:true},
  ]) assert.throws(() => planThirtySecondVideoBudget(value), /invalid_paid_video_budget/);
  assert.ok(!JSON.stringify(planThirtySecondVideoBudget()).includes('private medical'));
});
