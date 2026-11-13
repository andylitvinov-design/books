import { validateIntelligenceRequest } from './intelligence-request.mjs';
import { inspectIntelligenceRisk } from './intelligence-risk.mjs';
import { reasonAcrossMeditations } from './client-reasoning-bridge.mjs';
import { CLIENT_REASONING_VERSION } from './client-reasoning-core.mjs';

const copy = {
  en: { reason: 'Matches the topic you selected.', urgent: 'If you may be in danger, contact local emergency services or a qualified crisis service now. This service is not monitored in real time.', preflight: 'Answer both safety questions before receiving a suggestion.', unavailable: 'Suggestions are temporarily unavailable.', limitation: 'Your answers are not a clinical assessment.' },
  ru: { reason: 'Соответствует выбранной вами теме.', urgent: 'Если вам угрожает опасность, немедленно обратитесь в местную экстренную или кризисную службу. Этот сервис не отслеживается в реальном времени.', preflight: 'Ответьте на оба вопроса о безопасности, чтобы получить рекомендацию.', unavailable: 'Рекомендации временно недоступны.', limitation: 'Ваши ответы не являются клинической оценкой.' },
  es: { reason: 'Coincide con el tema que elegiste.', urgent: 'Si puedes estar en peligro, contacta ahora con los servicios locales de emergencia o de crisis. Este servicio no se supervisa en tiempo real.', preflight: 'Responde a las dos preguntas de seguridad antes de recibir una sugerencia.', unavailable: 'Las sugerencias no están disponibles temporalmente.', limitation: 'Tus respuestas no constituyen una evaluación clínica.' },
};

// The route owns authentication, same-origin and request-size enforcement.
// No profile is read here; the loader must be the server's public catalog.
export async function planIntelligenceRequest(input, { loadCatalog } = {}) {
  const request = validateIntelligenceRequest(input);
  const messages = copy[request.intent.language];
  const safety = inspectIntelligenceRisk(request.intent, request.preflight);
  const base = { decisionId: globalThis.crypto.randomUUID(), policyVersion: CLIENT_REASONING_VERSION,
    alternatives: [], limitations: [messages.limitation], feedbackRecording: 'session_only' };
  if (safety.status === 'urgent') return { ...base, status: 'safety_handoff', explanation: messages.urgent };
  if (safety.status !== 'clear') return { ...base, status: 'unavailable', explanation: messages.preflight };
  if (typeof loadCatalog !== 'function') return { ...base, status: 'unavailable', explanation: messages.unavailable };
  try {
    const catalog = await loadCatalog(request.intent.language);
    const result = reasonAcrossMeditations({ intent: request.intent, safety,
      videos: catalog?.videos, publishedSourceIds: catalog?.publishedSourceIds,
      feedback: { dismissedIds: request.session?.dismissedIds }, limit: 3 });
    const toAction = item => ({ id: item.id, kind: item.kind, title: item.title, href: item.href,
      audioLanguage: request.intent.audioLanguage || request.intent.language,
      reasons: [messages.reason], requiresUserConfirmation: true });
    if (result.status === 'recommend') {
      // Check untrusted source titles again before returning them. A cue in a
      // title is not evidence about the client; discard the item, not escalate.
      const safe = result.suggestions.filter(item =>
        inspectIntelligenceRisk({ language: request.intent.language, goalText: item.title }).status !== 'urgent');
      if (!safe.length) return { ...base, status: 'no_match', explanation: messages.unavailable };
      return { ...base, status: 'recommend', primary: toAction(safe[0]),
        alternatives: safe.slice(1, 3).map(toAction), explanation: messages.reason };
    }
    if (result.status === 'clarify' || result.status === 'no_match') return { ...base,
      status: result.status, question: result.question, explanation: result.question?.text || messages.unavailable };
    if (result.status === 'safety_handoff') return { ...base, status: 'safety_handoff', explanation: messages.urgent };
    return { ...base, status: 'unavailable', explanation: messages.unavailable };
  } catch {
    return { ...base, status: 'unavailable', explanation: messages.unavailable };
  }
}
