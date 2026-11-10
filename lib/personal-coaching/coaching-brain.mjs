// Coaching Brain: deterministic, auditable decision layer.
// The methodology engine selects one intervention; only confirmed evidence advances a stage.
import {
  GROW_STAGES, chooseCoachingMethod, selectNextBestAction, assessStageReadiness,
  classifyCoachingDifficulty,
} from './coaching-methodology.mjs';

export const BRAIN_VERSION = 'hh-coaching-brain-v2';
export const STAGES = GROW_STAGES;
export const METHODS = Object.freeze(['grow','woop','oskar','solution_focused','motivational']);

export function selectCoachingMethod({topic='',goal='',resistance=false,preferred=''}={}) {
  const difficulty = classifyCoachingDifficulty({
    message: [topic, goal, resistance ? 'I feel hesitant' : ''].join(' '),
  });
  return chooseCoachingMethod({difficulty,preferredMethod:preferred});
}

/**
 * A message alone never advances the session. The server/session controller must
 * pass explicit evidence from client-confirmed state to readinessEvidence.
 */
export function nextCoachingTurn(input={}) {
  const decision = selectNextBestAction({
    stage: input.stage,
    message: input.message,
    locale: input.locale,
    signals: {
      ...(input.signals || {}),
      preferredMethod: input.preferredMethod,
    },
    depth: input.depth,
    depthConsent: input.depthConsent === true,
    goalRelevant: input.goalRelevant === true,
  });
  const readiness = assessStageReadiness(decision.stage, input.readinessEvidence || {});
  const safety = decision.status === 'safety_hold';
  const nextStage = readiness.ready && !safety
    ? readiness.nextStage
    : decision.stage;

  return Object.freeze({
    version: BRAIN_VERSION,
    locale: decision.locale,
    stage: decision.stage,
    method: decision.method,
    methodReason: decision.methodReason,
    intervention: decision.intervention,
    difficulty: decision.difficulty,
    depth: decision.depth,
    status: safety ? 'safety_interrupt'
      : decision.status === 'stopped' ? 'stopped'
      : decision.status === 'paused' ? 'paused'
      : decision.status === 'skipped' ? 'skipped'
      : readiness.ready ? 'stage_ready'
      : 'await_client',
    reply: decision.question,
    nextStage,
    readiness,
    shouldWaitForClient: decision.shouldWaitForClient,
    evidence: [],
    reason: decision.reason,
  });
}

export function validateBrainSuggestion(value, controller) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!controller || ['safety_interrupt','stopped','paused'].includes(controller.status)) return null;
  if (!STAGES.includes(value.stage) || value.stage !== controller.nextStage) return null;
  if (typeof value.reply !== 'string' || value.reply.trim().length < 8 || value.reply.length > 650) return null;
  if (/(?:diagnos|диагноз|диагност|garantiz|guarantee|гарантир)/i.test(value.reply)) return null;
  // The LLM cannot assert evidence, commitments, stage readiness or client approval.
  return Object.freeze({stage:controller.nextStage,reply:value.reply.trim(),method:controller.method});
}
