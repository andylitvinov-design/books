import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION_KINDS, CLIENT_REASONING_VERSION, compareVoluntaryCheckins,
  prepareReasoningContext, planClientNextStep,
} from '../lib/holistic-support/client-reasoning-core.mjs';

const item = (id, { free = true, kind = 'video', rankClass = 'goal_axis',
  href = '/en/academy/practice', ...overrides } = {}) => ({
  id, kind, rankClass,
  item: { id, title: id, href, free, ...overrides },
  matchedAxes: [{ selected: true }], matchedTopics: [], matchedLifeAreas: [],
});
const base = {
  intent: { language: 'ru', selectedFacets: ['connection::boundaries'] },
  consent: {}, safety: { status: 'clear' },
  knownFacetRefs: ['connection::boundaries'],
  catalogItems: [], rankOffers: () => [item('video:abc'), item('course:xyz', { kind: 'course' })],
};

test('contract is versioned and includes future audio kind without fake entries', () => {
  assert.equal(CLIENT_REASONING_VERSION, 'hh-client-reasoning-v1');
  assert.ok(ACTION_KINDS.includes('audio'));
});
test('urgent or human review stops recommendations before ranker execution', () => {
  for (const status of ['urgent', 'human_review']) {
    const result = planClientNextStep({ ...base, safety: { status }, rankOffers: () => { throw Error('must not execute'); } });
    assert.equal(result.status, 'safety_handoff');
    assert.equal(result.suggestions.length, 0);
    assert.equal(result.humanSupportPreferred, true);
  }
});
test('unknown safety preflight fails closed', () => {
  const result = planClientNextStep({ ...base, safety: {} });
  assert.equal(result.status, 'safety_check_required');
  assert.equal(result.suggestions.length, 0);
});
test('empty intent results in one question, not a fabricated diagnosis', () => {
  const result = planClientNextStep({ ...base, intent: { language: 'ru' } });
  assert.equal(result.status, 'clarify');
  assert.equal(result.question.key, 'choose_goal');
  assert.equal(result.suggestions.length, 0);
});
test('profile evidence cannot enter ranker without owner and both opt-ins', () => {
  const profile = { authenticated: true, ownerScoped: true, measurements: [{ secret: 42 }], confirmedTopics: ['stress'] };
  const unconsented = prepareReasoningContext({ profile, consent: { profilePersonalization: true } });
  assert.equal(unconsented.measurements.length, 0);
  assert.equal(unconsented.allowMeasuredPersonalization, false);
  const allowed = prepareReasoningContext({ profile, consent: { profilePersonalization: true, measuredPersonalization: true } });
  assert.equal(allowed.allowMeasuredPersonalization, true);
  const unowned = prepareReasoningContext({ profile: { ...profile, ownerScoped: false }, consent: { profilePersonalization: true, measuredPersonalization: true } });
  assert.deepEqual(unowned.measurements, []);
  assert.deepEqual(unowned.selectedTopics, []);
});
test('current user focus overrides remembered, owner-approved focus', () => {
  const context = prepareReasoningContext({
    intent: { selectedTopics: ['focus'], language: 'es' },
    profile: { authenticated: true, ownerScoped: true, confirmedTopics: ['sleep'] },
    consent: { profilePersonalization: true },
  });
  assert.deepEqual(context.selectedTopics, ['focus']);
  assert.equal(context.language, 'es');
});
test('a newly selected topic does not silently retain an old profile facet or area', () => {
  const context = prepareReasoningContext({
    intent: { selectedTopics: ['focus'] },
    profile: { authenticated: true, ownerScoped: true, confirmedFacets: ['emotions::stress'], confirmedLifeAreas: ['relationships'] },
    consent: { profilePersonalization: true },
  });
  assert.deepEqual(context.selectedTopics, ['focus']);
  assert.deepEqual(context.selectedFacets, []);
  assert.deepEqual(context.lifeAreas, []);
});
test('no ranker returns unavailable rather than unreviewed fallback', () => {
  assert.equal(planClientNextStep({ ...base, rankOffers: undefined }).status, 'unavailable');
});
test('output provides explanation codes, no raw scoring or profile values', () => {
  const res = planClientNextStep({ ...base, rankOffers: () => [{
    ...item('video:a'), score: 99, matchedAxes: [{ selected: true, measurement: { rawValue: 9, resultId: 'secret' } }],
  }] });
  assert.equal(res.status, 'recommend');
  assert.deepEqual(res.primary.reasons, ['goal_axis', 'client_chosen_focus', 'verified_measured_source']);
  assert.equal(res.primary.requiresUserConfirmation, true);
  assert.ok(!JSON.stringify(res).includes('rawValue'));
  assert.ok(!JSON.stringify(res).includes('secret'));
  assert.ok(!JSON.stringify(res).includes('99'));
});
test('dismissed recommendations removed; completed shown only after unseen', () => {
  const res = planClientNextStep({ ...base,
    rankOffers: () => [item('video:a'), item('video:b'), item('video:c')],
    feedback: { completedIds: ['video:a'], dismissedIds: ['video:c'] },
  });
  assert.deepEqual(res.suggestions.map(x => x.id), ['video:b', 'video:a']);
});
test('unsafe URLs and malformed untrusted results cannot enter decisions', () => {
  const res = planClientNextStep({ ...base, rankOffers: () => [item('video:a', { href: 'javascript:alert(1)' }), item('video:b', { href: '//evil.example' })] });
  assert.equal(res.status, 'no_match');
  assert.equal(res.question.key, 'broaden_search');
});
test('backslash URLs cannot escape the site when opened in a browser', () => {
  const href = '/\\evil.example/path';
  assert.equal(new URL(href, 'https://holistichouse.vercel.app').origin, 'https://evil.example');
  const result = planClientNextStep({ ...base, rankOffers: () => [item('video:escape', { href })] });
  assert.equal(result.status, 'no_match');
});
test('limit has a hard cap and deterministic selection', () => {
  const res = planClientNextStep({ ...base, limit: 100, rankOffers: () => Array.from({ length: 10 }, (_, i) => item('video:' + i)) });
  assert.equal(res.suggestions.length, 5);
  assert.equal(res.primary.id, 'video:0');
});
test('comparisons are voluntary and never clinical outcome claims', () => {
  const a = { promptKey: 'self_calm', value: 3, measuredAt: '2026-10-28T11:00:00Z' };
  const b = { promptKey: 'self_calm', value: 6, measuredAt: '2026-10-28T11:20:00Z' };
  assert.deepEqual(compareVoluntaryCheckins(a, b), {
    promptKey: 'self_calm', before: 3, after: 6, change: 3,
    evidenceType: 'voluntary_self_report', efficacyClaim: false, saveRequiresConsent: true,
  });
  assert.equal(compareVoluntaryCheckins(a, { ...b, promptKey: 'self_sleep' }), null);
  assert.equal(compareVoluntaryCheckins(a, { ...b, measuredAt: '2026-10-27T11:20:00Z' }), null);
});
