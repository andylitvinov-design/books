/**
 * Guided client turn: bridge the published-resource orchestrator to the
 * canonical safety/consent/feedback policy from PR #2528.
 *
 * No network, storage, model calls, diagnostics, or record writes.
 * SECURITY: access is a SERVER-ASSERTED owner context, never JSON body input.
 * Catalogs must come from the existing vetted server/public-data adapters.
 */
import { AXIS_REFS } from "./axis-offer-matcher.mjs";
import { CLIENT_GOALS } from "./client-intent-model.mjs";
import { buildHolisticIntelligencePlan, HI_FORMATS } from "./holistic-intelligence.mjs";
import { interpretSupportUtterance } from "./guide-dialogue.mjs";
import { planClientNextStep } from "./client-reasoning-core.mjs";

export const GUIDED_INTELLIGENCE_VERSION = "hi-guided-turn-v1";
const FORMATS = new Set(HI_FORMATS);
const GOALS = new Set(CLIENT_GOALS);
const SENSITIVE = new Set(["connection::intimacy", "connection::sexual_wellbeing"]);
const LOCALES = new Set(["en", "ru", "es"]);
const arr = value => Array.isArray(value) ? value : [];
const record = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const validIds = input => [...new Set(arr(input).filter(
  value => typeof value === "string" && /^[a-zA-Z0-9:_-]{1,160}$/.test(value),
))].slice(0, 80);
const copy = Object.freeze({
  en: {
    offer: "One available next step is “",
    ending: "”. You can open it, choose a different option, or decline.",
    handoff: "I cannot assess an urgent situation here. Please contact a trusted person or appropriate local emergency support.",
    unavailable: "Personal suggestions need a safety check or a clearly chosen focus first.",
  },
  ru: {
    offer: "Один из доступных следующих шагов — «",
    ending: "». Вы можете открыть материал, выбрать другой или отказаться.",
    handoff: "Я не могу оценить экстренную ситуацию здесь. Пожалуйста, обратитесь к близкому человеку или в местную службу экстренной помощи.",
    unavailable: "Для персонального предложения сначала нужна проверка безопасности или выбранная вами тема.",
  },
  es: {
    offer: "Un posible siguiente paso es «",
    ending: "». Puedes abrirlo, elegir otra opción o rechazarlo.",
    handoff: "No puedo evaluar una situación urgente aquí. Busca ayuda de alguien de confianza o de los servicios de emergencia locales.",
    unavailable: "Para una sugerencia personal, primero hace falta una comprobación de seguridad o elegir un tema.",
  },
});
// Original YouTube recordings are videos as well as meditation catalogue
// entries. Choosing Video must not silently hide a published YouTube film.
const byFormat = (format, kind) => format === "meditation" ? kind === "meditation"
  : format === "video" ? kind === "video" || kind === "meditation"
  : format === kind;

/**
 * Build one client-facing next step using the CANONICAL decision policy.
 * Explicit safety preflight must be status "clear" before the catalog is
 * examined; missing/ambiguous status fails closed. Manual browsing without
 * preflight remains available through buildHolisticIntelligencePlan itself.
 *
 * The caller must read saved history only after server owner/RLS verification.
 * The adapter never saves it, creates CRM leads, or auto-opens links.
 */
