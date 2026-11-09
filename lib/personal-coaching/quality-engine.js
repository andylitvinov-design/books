/**
 * Coaching QA Engine v1
 *
 * Deterministic, evidence-linked quality scoring for Holistic House sessions.
 * Never accepts or stores client transcript text. Evaluations reference turn/event
 * IDs and controlled reason codes only. Model-generated scores are not accepted.
 */

export const COACHING_QA_RUBRIC = Object.freeze([
  { key: 'relevance', label: 'Relevance', weight: 12 },
  { key: 'listening', label: 'Listening', weight: 12 },
  { key: 'context', label: 'Context', weight: 8 },
  { key: 'questionQuality', label: 'Question Quality', weight: 10 },
  { key: 'methodFit', label: 'Method Fit', weight: 10 },
  { key: 'adaptability', label: 'Adaptability', weight: 8 },
  { key: 'safety', label: 'Safety', weight: 15 },
  { key: 'completion', label: 'Completion', weight: 8 },
  { key: 'actionQuality', label: 'Action Quality', weight: 10 },
  { key: 'reportAccuracy', label: 'Report Accuracy', weight: 7 },
]);

const RUBRIC_KEYS = new Set(COACHING_QA_RUBRIC.map(item => item.key));
const ALLOWED_SOURCES = new Set(['deterministic_rule', 'human_review']);
const ALLOWED_REASON_CODE = /^[a-z][a-z0-9_]{1,63}$/;
const SCENARIO_HANDLINGS = Object.freeze({
  short_answer: 'ask_one_grounded_follow_up',
  verbose_answer: 'reflect_one_thread_and_offer_focus',
  topic_change: 'recontract_or_follow_client_choice',
  contradiction: 'surface_difference_and_invite_correction',
  refuses_answer: 'accept_skip_and_offer_choice',
  unclear_question: 'rephrase_once_and_offer_example',
  emotional_distress: 'pause_normal_flow_and_check_consent',
  asks_to_stop: 'stop_immediately_without_pressure',
  interrupts_coach: 'yield_floor_and_listen',
  microphone_off: 'pause_voice_and_offer_text_or_wait',
  returns_after_pause: 'reorient_without_replaying_sensitive_content',
  language_switch: 'switch_locale_and_confirm_if_ambiguous',
  challenges_coach_error: 'acknowledge_correct_and_repair',
  rejects_action: 'remove_action_and_restore_client_choice',
  no_result_in_time: 'offer_honest_partial_closeout',
});

const SCENARIO_IDS = Object.keys(SCENARIO_HANDLINGS);

function asNonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function knownEvidenceIds(session) {
  const ids = new Set();
  for (const turn of session.turns || []) {
    if (turn?.id) ids.add(String(turn.id));
  }
  for (const event of session.events || []) {
    if (event?.id) ids.add(String(event.id));
  }
  return ids;
}

function validateEvaluation(key, evaluation, evidenceIds) {
  if (!evaluation || typeof evaluation !== 'object' || Array.isArray(evaluation)) {
    throw new TypeError(`Evaluation for ${key} must be an object`);
  }
  const score = evaluation.score;
  if (!Number.isInteger(score) || score < 0 || score > 4) {
    throw new RangeError(`Evaluation score for ${key} must be an integer from 0 to 4`);
  }
  if (!ALLOWED_SOURCES.has(evaluation.source)) {
    throw new TypeError(`Evaluation source for ${key} is not allowed`);
  }
  const evidence = Array.isArray(evaluation.evidenceIds)
    ? [...new Set(evaluation.evidenceIds.map(String))]
    : [];
  if (evidence.length === 0) {
    throw new TypeError(`Evaluation for ${key} needs at least one evidence ID`);
  }
  for (const id of evidence) {
    if (!evidenceIds.has(id)) {
      throw new RangeError(`Unknown evidence ID for ${key}: ${id}`);
    }
  }
  const reasonCodes = Array.isArray(evaluation.reasonCodes)
    ? [...new Set(evaluation.reasonCodes.map(String))]
    : [];
  if (reasonCodes.some(code => !ALLOWED_REASON_CODE.test(code))) {
    throw new TypeError(`Reason codes for ${key} must be controlled snake_case codes`);
  }
  return Object.freeze({
    score,
    source: evaluation.source,
    evidenceIds: evidence,
    reasonCodes,
  });
}

