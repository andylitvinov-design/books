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

test('accepts only voluntary client actions; never accepts client-asserted publication or private authority', () => {
  const base = valid();
  for (const clientAction of ['request_suggestion', 'change_goal', 'decline', 'continue']) {
    const request = { ...base, clientAction };
    assert.equal(validateIntelligenceRequest(request), request);
  }
  for (const clientAction of ['publish', 'approve', 'unlock_private', 'bypass_safety', '', null, 1, {}]) {
    assert.throws(() => validateIntelligenceRequest({ ...base, clientAction }), /INVALID_INTELLIGENCE_REQUEST/);
  }
  for (const privileged of ['accountId', 'trustedOwner', 'authorized', 'consentGranted', 'publicProfile']) {
    assert.throws(() => validateIntelligenceRequest({ ...base, [privileged]: true }), /INVALID_INTELLIGENCE_REQUEST/);
  }
});
