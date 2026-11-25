import { buildExplorerEntries, rankPublicTestMatches } from './test-explorer.js';

// The guide reuses the *real* guest-accessible, rights-cleared test registry.
// Only public catalogue metadata leaves the server. No private results or answers.
export const SUPPORT_GUIDE_TEST_FOCUS = Object.freeze({
  energy: Object.freeze(['body','sleep','resources']),
  money: Object.freeze(['clarity','attention','function']),
  love: Object.freeze(['relationships','intimacy']),
  meaning: Object.freeze(['meaning','attention','resources']),
});
const KEY = /^[a-z0-9][a-z0-9-]{1,95}$/;

/** @param {{locale?:string, entries?:Array<object>}} options */
export function buildSupportGuideTestShortlists({ locale = 'en', entries = null } = {}) {
  const language = locale === 'ru' ? 'ru' : 'en';
  const source = Array.isArray(entries) ? entries : buildExplorerEntries({ locale: language, audience: 'guest' });
  const eligible = source.filter(item => item?.selectable === true &&
    item?.startable === true && item?.guestEligible === true &&
    item?.free === true && item?.rightsStatus === 'cleared' &&
    item?.starterEligible !== false && item?.explicitOptIn !== true &&
    item?.definition?.key === item.key && KEY.test(item.key) &&
    Number.isFinite(item.durationMinutes) && item.durationMinutes > 0 &&
    item.durationMinutes <= 3);

  return Object.fromEntries(Object.entries(SUPPORT_GUIDE_TEST_FOCUS).map(([sector,focus]) => {
    const ranked = rankPublicTestMatches(eligible, {focus,depth:'quick'});
    // Prioritize approximately one-minute checks when they genuinely cover
    // the intended focus; never call a longer test a "one-minute" test.
    const topical = ranked.filter(item => item.matchedFocus?.length ||
      (Number.isFinite(item.matchedScales) ? item.matchedScales > 0 : item.matchedScales));
    const candidates = topical; // Never present a non-matching test as personalized.
    const chosen = candidates.filter((item,index,array) =>
      array.findIndex(other => other.key === item.key) === index).slice(0,2);
    return [sector, chosen.map(item => ({
      key: item.key,
      title: String(item.title || item.key).slice(0,145),
      durationMinutes: item.durationMinutes,
      questionCount: Number.isFinite(item.questionCount) ? item.questionCount : null,
      // Use the public instrument's actual source language; never imply an ES
      // questionnaire was validated merely because the outer UI is Spanish.
      instrumentLocale: item.catalog?.instrumentLocale === 'dynamic' ? language :
        item.catalog?.instrumentLocale === 'ru' ? 'ru' : 'en',
      href: '/' + language + '/client?startTests=' + encodeURIComponent(item.key),
    }))];
  }));
}
