/**
 * Holistic Intelligence Core v1 — pure decision policy, no storage, network,
 * provider calls, user profiling, diagnosis, or medical efficacy prediction.
 * Existing source-verified matchers supply ranked, eligibility-filtered offers.
 * This policy decides whether to recommend, clarify or defer to safety support.
 *
 * SECURITY: authenticated/ownerScoped flags are assertions from a trusted
 * server-side adapter, NEVER accepted from untrusted client request bodies.
 */
export const CLIENT_REASONING_VERSION = 'hh-client-reasoning-v1';
export const ACTION_KINDS = Object.freeze(['video', 'course', 'service', 'test', 'audio']);
const KIND_SET = new Set(ACTION_KINDS);
const MATCH_CLASSES = new Set(['goal_and_measured_axis', 'goal_axis', 'measured_axis', 'topic', 'life_area']);
const MAX_ITEMS = 5;
const MAX_IDS = 80;
const SAFE_TOKEN = /^[a-z][a-z0-9_]{0,60}$/;
const SAFE_FACET = /^[a-z][a-z0-9_]*::[a-z][a-z0-9_]*$/;
const asArray = x => Array.isArray(x) ? x : [];
const uniq = xs => [...new Set(xs)];
const strings = (x, regex = SAFE_TOKEN) => uniq(asArray(x).filter(y => typeof y === 'string' && regex.test(y))).slice(0, MAX_IDS);
const safeId = x => typeof x === 'string' && x.length > 0 && x.length <= 160 && /^[a-zA-Z0-9:_-]+$/.test(x);
const safeHref = x => typeof x === 'string' && x.length <= 1500 &&
  !/[\\\s\x00-\x1f\x7f]/.test(x) &&
  ((x.startsWith('/') && !x.startsWith('//')) || /^https:\/\/[a-z0-9.-]+(?:[/?#][^\s]*)?$/i.test(x));
const localeOf = value => ['en', 'ru', 'es'].includes(value) ? value : 'en';
const copy = Object.freeze({
  en: {
    chooseGoal: 'What would you like to focus on first?',
    broaden: 'Would you like to adjust the topic, format or time available?',
    feedback: 'Did this feel useful and comfortable? You can skip this question.',
  },
  ru: {
    chooseGoal: 'На чём вам хотелось бы сосредоточиться сначала?',
    broaden: 'Хотите изменить тему, формат или доступное время?',
    feedback: 'Было ли это полезно и комфортно? Вопрос можно пропустить.',
  },
  es: {
    chooseGoal: '¿En qué te gustaría centrarte primero?',
    broaden: '¿Quieres cambiar el tema, formato o tiempo disponible?',
    feedback: '¿Te resultó útil y cómodo? Puedes omitir la pregunta.',
  },
});

/**
 * The profile is never itself proof of user authorization. The caller must
 * verify authentication, ownership and per-purpose consent BEFORE passing data.
 * Current user selections dominate remembered, previously confirmed choices.
 * Inferred traits and unverified measurements never fill empty intent slots.
 */
export function prepareReasoningContext({ intent = {}, profile = {}, consent = {} } = {}) {
  const useProfile = consent.profilePersonalization === true &&
    profile.authenticated === true && profile.ownerScoped === true;
  const ownSelfGoals = asArray(intent.selfGoals);
  const hasCurrentFocus = strings(intent.selectedFacets, SAFE_FACET).length > 0 ||
    strings(intent.selectedTopics).length > 0 || strings(intent.lifeAreas).length > 0 ||
    (typeof intent.goalText === 'string' && intent.goalText.trim().length > 0) ||
    ownSelfGoals.length > 0;
  const choose = (requested, confirmed, regex = SAFE_TOKEN) => {
    const current = strings(requested, regex);
    return current.length ? current : useProfile && !hasCurrentFocus ? strings(confirmed, regex) : [];
  };
  const selectedFacets = choose(intent.selectedFacets, profile.confirmedFacets, SAFE_FACET);
  const selectedTopics = choose(intent.selectedTopics, profile.confirmedTopics);
  const lifeAreas = choose(intent.lifeAreas, profile.confirmedLifeAreas);
  const formats = strings(intent.formats);
  const profileSelfGoals = useProfile && Array.isArray(profile.confirmedSelfGoals) ? profile.confirmedSelfGoals : [];
  // Exact-facet/source/validity checks belong to the existing axis ranker.
  const measurements = useProfile && consent.measuredPersonalization === true
    ? asArray(profile.measurements) : [];
  const minutes = Number.isFinite(intent.maxDurationMinutes) && intent.maxDurationMinutes > 0
    ? Math.min(240, intent.maxDurationMinutes) : undefined;
  return {
    language: localeOf(intent.language),
    selectedFacets, selectedTopics, lifeAreas, formats,
    selfGoals: ownSelfGoals.length ? ownSelfGoals : hasCurrentFocus ? [] : profileSelfGoals,
    measurements,
    allowMeasuredPersonalization: useProfile && consent.measuredPersonalization === true,
    allowPaid: consent.paidSuggestions === true,
    allowSensitiveContent: consent.sensitiveContent === true,
    ...(minutes === undefined ? {} : { maxDurationMinutes: minutes }),
    avoidSafetyFlags: strings(intent.avoidSafetyFlags),
    profileUsed: useProfile,
  };
}

function safeResult(row) {
  const item = row?.item;
  if (!safeId(row?.id) || !item || !KIND_SET.has(row.kind) ||
    !safeHref(item.href) || typeof item.title !== 'string' || !item.title.trim() ||
    !MATCH_CLASSES.has(row.rankClass)) return null;
  // Never include item, raw tests, scores, source measurements, self-rated gaps,
  // or confidential explanations in the portable recommendation contract.
  const why = uniq([
    row.rankClass,
    ...asArray(row.matchedAxes).flatMap(x => [
      ...(x?.selected ? ['client_chosen_focus'] : []),
      ...(x?.measurement ? ['verified_measured_source'] : []),
      ...(x?.selfGoal ? ['client_chosen_goal_gap'] : []),
    ]),
    ...(asArray(row.matchedTopics).length ? ['chosen_topic'] : []),
    ...(asArray(row.matchedLifeAreas).length ? ['chosen_life_area'] : []),
  ]);
  return {
    id: row.id,
    kind: row.kind,
    title: item.title.slice(0, 200),
    href: item.href,
    reasons: why,
    relevanceClass: row.rankClass,
    free: item.free === true,
    requiresUserConfirmation: true,
  };
}

/**
 * @param {object} payload
 * @param {object} payload.intent user-selected input, never an inferred diagnosis
 * @param {object} payload.profile trusted authenticated owner's verified snapshot
 * @param {object} payload.consent per-purpose opt-ins
 * @param {object} payload.safety preflight status from existing safety gate
 * @param {object[]} payload.catalogItems vetted, published ranker-compatible items
 * @param {string[]} payload.knownFacetRefs known registry refs, not invented axes
 * @param {function} rankOffers existing `rankOffersByClientAxes` dependency
 */
export function planClientNextStep({ intent = {}, profile = {}, consent = {},
  safety = {}, catalogItems = [], knownFacetRefs = [], feedback = {}, now = Date.now(),
  limit = 3, rankOffers } = {}) {
  const context = prepareReasoningContext({ intent, profile, consent });
  const version = CLIENT_REASONING_VERSION;
  const metadata = { version, language: context.language, modelUsed: false,
    measuredProfileUsed: context.allowMeasuredPersonalization, automatedAction: false };
  // Fail closed: no content suggestions until the upstream triage has run.
  if (safety.status === 'urgent' || safety.status === 'human_review') {
    return { status: 'safety_handoff', ...metadata, suggestions: [],
      question: null, safetyRoute: safety.status, humanSupportPreferred: true };
  }
  if (safety.status !== 'clear') {
    return { status: 'safety_check_required', ...metadata, suggestions: [],
      question: null, safetyRoute: 'preflight_missing' };
  }
  const hasIntent = context.selectedFacets.length || context.selectedTopics.length ||
    context.lifeAreas.length || context.selfGoals.length;
  if (!hasIntent) {
    return { status: 'clarify', ...metadata, suggestions: [],
      question: { key: 'choose_goal', text: copy[context.language].chooseGoal } };
  }
  if (typeof rankOffers !== 'function') {
    return { status: 'unavailable', ...metadata, suggestions: [], question: null,
      reason: 'verified_ranker_missing' };
  }
  // `rankOffersByClientAxes` applies rights, editorial, safety, source-version,
  // sensitive/paid opt-in, original audio language and exact facet gates.
  const ranked = rankOffers({ client: context,
    items: asArray(catalogItems), knownFacetRefs: strings(knownFacetRefs, SAFE_FACET),
    now: Number.isFinite(now) ? now : Date.now(), limit: 30 });
  const dismissed = new Set(strings(feedback.dismissedIds, /^[A-Za-z0-9:_-]{1,160}$/));
  const completed = new Set(strings(feedback.completedIds, /^[A-Za-z0-9:_-]{1,160}$/));
  const eligible = asArray(ranked).map(safeResult).filter(Boolean).filter(x => !dismissed.has(x.id));
  const unseen = eligible.filter(x => !completed.has(x.id));
  // Non-repeat opportunities first, but never elevate a lower-fit action over
  // a higher-ranked action unless the user has already completed the latter.
  const choices = uniq([...unseen, ...eligible].map(x => x.id))
    .map(id => unseen.find(x => x.id === id) || eligible.find(x => x.id === id));
  const max = Number.isInteger(limit) ? Math.max(1, Math.min(MAX_ITEMS, limit)) : 3;
  const suggestions = choices.slice(0, max);
  if (!suggestions.length) {
    return { status: 'no_match', ...metadata, suggestions: [],
      question: { key: 'broaden_search', text: copy[context.language].broaden } };
  }
  return {
    status: 'recommend', ...metadata, suggestions,
    primary: suggestions[0],
    question: { key: 'optional_feedback', text: copy[context.language].feedback },
    // Use feedback only if volunteered; do not claim outcomes or create records.
    feedbackRecording: 'explicit_save_only',
  };
}

/** Comparing two voluntary ratings is observation, not proof of therapy effect. */
export function compareVoluntaryCheckins(before, after) {
  const good = x => x && typeof x === 'object' &&
    typeof x.promptKey === 'string' && SAFE_TOKEN.test(x.promptKey) &&
    Number.isInteger(x.value) && x.value >= 0 && x.value <= 10 &&
    typeof x.measuredAt === 'string' && Number.isFinite(Date.parse(x.measuredAt));
  if (!good(before) || !good(after) || before.promptKey !== after.promptKey ||
    Date.parse(after.measuredAt) < Date.parse(before.measuredAt)) return null;
  return { promptKey: before.promptKey, before: before.value, after: after.value,
    change: after.value - before.value, evidenceType: 'voluntary_self_report',
    efficacyClaim: false, saveRequiresConsent: true };
}
