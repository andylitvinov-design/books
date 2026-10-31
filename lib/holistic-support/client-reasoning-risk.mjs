import { resolveHomeGuideQuestion } from '../home-conversation.mjs';

// Reuse the public guide's reviewed escalation cues. They are not a clinical
// screening tool: absence of a cue cannot establish that a person is safe.
// A separate trusted preflight must establish any later clear status.
export function inspectIntelligenceRisk(intent) {
  if (!intent || typeof intent.goalText !== 'string' || intent.goalText.length > 500)
    return { status: 'unknown' };
  const locale = ['en', 'ru', 'es'].includes(intent.language) ? intent.language : 'en';
  return { status: resolveHomeGuideQuestion(intent.goalText, locale).urgent ? 'urgent' : 'unknown' };
}