export function buildHolisticGuidedTurn({
  locale = "en", intent = {}, access = {}, consent = {}, safety = {},
  profile = {}, catalogs = {}, feedback = {}, history = {}, limit = 3,
} = {}) {
  // Never trust caller-supplied owner assertions; HTTP adapters must verify them.
  intent = record(intent); access = record(access); consent = record(consent);
  safety = record(safety); profile = record(profile); catalogs = record(catalogs);
  feedback = record(feedback); history = record(history);
  const lang = LOCALES.has(locale) ? locale : "en";
  const owner = access.authenticated === true && access.ownerScoped === true;
  const measuredConsent = owner && consent.profilePersonalization === true &&
    consent.measuredPersonalization === true;
  const goal = GOALS.has(intent.goal) ? intent.goal : null;
  const chosenAxes = [...new Set(arr(intent.chosenAxes ?? intent.axisRefs)
    .filter(ref => typeof ref === "string" && Object.hasOwn(AXIS_REFS, ref)))].slice(0, 3);
  const enabledFormats = intent.enabledFormats === undefined ? [...HI_FORMATS]
    : [...new Set(arr(intent.enabledFormats).filter(x => FORMATS.has(x)))];
  // Existing locale-aware parser examines <=240 chars at a time. Scan the
  // bounded full utterance with overlap so a late urgent cue isn't missed.
  // Oversized text cannot be fully preflighted and must fail closed.
  const raw = typeof intent.rawUtterance === "string" ? intent.rawUtterance : "";
  const cannotPreflight = raw.length > 4000;
  let personalTextRisk = false;
  if (!cannotPreflight) {
    for (let start = 0; start < raw.length; start += 180) {
      if (interpretSupportUtterance(raw.slice(start, start + 240), lang).kind === "safety") {
        personalTextRisk = true;
        break;
      }
    }
  }
  const gate = cannotPreflight ? {} : intent.safetyStop === true || personalTextRisk
    ? { status: "urgent" } : safety;
  const currentDismissed = validIds(feedback.dismissedIds);
  const currentCompleted = validIds(feedback.completedIds);
  const readHistory = owner && consent.practiceHistory === true;
  const dismissedIds = validIds([
    ...currentDismissed, ...(readHistory ? validIds(history.dismissedIds) : []),
  ]);
  const completedIds = validIds([
    ...currentCompleted, ...(readHistory ? validIds(history.completedIds) : []),
  ]);
  const allowedPaid = consent.paidSuggestions === true;
  const allowedSensitive = consent.sensitiveContent === true;
  const prioritized = intent.preferredFormat && enabledFormats.includes(intent.preferredFormat)
    ? [intent.preferredFormat, ...enabledFormats.filter(x => x !== intent.preferredFormat)]
    : enabledFormats;

  // Deliberately lazy: no private measurements are read or matched when
  // safety is missing, urgent, or a human-review handoff is requested.
  function verifiedCandidates() {
    if (!allowedSensitive && chosenAxes.some(ref => SENSITIVE.has(ref))) return [];
    const plan = buildHolisticIntelligencePlan({
      locale: lang,
      intent: { ...intent, chosenAxes, enabledFormats,
        paymentPreference: allowedPaid ? "any" : "free" },
      profile: { ownerAuthorized: measuredConsent,
        consentToUseResults: measuredConsent,
        measurements: measuredConsent ? arr(profile.measurements) : [] },
      catalogs,
    });
    if (plan.status !== "ready") return [];
    const axes = x => arr(x.matchedAxes).map(value => ({
      selected: chosenAxes.includes(value?.ref), measurement: null,
    }));
    const rows = [];
    const append = (id, kind, title, href, free, rankClass, matchedAxes = []) => {
      if (!allowedPaid && !free) return;
      rows.push({ id, kind, rankClass,
        item: { title, href, free: free === true },
        matchedAxes, matchedTopics: goal ? [goal] : [], matchedLifeAreas: [] });
    };
    for (const x of plan.axisOffers) {
      append(x.id, x.kind, x.title, x.href, x.free === true,
        x.hasSourceMeasurement && measuredConsent ? "goal_and_measured_axis" : "goal_axis",
        axes(x));
    }
    for (const x of plan.meditations) {
      append("youtube:" + x.video.youtube_id, "video", x.video.title,
        "https://www.youtube.com/watch?v=" + x.video.youtube_id,
        true, "topic");
    }
    for (const x of plan.services) {
      append("service:" + x.offer.id, "service", x.offer.title, x.offer.href,
        x.free === true, "topic");
    }
    for (const x of plan.audio) {
      // This guide must never describe a sound preset as ready-to-play audio.
      // Site-owned background soundtracks are offered only inside Video Studio.
      if (x.playable !== true) continue;
      append(x.id, "audio", x.title, x.href, x.free === true, "topic");
    }
    // Preserve each source ranker's own order, across formats respect the
    // client's explicit preference. Never sum incompatible source scores.
    const formatFor = x => x.id.startsWith("youtube:") ? "meditation" : x.kind;
    const ordered = prioritized.flatMap(format =>
      rows.filter(row => byFormat(format, formatFor(row))));
    return [...new Map(ordered.map(row => [row.id, row])).values()];
  }

  const policy = planClientNextStep({
    intent: { language: lang, selectedFacets: chosenAxes,
      selectedTopics: goal ? [goal] : [], formats: enabledFormats.map(
        format => format === "meditation" ? "video" : format) },
    consent: { paidSuggestions: allowedPaid, sensitiveContent: allowedSensitive },
    safety: gate,
    knownFacetRefs: Object.keys(AXIS_REFS),
    feedback: { dismissedIds, completedIds },
    rankOffers: verifiedCandidates,
    limit,
  });
  const t = copy[lang];
  const message = policy.status === "recommend"
    ? t.offer + policy.primary.title + t.ending
    : policy.status === "safety_handoff" ? t.handoff
      : policy.question?.text ?? t.unavailable;
  // No raw utterance, private test scores, source identifiers, saved notes,
  // feedback timestamps, or user identifiers are ever returned.
  return { ...policy, guideVersion: GUIDED_INTELLIGENCE_VERSION,
    catalogOrchestratorVersion: "hi-core-v1", message,
    historyUsed: readHistory && (validIds(history.dismissedIds).length > 0 ||
      validIds(history.completedIds).length > 0),
    saved: false, externalModelUsed: false };
}
