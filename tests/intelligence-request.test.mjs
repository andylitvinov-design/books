import test from 'node:test';
import assert from 'node:assert/strict';
import { validateIntelligenceRequest } from '../lib/holistic-support/intelligence-request.mjs';

const valid = () => ({
  requestId: 'd4502108-a8b8-4d3b-813f-c255b452bde4', surface: 'cabinet',
  intent: { language: 'ru', selectedTopics: ['stress'], formats: ['video'], maxDurationMinutes: 15 },
});

test('accepts bounded explicit intent without changing it', () => {
  const request = valid();
  assert.deepEqual(validateIntelligenceRequest(request), request);
});
test('rejects client assertions of identity, consent and safety at every boundary', () => {
  for (const [key, value] of Object.entries({ profile: { ownerScoped: true }, actor: { id: 'other' }, consent: { measuredPersonalization: true }, safety: { status: 'clear' }, ownerScoped: true })) {
    assert.throws(() => validateIntelligenceRequest({ ...valid(), [key]: value }), /INVALID_INTELLIGENCE_REQUEST/);
    assert.throws(() => validateIntelligenceRequest({ ...valid(), intent: { ...valid().intent, [key]: value } }), /INVALID_INTELLIGENCE_REQUEST/);
  }
});
test('rejects invalid types, unbounded input and unknown values', () => {
  for (const intent of [
    { language: 'fr' }, { language: 'en', goalText: 'x'.repeat(501) },
    { language: 'en', formats: ['service', 'unknown'] },
    { language: 'en', selectedFacets: ['wrong'] },
    { language: 'en', selectedTopics: Array(41).fill('stress') },
    { language: 'en', maxDurationMinutes: 0 }, { language: 'en', maxDurationMinutes: 241 },
    { language: 'en', selectedTopics: 'stress' },
  ]) assert.throws(() => validateIntelligenceRequest({ ...valid(), intent }), /INVALID_INTELLIGENCE_REQUEST/);
  assert.throws(() => validateIntelligenceRequest({ ...valid(), requestId: 'not-a-uuid' }), /INVALID_INTELLIGENCE_REQUEST/);
  assert.throws(() => validateIntelligenceRequest({ ...valid(), surface: 'admin' }), /INVALID_INTELLIGENCE_REQUEST/);
});
test('preflight accepts only explicit answers and never a claimed safety status', () => {
  const preflight = { immediateDanger: 'no', selfHarmThoughts: 'no' };
  assert.deepEqual(validateIntelligenceRequest({ ...valid(), preflight }).preflight, preflight);
  for (const preflight of [
    { status: 'clear' }, { immediateDanger: 'no', selfHarmThoughts: 'no', status: 'clear' },
    { immediateDanger: false, selfHarmThoughts: 'no' }, { immediateDanger: 'no' },
    { immediateDanger: 'no', selfHarmThoughts: 'never' },
  ]) assert.throws(() => validateIntelligenceRequest({ ...valid(), preflight }), /INVALID_INTELLIGENCE_REQUEST/);
});
test('session dismissals are bounded identifiers, not private history records', () => {
  assert.deepEqual(validateIntelligenceRequest({ ...valid(), session: { dismissedIds: ['youtube:HqfixazXqRY'] } }).session.dismissedIds, ['youtube:HqfixazXqRY']);
  for (const session of [{ accountId: 'other' }, { dismissedIds: ['bad/id'] }, { dismissedIds: Array(81).fill('x') }])
    assert.throws(() => validateIntelligenceRequest({ ...valid(), session }), /INVALID_INTELLIGENCE_REQUEST/);
});
