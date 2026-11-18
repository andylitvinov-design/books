import { resolveHomeGuideQuestion } from '../home-conversation.mjs';

// Reuse the public guide's reviewed escalation cues. They are not a clinical
// screening tool: absence of a cue cannot establish that a person is safe.
// Clear only means both immediate-risk questions received explicit "no".
export function inspectIntelligenceRisk(intent, preflight) {
  if (!intent || (intent.goalText !== undefined &&
      (typeof intent.goalText !== 'string' || intent.goalText.length > 500))) return { status: 'unknown' };
  const locale = ['en', 'ru', 'es'].includes(intent.language) ? intent.language : 'en';
  if (intent.goalText && resolveHomeGuideQuestion(intent.goalText, locale).urgent)
    return { status: 'urgent' };
  if (!preflight || typeof preflight !== 'object' || Array.isArray(preflight) ||
      Object.keys(preflight).sort().join(',') !== 'immediateDanger,selfHarmThoughts' ||
      !['yes', 'no', 'unsure'].includes(preflight.immediateDanger) ||
      !['yes', 'no', 'unsure'].includes(preflight.selfHarmThoughts)) return { status: 'unknown' };
  if (preflight.immediateDanger === 'yes' || preflight.selfHarmThoughts === 'yes')
    return { status: 'urgent' };
  return { status: preflight.immediateDanger === 'no' && preflight.selfHarmThoughts === 'no' ? 'clear' : 'unknown' };
}
