import { validateIntelligenceRequest } from './intelligence-request.mjs';
import { inspectIntelligenceRisk } from './intelligence-risk.mjs';
import { reasonAcrossMeditations, reasonAcrossTests } from './client-reasoning-bridge.mjs';
import { CLIENT_REASONING_VERSION } from './client-reasoning-core.mjs';

const copy = {
  en: { reason: 'Matches the topic you selected.', urgent: 'If you may be in danger, contact local emergency services or a qualified crisis service now. This service is not monitored in real time.', preflight: 'Answer both safety questions before receiving a suggestion.', unavailable: 'Suggestions are temporarily unavailable.', limitation: 'Your answers are not a clinical assessment.' },
  ru: { reason: 'Соответствует выбранной вами теме.', urgent: 'Если вам угрожает опасность, немедленно обратитесь в местную экстренную или кризисную службу. Этот сервис не отслеживается в реальном времени.', preflight: 'Ответьте на оба вопроса о безопасности, чтобы получить рекомендацию.', unavailable: 'Рекомендации временно недоступны.', limitation: 'Ваши ответы не являются клинической оценкой.' },
  es: { reason: 'Coincide con el tema que elegiste.', urgent: 'Si puedes estar en peligro, contacta ahora con los servicios locales de emergencia o de crisis. Este servicio no se supervisa en tiempo real.', preflight: 'Responde a las dos preguntas de seguridad antes de recibir una sugerencia.', unavailable: 'Las sugerencias no están disponibles temporalmente.', limitation: 'Tus respuestas no constituyen una evaluación clínica.' },
};
const savedReason = {en:'Matches your saved coaching topic.',ru:'Соответствует сохранённой теме вашей коучинговой сессии.',es:'Coincide con el tema guardado de tu sesión de coaching.'};

// A topic was explicitly selected by the owner in this existing coaching
// session. A saved plan alone does not justify inferring a new topic from its
// free text or treating a proposed axis crosswalk as an approved mapping.
function confirmedCoachingTopic(snapshot) {
  const current = snapshot?.course?.current, plan = current?.actionPlan;
  const approved = typeof plan?.approvedAt === 'string' ? Date.parse(plan.approvedAt) : NaN;
  if (current?.status !== 'completed' || !Number.isFinite(approved) || approved > Date.now() ||
      typeof plan?.goal !== 'string' || !plan.goal.trim() || plan.goal.length > 300) return null;
  return ['money', 'relationships'].includes(current.clientTopic) ? current.clientTopic : null;
}

// The route owns authentication, same-origin and request-size enforcement.
// No profile is read here; the loader must be the server's public catalog.
export async function planIntelligenceRequest(input, { loadCatalog, loadCoaching, loadTests } = {}) {
  const request = validateIntelligenceRequest(input);
  const messages = copy[request.intent.language];
  const safety = inspectIntelligenceRisk(request.intent, request.preflight);
  const base = { decisionId: globalThis.crypto.randomUUID(), policyVersion: CLIENT_REASONING_VERSION,
    alternatives: [], limitations: [messages.limitation], feedbackRecording: 'session_only' };
  if (safety.status === 'urgent') return { ...base, status: 'safety_handoff', explanation: messages.urgent };
  if (safety.status !== 'clear') return { ...base, status: 'unavailable', explanation: messages.preflight };
  try {
    const currentFocus = request.intent.selectedTopics?.length || request.intent.selectedFacets?.length ||
      request.intent.lifeAreas?.length || request.intent.goalText?.trim();
    let savedTopic = null;
    if (request.profileFocus === 'confirmed_coaching_topic' && !currentFocus) {
      if (typeof loadCoaching !== 'function') return { ...base, status: 'unavailable', explanation: messages.unavailable };
      savedTopic = confirmedCoachingTopic(await loadCoaching());
    }
    const kind = request.intent.formats?.[0] || 'video';
    if (!['video','test'].includes(kind)) return { ...base, status:'no_match', explanation:messages.unavailable };
    if ((kind === 'video' && typeof loadCatalog !== 'function') || (kind === 'test' && typeof loadTests !== 'function'))
      return { ...base, status:'unavailable', explanation:messages.unavailable };
    const catalog = kind === 'video' ? await loadCatalog(request.intent.language) : await loadTests(request.intent.language);
    const common = { intent: request.intent, safety,
      profile: savedTopic ? {authenticated:true,ownerScoped:true,confirmedTopics:[savedTopic]} : {},
      consent: savedTopic ? {profilePersonalization:true} : {},
      feedback: { dismissedIds: request.session?.dismissedIds }, limit: 3 };
    const result = kind === 'video'
      ? reasonAcrossMeditations({ ...common, videos:catalog?.videos, publishedSourceIds:catalog?.publishedSourceIds })
      : reasonAcrossTests({ ...common, testCatalog:catalog });
    const reason = savedTopic ? savedReason[request.intent.language] : messages.reason;
    const toAction = item => ({ id: item.id, kind: item.kind, title: item.title, href: item.href,
      ...(kind === 'video' ? {audioLanguage:request.intent.audioLanguage || request.intent.language} :
        {instrumentLanguage:Object.values(catalog).flat().find(row=>`test:${row.key}`===item.id)?.instrumentLocale}),
      reasons: [reason], requiresUserConfirmation: true });
    if (result.status === 'recommend') {
      // Check untrusted source titles again before returning them. A cue in a
      // title is not evidence about the client; discard the item, not escalate.
      const safe = result.suggestions.filter(item =>
        inspectIntelligenceRisk({ language: request.intent.language, goalText: item.title }).status !== 'urgent');
      if (!safe.length) return { ...base, status: 'no_match', explanation: messages.unavailable };
      return { ...base, status: 'recommend', primary: toAction(safe[0]),
        alternatives: safe.slice(1, 3).map(toAction), explanation: reason };
    }
    if (result.status === 'clarify' || result.status === 'no_match') return { ...base,
      status: result.status, question: result.question, explanation: result.question?.text || messages.unavailable };
    if (result.status === 'safety_handoff') return { ...base, status: 'safety_handoff', explanation: messages.urgent };
    return { ...base, status: 'unavailable', explanation: messages.unavailable };
  } catch {
    return { ...base, status: 'unavailable', explanation: messages.unavailable };
  }
}
