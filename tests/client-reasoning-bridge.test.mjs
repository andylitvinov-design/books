import test from 'node:test';
import assert from 'node:assert/strict';
import { reasonAcrossVerifiedOffers } from '../lib/holistic-support/client-reasoning-bridge.mjs';

// Synthetic published content; never a real client profile or testimonial.
const approved = {
  id: 'practice:breathing', kind: 'video', title: 'Breathing pause',
  href: '/ru/academy', published: true, rightsCleared: true,
  editorialReviewed: true, safetyApproved: true, claimsRisk: 'low',
  free: true, audioLanguages: ['ru'], lifeAreas: ['energy_health'],
  topics: ['stress'], targets: [{ facetRef: 'emotions::stress', effect: 'explore', weight: 2 }],
};
const base = {
  intent: { language: 'ru', selectedFacets: ['emotions::stress'] },
  safety: { status: 'clear' },
  knownFacetRefs: ['emotions::stress'], catalogItems: [approved],
};
test('bridge connects verified existing axis ranker to one next action', () => {
  const result = reasonAcrossVerifiedOffers(base);
  assert.equal(result.status, 'recommend');
  assert.equal(result.primary.id, 'practice:breathing');
  assert.equal(result.primary.relevanceClass, 'goal_axis');
  assert.equal(result.modelUsed, false);
});
test('editorially unapproved source is excluded before deciding', () => {
  const result = reasonAcrossVerifiedOffers({ ...base, catalogItems: [{ ...approved, editorialReviewed: false }] });
  assert.equal(result.status, 'no_match');
  assert.deepEqual(result.suggestions, []);
});
test('paid and sensitive material requires independent explicit opt-in', () => {
  const result = reasonAcrossVerifiedOffers({ ...base, catalogItems: [{ ...approved, free: false, sensitive: true }] });
  assert.equal(result.status, 'no_match');
  const paidOnly = reasonAcrossVerifiedOffers({ ...base, consent: { paidSuggestions: true }, catalogItems: [{ ...approved, free: false }] });
  assert.equal(paidOnly.status, 'recommend');
});
test('audio is not invented: existing matcher has not approved audio yet', () => {
  const result = reasonAcrossVerifiedOffers({ ...base, catalogItems: [{ ...approved, kind: 'audio' }] });
  assert.equal(result.status, 'no_match');
});