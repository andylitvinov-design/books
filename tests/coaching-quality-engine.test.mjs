import test from 'node:test';
// Keep Coaching Brain regression coverage in the existing focused coaching CI job.
import './coaching-brain.test.mjs';
import assert from 'node:assert/strict';
import {
  COACHING_QA_RUBRIC,
  aggregateCoachingEconomics,
  aggregateCoachingQuality,
  calculateSessionEconomics,
  evaluateCoachingSessionQuality,
  evaluateSessionTimeline,
  listMandatoryCoachingQAScenarios,
  recommendScenarioHandling,
} from '../lib/personal-coaching/quality-engine.js';

const session = {
  sessionId: 'qa-session-01',
  programId: 'grow-overload-to-plan-v1',
  locale: 'ru',
  turns: [{ id: 'turn-1' }, { id: 'turn-2' }],
  events: [{ id: 'event-1' }],
};

function completeEvaluations(score = 4) {
  return Object.fromEntries(COACHING_QA_RUBRIC.map(({ key }) => [key, {
    score,
    source: 'deterministic_rule',
    evidenceIds: ['turn-1'],
    reasonCodes: ['evidence_found'],
  }]));
}

test('rubric contains ten dimensions with weights summing to 100', () => {
  assert.equal(COACHING_QA_RUBRIC.length, 10);
  assert.equal(COACHING_QA_RUBRIC.reduce((sum, item) => sum + item.weight, 0), 100);
});

test('fully evidenced excellent session receives 100 and no review requirement', () => {
  const result = evaluateCoachingSessionQuality(session, completeEvaluations());
  assert.equal(result.score, 100);
  assert.equal(result.coverage, 100);
  assert.equal(result.status, 'excellent');
  assert.equal(result.reviewRequired, false);
  assert.equal(result.privacy.transcriptStored, false);
});

test('missing dimensions reduce evidence coverage and cannot be counted as passing', () => {
  const evaluations = completeEvaluations();
  delete evaluations.reportAccuracy;
  delete evaluations.actionQuality;
  delete evaluations.completion;
  const result = evaluateCoachingSessionQuality(session, evaluations);
  assert.equal(result.coverage, 75);
  assert.equal(result.status, 'insufficient_evidence');
  assert.deepEqual(result.missingDimensions, ['completion', 'actionQuality', 'reportAccuracy']);
  assert.equal(result.reviewRequired, true);
});

test('critical safety signal overrides a high numeric score', () => {
  const result = evaluateCoachingSessionQuality(
    { ...session, safetyFlags: { critical: true } },
    completeEvaluations(),
  );
  assert.equal(result.score, 100);
  assert.equal(result.status, 'blocked_safety');
  assert.equal(result.safety.blocked, true);
  assert.equal(result.reviewRequired, true);
});

test('low safety score blocks release even with all other dimensions high', () => {
  const evaluations = completeEvaluations();
  evaluations.safety = { score: 1, source: 'human_review', evidenceIds: ['event-1'], reasonCodes: ['boundary_breach'] };
  const result = evaluateCoachingSessionQuality(session, evaluations);
  assert.equal(result.status, 'blocked_safety');
  assert.equal(result.humanReviewed, true);
});

test('quality input rejects unsupported model scoring source', () => {
  const evaluations = completeEvaluations();
  evaluations.listening.source = 'llm_judge';
  assert.throws(() => evaluateCoachingSessionQuality(session, evaluations), /Evaluation source .* is not allowed/);
});

test('quality input rejects evidence IDs not present in the session', () => {
  const evaluations = completeEvaluations();
  evaluations.relevance.evidenceIds = ['not-a-turn'];
  assert.throws(() => evaluateCoachingSessionQuality(session, evaluations), /Unknown evidence ID/);
});

test('quality input rejects transcript text in place of controlled reason codes', () => {
  const evaluations = completeEvaluations();
  evaluations.relevance.reasonCodes = ['The client said a private sentence'];
  assert.throws(() => evaluateCoachingSessionQuality(session, evaluations), /controlled snake_case/);
});

test('client correction forces human review without exposing answer text', () => {
  const result = evaluateCoachingSessionQuality(
    { ...session, clientCorrectionRequested: true },
    completeEvaluations(3),
  );
  assert.equal(result.reviewRequired, true);
  assert.equal(result.qualitySignals.clientCorrectionRequested, true);
  assert.equal(Object.hasOwn(result, 'transcript'), false);
});

test('all 15 mandatory client-behaviour scenarios have a deterministic safe handling', () => {
  const scenarios = listMandatoryCoachingQAScenarios();
  assert.equal(scenarios.length, 15);
  for (const scenario of scenarios) {
    assert.equal(recommendScenarioHandling(scenario.id).handling, scenario.handling);
  }
});

test('stop request maps to immediate stop, not persuasion', () => {
  assert.equal(
    recommendScenarioHandling('asks_to_stop').handling,
    'stop_immediately_without_pressure',
  );
});

test('distress interrupts ordinary coaching and requests a consent check', () => {
  assert.equal(
    recommendScenarioHandling('emotional_distress').handling,
    'pause_normal_flow_and_check_consent',
  );
});

test('20-minute target offers checkpoint but never forces session termination', () => {
  const result = evaluateSessionTimeline({ elapsedSeconds: 1200, isComplete: false });
  assert.equal(result.targetReached, true);
  assert.equal(result.shouldOfferCheckpoint, true);
  assert.equal(result.shouldForceStop, false);
  assert.equal(result.closeout, 'partial_outcome_available');
});

test('incomplete session has an honest partial closeout and no fabricated result', () => {
  assert.equal(
    evaluateSessionTimeline({ elapsedSeconds: 1500, isComplete: true }).closeout,
    'completed_without_confirmed_outcome',
  );
});