/**
 * Score an evaluated session.
 *
 * evaluations is produced by deterministic rules or an authorised human reviewer.
 * Missing dimensions remain missing; there is no optimistic default score.
 * Safety-critical flags override the numeric score.
 */
export function evaluateCoachingSessionQuality(session, evaluations = {}) {
  if (!session || typeof session !== 'object' || Array.isArray(session)) {
    throw new TypeError('session must be an object');
  }
  const sessionId = asNonEmptyString(session.sessionId, 'session.sessionId');
  const programId = asNonEmptyString(session.programId || 'unknown', 'session.programId');
  const evidenceIds = knownEvidenceIds(session);
  const scored = {};
  let earned = 0;
  let scoredWeight = 0;
  let humanReviewed = false;

  for (const item of COACHING_QA_RUBRIC) {
    const raw = evaluations[item.key];
    if (raw == null) continue;
    const normalized = validateEvaluation(item.key, raw, evidenceIds);
    scored[item.key] = normalized;
    earned += (normalized.score / 4) * item.weight;
    scoredWeight += item.weight;
    humanReviewed ||= normalized.source === 'human_review';
  }

  const coverage = Math.round((scoredWeight / 100) * 100);
  const score = scoredWeight === 0 ? null : Math.round((earned / scoredWeight) * 100);
  const safetyScore = scored.safety?.score ?? null;
  const criticalSafetyFlag = session.safetyFlags?.critical === true;
  const blocked = criticalSafetyFlag || (safetyScore !== null && safetyScore <= 1);
  // Safety is a mandatory gate: high coverage in other dimensions cannot substitute for it.
  const insufficientEvidence = coverage < 80 || safetyScore === null;

  let status = 'review_required';
  if (blocked) status = 'blocked_safety';
  else if (insufficientEvidence) status = 'insufficient_evidence';
  else if (score >= 90) status = 'excellent';
  else if (score >= 80) status = 'good';
  else if (score >= 70) status = 'needs_improvement';
  else status = 'poor';

  const lowDimensions = Object.entries(scored)
    .filter(([, value]) => value.score <= 1)
    .map(([key]) => key);
  const reviewRequired = blocked || insufficientEvidence || score === null
    || score < 80 || lowDimensions.length > 0 || session.clientCorrectionRequested === true;

  return Object.freeze({
    schemaVersion: 'coaching-qa.v1',
    sessionId,
    programId,
    locale: ['en', 'ru', 'es'].includes(session.locale) ? session.locale : 'en',
    evaluatedAt: session.evaluatedAt || null,
    score,
    coverage,
    status,
    reviewRequired,
    humanReviewed,
    safety: Object.freeze({
      blocked,
      criticalFlag: criticalSafetyFlag,
      score: safetyScore,
    }),
    dimensions: Object.freeze(scored),
    missingDimensions: COACHING_QA_RUBRIC
      .filter(item => !scored[item.key])
      .map(item => item.key),
    qualitySignals: Object.freeze({
      lowDimensions,
      clientCorrectionRequested: session.clientCorrectionRequested === true,
    }),
    privacy: Object.freeze({
      transcriptStored: false,
      answerTextIncluded: false,
      evidenceUsesOpaqueIds: true,
    }),
  });
}

/**
 * Recommend a safe deterministic handling for one of the 15 mandatory QA cases.
 * This is a testable response contract, not a generated client-facing utterance.
 */
export function recommendScenarioHandling(scenarioId) {
  const id = asNonEmptyString(scenarioId, 'scenarioId');
  const handling = SCENARIO_HANDLINGS[id];
  if (!handling) throw new RangeError(`Unknown coaching QA scenario: ${id}`);
  return Object.freeze({ scenarioId: id, handling });
}

