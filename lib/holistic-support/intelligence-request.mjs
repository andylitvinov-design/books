// Validates untrusted request data only. Authorization, consent and safety are
// server-owned and must be established independently by the eventual caller.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[a-z][a-z0-9_]{0,48}$/;
const FACET = /^[a-z][a-z0-9_]{0,48}::[a-z][a-z0-9_]{0,48}$/;
const surfaces = new Set(['cabinet', 'meditation', 'video_therapy', 'academy', 'coaching']);
const formats = new Set(['video', 'audio', 'course', 'test', 'service']);
const actions = new Set(['request_suggestion', 'change_goal', 'decline', 'continue']);
const intentKeys = new Set(['language', 'goalText', 'selectedFacets', 'selectedTopics', 'lifeAreas', 'situations', 'desiredStates', 'techniques', 'formats', 'maxDurationMinutes', 'intensity', 'avoidSafetyFlags']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const onlyKeys = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.has(key));
const list = (value, check) => Array.isArray(value) && value.length <= 40 && value.every(x => typeof x === 'string' && check(x));

export function validateIntelligenceRequest(input) {
  const bad = () => { throw new Error('INVALID_INTELLIGENCE_REQUEST'); };
  if (!onlyKeys(input, new Set(['requestId', 'surface', 'intent', 'clientAction'])) ||
      typeof input.requestId !== 'string' || !UUID.test(input.requestId) ||
      !surfaces.has(input.surface) || !onlyKeys(input.intent, intentKeys)) bad();
  const intent = input.intent;
  if (!['en', 'ru', 'es'].includes(intent.language) ||
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