test('economics calculates provider cost only from observed priced usage', () => {
  const result = calculateSessionEconomics({
    startedAt: '2026-11-09T14:00:00.000Z',
    endedAt: '2026-11-09T14:20:00.000Z',
    meteringComplete: true,
    providerCalls: 2,
    usage: [
      { provider: 'approved-llm', unit: 'token', quantity: 1000, unitPriceMinor: 2, currency: 'USD' },
      { provider: 'approved-voice', unit: 'minute', quantity: 4, unitPriceMinor: 3, currency: 'USD' },
    ],
    limits: { maxDurationSeconds: 1500, maxTokens: 2000, maxCostMinor: 20 },
  });
  assert.equal(result.durationSeconds, 1200);
  assert.equal(result.totalTokens, 1000);
  assert.equal(result.cost.totalMinor, 2012);
  assert.equal(result.cost.currency, 'USD');
  assert.equal(result.status, 'limit_exceeded');
});

test('unpriced or mixed-currency provider usage remains cost-unknown', () => {
  const result = calculateSessionEconomics({
    meteringComplete: true,
    providerCalls: 2,
    usage: [
      { provider: 'provider-a', unit: 'token', quantity: 200, unitPriceMinor: 1, currency: 'USD' },
      { provider: 'provider-b', unit: 'minute', quantity: 2 },
    ],
  });
  assert.equal(result.cost.known, false);
  assert.equal(result.cost.totalMinor, null);
  assert.equal(result.status, 'cost_unknown');
});

test('deterministic/no-provider session costs zero rather than inventing a model charge', () => {
  const result = calculateSessionEconomics({ usage: [], meteringComplete: true, providerCalls: 0 });
  assert.equal(result.cost.known, true);
  assert.equal(result.cost.totalMinor, 0);
  assert.equal(result.status, 'measured');
});

test('mixed currency cannot produce a false summed total', () => {
  const result = calculateSessionEconomics({
    meteringComplete: true,
    providerCalls: 2,
    usage: [
      { provider: 'a', unit: 'token', quantity: 10, unitPriceMinor: 1, currency: 'USD' },
      { provider: 'b', unit: 'minute', quantity: 2, unitPriceMinor: 2, currency: 'CAD' },
    ],
  });
  assert.equal(result.cost.totalMinor, null);
  assert.equal(result.status, 'cost_unknown');
});

test('usage limits are independently observable', () => {
  const result = calculateSessionEconomics({
    startedAt: '2026-11-09T14:00:00.000Z',
    endedAt: '2026-11-09T15:00:00.000Z',
    meteringComplete: true,
    providerCalls: 1,
    usage: [{ unit: 'token', quantity: 9000, unitPriceMinor: 1, currency: 'CAD' }],
    limits: { maxDurationSeconds: 1800, maxTokens: 5000, maxCostMinor: 500 },
  });
  assert.equal(result.limits.durationLimitExceeded, true);
  assert.equal(result.limits.tokenLimitExceeded, true);
  assert.equal(result.limits.costLimitExceeded, true);
  assert.equal(result.status, 'limit_exceeded');
});


test('missing safety evaluation blocks a high-coverage score until safety is reviewed', () => {
  const evaluations = completeEvaluations();
  delete evaluations.safety;
  const result = evaluateCoachingSessionQuality(session, evaluations);
  assert.equal(result.coverage, 85);
  assert.equal(result.status, 'insufficient_evidence');
  assert.equal(result.reviewRequired, true);
});

test('quality cohort roll-up excludes session and client identifiers', () => {
  const first = evaluateCoachingSessionQuality(session, completeEvaluations());
  const second = evaluateCoachingSessionQuality(
    { ...session, sessionId: 'another-private-id', programId: 'grow-overload-to-plan-v1' },
    completeEvaluations(3),
  );
  const summary = aggregateCoachingQuality([first, second]);
  assert.equal(summary.sessionCount, 2);
  assert.equal(summary.averageScore, 88);
  assert.equal(summary.reviewQueueCount, 1);
  assert.equal(summary.privacy.sessionIdsIncluded, false);
  assert.equal(Object.hasOwn(summary, 'sessionIds'), false);
});

test('economics roll-up preserves unknown records and refuses mixed currencies', () => {
  const known = calculateSessionEconomics({
    meteringComplete: true,
    providerCalls: 1,
    usage: [{ unit: 'token', quantity: 10, unitPriceMinor: 2, currency: 'CAD' }],
  });
  const unknown = calculateSessionEconomics({
    usage: [{ unit: 'minute', quantity: 2 }],
  });
  const summary = aggregateCoachingEconomics([known, unknown]);
  assert.equal(summary.sessionCount, 2);
  assert.equal(summary.measuredCount, 1);
  assert.equal(summary.unknownCount, 1);
  assert.equal(summary.totalMinor, 20);
  assert.equal(summary.status, 'partially_unknown');
});


test('empty usage is not zero cost unless complete metering confirms no provider calls', () => {
  const missingMetering = calculateSessionEconomics({ usage: [] });
  const missingReceipt = calculateSessionEconomics({
    usage: [],
    meteringComplete: true,
    providerCalls: 1,
  });
  assert.equal(missingMetering.cost.known, false);
  assert.equal(missingMetering.cost.totalMinor, null);
  assert.equal(missingReceipt.cost.known, false);
  assert.equal(missingReceipt.status, 'cost_unknown');
});

test('provider-call count must be a non-negative integer', () => {
  assert.throws(() => calculateSessionEconomics({ providerCalls: -1 }), /non-negative integer/);
  assert.throws(() => calculateSessionEconomics({ providerCalls: 1.5 }), /non-negative integer/);
});