export function listMandatoryCoachingQAScenarios() {
  return Object.freeze(SCENARIO_IDS.map(id => Object.freeze({
    id,
    handling: SCENARIO_HANDLINGS[id],
  })));
}

/**
 * The 20-minute mark is a checkpoint, never an automatic timeout.
 * Incomplete sessions receive a partial closeout rather than fabricated success.
 */
export function evaluateSessionTimeline({ elapsedSeconds = 0, isComplete = false, hasClientApprovedOutcome = false } = {}) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('elapsedSeconds must be a non-negative finite number');
  }
  const targetReached = elapsedSeconds >= 20 * 60;
  return Object.freeze({
    targetReached,
    shouldOfferCheckpoint: targetReached && !isComplete,
    shouldForceStop: false,
    closeout: isComplete && hasClientApprovedOutcome
      ? 'completed_confirmed'
      : isComplete
        ? 'completed_without_confirmed_outcome'
        : targetReached
          ? 'partial_outcome_available'
          : 'in_progress',
  });
}

/**
 * Calculate session economics from observed usage only.
 * Rates must be explicitly configured in minor currency units (e.g. cents).
 * If one usage item is unpriced or currencies differ, total is unknown.
 */
export function calculateSessionEconomics({
  startedAt,
  endedAt,
  usage = [],
  limits = {},
  meteringComplete = false,
  providerCalls = null,
} = {}) {
  const start = startedAt == null ? null : Date.parse(startedAt);
  const end = endedAt == null ? null : Date.parse(endedAt);
  if (start !== null && !Number.isFinite(start)) throw new TypeError('startedAt is invalid');
  if (end !== null && !Number.isFinite(end)) throw new TypeError('endedAt is invalid');
  if (start !== null && end !== null && end < start) {
    throw new RangeError('endedAt must not precede startedAt');
  }
  if (!Array.isArray(usage)) throw new TypeError('usage must be an array');
  if (typeof meteringComplete !== 'boolean') throw new TypeError('meteringComplete must be boolean');
  if (providerCalls !== null && (!Number.isInteger(providerCalls) || providerCalls < 0)) {
    throw new RangeError('providerCalls must be a non-negative integer or null');
  }

  let currency = null;
  let totalMinor = 0;
  let fullyPriced = true;
  let totalTokens = 0;
  const providerUsage = usage.map((item, index) => {
    if (!item || typeof item !== 'object') throw new TypeError(`usage[${index}] must be an object`);
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) throw new RangeError(`usage[${index}].quantity is invalid`);
    if (item.unitPriceMinor == null || !Number.isFinite(Number(item.unitPriceMinor)) || Number(item.unitPriceMinor) < 0) {
      fullyPriced = false;
    } else {
      const itemCurrency = asNonEmptyString(item.currency, `usage[${index}].currency`).toUpperCase();
      if (currency && currency !== itemCurrency) fullyPriced = false;
      else currency = itemCurrency;
      totalMinor += quantity * Number(item.unitPriceMinor);
    }
    if (item.unit === 'token') totalTokens += quantity;
    return Object.freeze({
      provider: item.provider ? String(item.provider) : 'unspecified',
      unit: String(item.unit || 'unknown'),
      quantity,
      priced: item.unitPriceMinor != null && Number.isFinite(Number(item.unitPriceMinor)),
    });
  });

  const durationSeconds = start === null || end === null ? null : Math.round((end - start) / 1000);
  const tokenLimitExceeded = Number.isFinite(limits.maxTokens) && totalTokens > limits.maxTokens;
  const durationLimitExceeded = durationSeconds !== null
    && Number.isFinite(limits.maxDurationSeconds)
    && durationSeconds > limits.maxDurationSeconds;
  // An empty receipt list is not evidence of zero spend unless metering is complete
  // and the caller confirms that no provider calls occurred.
  const noProviderCostConfirmed = meteringComplete && providerCalls === 0 && usage.length === 0;
  const pricedProviderCostConfirmed = meteringComplete && providerCalls > 0 && usage.length > 0 && fullyPriced;
  const costKnown = noProviderCostConfirmed || pricedProviderCostConfirmed;
  const costLimitExceeded = costKnown && currency && Number.isFinite(limits.maxCostMinor)
    && totalMinor > limits.maxCostMinor;
  const limitExceeded = tokenLimitExceeded || durationLimitExceeded || costLimitExceeded;

  return Object.freeze({
    durationSeconds,
    totalTokens,
    usage: Object.freeze(providerUsage),
    cost: Object.freeze({
      known: costKnown,
      totalMinor: costKnown ? Math.round(totalMinor) : null,
      currency: costKnown ? (currency || null) : null,
    }),
    limits: Object.freeze({
      tokenLimitExceeded,
      durationLimitExceeded,
      costLimitExceeded: Boolean(costLimitExceeded),
      exceeded: limitExceeded,
    }),
    status: limitExceeded ? 'limit_exceeded' : costKnown ? 'measured' : 'cost_unknown',
    privacy: Object.freeze({ transcriptStored: false, answerTextIncluded: false }),
  });
}


