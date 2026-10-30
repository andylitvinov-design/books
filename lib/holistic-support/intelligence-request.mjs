// Validates untrusted request data only. Authorization, consent and safety are
// server-owned and must be established independently by the eventual caller.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-z][a-z0-9_]{0,48}$/;
const FACET = /^[a-z][a-z0-9_]{0,48}::[a-z][a-z0-9_]{0,48}$/;
const surfaces = new Set(['cabinet', 'meditation', 'video_therapy', 'academy', 'coaching']);
const formats = new Set(['video', 'audio', 'course', 'test', 'service']);
const actions = new Set(['request_suggestion', 'change_goal', 'decline', 'continue']);
const intentKeys = new Set(['language', 'audioLanguage', 'goalText', 'selectedFacets', 'selectedTopics', 'lifeAreas', 'situations', 'desiredStates', 'techniques', 'formats', 'maxDurationMinutes', 'intensity', 'avoidSafetyFlags']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const onlyKeys = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.has(key));
const list = (value, check) => Array.isArray(value) && value.length <= 40 && value.every(x => typeof x === 'string' && check(x));

export function validateIntelligenceRequest(input) {
  const bad = () => { throw new Error('INVALID_INTELLIGENCE_REQUEST'); };
  if (!onlyKeys(input, new Set(['requestId', 'surface', 'intent', 'clientAction', 'preflight', 'session', 'profileFocus', 'servicePayment', 'videoHistory', 'testHistory', 'courseSelection', 'symbolicInterest', 'feedbackHistory'])) ||
      typeof input.requestId !== 'string' || !UUID.test(input.requestId) ||
      !surfaces.has(input.surface) || !onlyKeys(input.intent, intentKeys)) bad();
  const intent = input.intent;
  if (input.feedbackHistory !== undefined &&
      (input.feedbackHistory !== 'avoid_not_useful' || input.surface !== 'cabinet')) bad();
  if (input.symbolicInterest !== undefined &&
      (input.symbolicInterest !== 'include' || (intent.formats !== undefined &&
       (!Array.isArray(intent.formats) || intent.formats.length !== 1 || intent.formats[0] !== 'video')))) bad();
  if (input.courseSelection !== undefined &&
      (!['reiki_preview','active_course','development_plan'].includes(input.courseSelection) ||
       (['active_course','development_plan'].includes(input.courseSelection) && input.surface !== 'cabinet') ||
       (input.courseSelection === 'development_plan' && (input.profileFocus !== undefined || !Array.isArray(intent.selectedTopics) || intent.selectedTopics.length !== 1 || intent.selectedTopics[0] !== 'goals')) || !Array.isArray(intent.formats) ||
       intent.formats.length !== 1 || intent.formats[0] !== 'course')) bad();
  if (input.testHistory !== undefined &&
      (input.testHistory !== 'avoid_completed' || input.surface !== 'cabinet' ||
       !Array.isArray(intent.formats) || intent.formats.length !== 1 || intent.formats[0] !== 'test')) bad();
  if (input.videoHistory !== undefined &&
      (input.videoHistory !== 'avoid_marked' || input.surface !== 'cabinet' ||
       !Array.isArray(intent.formats) || intent.formats.length !== 1 || intent.formats[0] !== 'video')) bad();
  if (input.servicePayment !== undefined &&
      (!['free_only', 'include_paid'].includes(input.servicePayment) ||
       !Array.isArray(intent.formats) || intent.formats.length !== 1 || intent.formats[0] !== 'service')) bad();
  if (input.profileFocus !== undefined &&
      (input.surface !== 'cabinet' || input.profileFocus !== 'confirmed_coaching_topic')) bad();
  if (input.session !== undefined &&
      (!onlyKeys(input.session, new Set(['dismissedIds'])) ||
       !Array.isArray(input.session.dismissedIds) || input.session.dismissedIds.length > 80 ||
       input.session.dismissedIds.some(id => typeof id !== 'string' || !/^[A-Za-z0-9:_-]{1,160}$/.test(id)))) bad();
  if (input.preflight !== undefined &&
      (!onlyKeys(input.preflight, new Set(['immediateDanger', 'selfHarmThoughts'])) ||
       !['yes', 'no', 'unsure'].includes(input.preflight.immediateDanger) ||
       !['yes', 'no', 'unsure'].includes(input.preflight.selfHarmThoughts))) bad();
  if (!['en', 'ru', 'es'].includes(intent.language) ||
      (intent.audioLanguage !== undefined && !['en', 'ru', 'es'].includes(intent.audioLanguage)) ||
      (input.clientAction !== undefined && !actions.has(input.clientAction)) ||
      (intent.goalText !== undefined && (typeof intent.goalText !== 'string' || intent.goalText.length > 500)) ||
      (intent.maxDurationMinutes !== undefined && (!Number.isInteger(intent.maxDurationMinutes) || intent.maxDurationMinutes < 1 || intent.maxDurationMinutes > 240)) ||
      (intent.intensity !== undefined && !['gentle', 'standard'].includes(intent.intensity))) bad();
  for (const key of ['selectedTopics', 'lifeAreas', 'situations', 'desiredStates', 'techniques', 'avoidSafetyFlags']) {
    if (intent[key] !== undefined && !list(intent[key], x => TOKEN.test(x))) bad();
  }
  if (intent.selectedFacets !== undefined && !list(intent.selectedFacets, x => FACET.test(x))) bad();
  if (intent.formats !== undefined && !list(intent.formats, x => formats.has(x))) bad();
  return input;
}