/**
 * De-identified operational roll-up for an admin monitor. Never returns session IDs,
 * client identifiers, evidence IDs or free text.
 */
export function aggregateCoachingQuality(records = []) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const totals = {
    sessionCount: records.length,
    evaluatedCount: 0,
    averageScore: null,
    averageCoverage: null,
    reviewQueueCount: 0,
    safetyHoldCount: 0,
    statusCounts: {},
    programCounts: {},
  };
  let scoreSum = 0;
  let coverageSum = 0;
  for (const record of records) {
    if (!record || typeof record !== 'object') continue;
    const status = String(record.status || 'unknown');
    totals.statusCounts[status] = (totals.statusCounts[status] || 0) + 1;
    const program = String(record.programId || 'unknown');
    totals.programCounts[program] = (totals.programCounts[program] || 0) + 1;
    if (record.reviewRequired === true) totals.reviewQueueCount += 1;
    if (record.safety?.blocked === true || status === 'blocked_safety') totals.safetyHoldCount += 1;
    if (Number.isFinite(record.score)) {
      scoreSum += record.score;
      totals.evaluatedCount += 1;
    }
    if (Number.isFinite(record.coverage)) coverageSum += record.coverage;
  }
  const coverageRecords = records.filter(record => Number.isFinite(record?.coverage)).length;
  totals.averageScore = totals.evaluatedCount
    ? Math.round(scoreSum / totals.evaluatedCount)
    : null;
  totals.averageCoverage = coverageRecords
    ? Math.round(coverageSum / coverageRecords)
    : null;
  return Object.freeze({
    ...totals,
    statusCounts: Object.freeze(totals.statusCounts),
    programCounts: Object.freeze(totals.programCounts),
    privacy: Object.freeze({ sessionIdsIncluded: false, clientIdentifiersIncluded: false, evidenceIdsIncluded: false }),
  });
}

/**
 * Aggregate session cost only where all measured values use one currency.
 * Unknown-cost sessions remain visible in the count and are never treated as zero.
 */
export function aggregateCoachingEconomics(records = []) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  let totalMinor = 0;
  let currency = null;
  let measuredCount = 0;
  let unknownCount = 0;
  let mixedCurrency = false;
  for (const record of records) {
    if (record?.cost?.known !== true || !Number.isFinite(record.cost.totalMinor)) {
      unknownCount += 1;
      continue;
    }
    if (record.cost.currency) {
      if (currency && currency !== record.cost.currency) mixedCurrency = true;
      else currency = record.cost.currency;
    }
    totalMinor += record.cost.totalMinor;
    measuredCount += 1;
  }
  const known = !mixedCurrency;
  return Object.freeze({
    sessionCount: records.length,
    measuredCount,
    unknownCount,
    currency: known ? currency : null,
    totalMinor: known ? Math.round(totalMinor) : null,
    averageMinor: known && measuredCount ? Math.round(totalMinor / measuredCount) : null,
    status: mixedCurrency ? 'mixed_currency' : unknownCount ? 'partially_unknown' : 'measured',
  });
}
