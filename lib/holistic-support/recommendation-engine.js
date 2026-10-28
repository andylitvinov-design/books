// Pure, deterministic matching of a visitor's *self-ratings* and chosen intention
// to existing published recordings and illustrative Daoist-style talismans.
// This is topic relevance, not diagnosis, treatment advice or efficacy prediction.
// Do not persist inputs, send them to analytics/CRM, or include them in URLs.
/** @typedef {'energy'|'money'|'relationships'|'goals'} SupportFocus */
/** @typedef {SupportFocus|'all'} SupportSelection */
/** @typedef {'business'|'love'|'energy'|'health'} SupportTopic */
/** @typedef {{id:string, title:string, topics:SupportTopic[], sourceLanguage?:'en'|'ru'}} SupportVideo */
/** @typedef {{id:string, goal?:string, image?:string}} SupportTalisman */
/** @typedef {{focus?:SupportSelection, scores?:Partial<Record<SupportFocus, number>>, videos?:readonly SupportVideo[], talismans?:readonly SupportTalisman[], locale?:string}} SupportInput */

export const SUPPORT_FOCI = Object.freeze(['energy', 'money', 'relationships', 'goals']);
const TOPIC_BY_FOCUS = Object.freeze({
  energy: 'energy', money: 'business', relationships: 'love', goals: 'business',
});
const FOCI_BY_TOPIC = Object.freeze({
  energy: ['energy'], health: ['energy'], business: ['money', 'goals'], love: ['relationships'],
});
const TALISMAN_BY_FOCUS = Object.freeze({
  energy: 'fu-balance', money: 'fu-prosperity',
  relationships: 'fu-harmony', goals: 'fu-prosperity',
});
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** @param {unknown} value */
function normalizedRating(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10
    ? value : 5;
}

/**
 * @param {SupportInput} input
 * @returns {{focus:SupportSelection, scores:Record<SupportFocus,number>, videos:SupportVideo[], talismans:SupportTalisman[], matchedVideo:boolean}}
 */
export function recommendSupportContent({ focus = 'energy', scores = {}, videos = [], talismans = [], locale = 'en' } = {}) {
  /** @type {SupportSelection} */
  const selectedFocus = focus === 'all' ? 'all' : SUPPORT_FOCI.includes(focus) ? focus : 'energy';
  /** @type {Record<SupportFocus, number>} */
  const normalizedScores = {
    energy: normalizedRating(scores.energy),
    money: normalizedRating(scores.money),
    relationships: normalizedRating(scores.relationships),
    goals: normalizedRating(scores.goals),
  };
  // "All" balances the published topics, prioritizing the visitor's lower
  // self-ratings without assuming a diagnosis or persisting private scores.
  const focusPriority = [...SUPPORT_FOCI].sort((a, b) =>
    normalizedScores[a] - normalizedScores[b] || SUPPORT_FOCI.indexOf(a) - SUPPORT_FOCI.indexOf(b));
  const topicPriority = [...new Set(focusPriority.map(key => TOPIC_BY_FOCUS[key]))];
  const primaryTopic = selectedFocus === 'all' ? null : TOPIC_BY_FOCUS[selectedFocus];
  const preferredAudio = locale === 'ru' ? 'ru' : 'en';
  const candidates = (Array.isArray(videos) ? videos : [])
    .filter(video => video && typeof video.id === 'string' && YOUTUBE_ID.test(video.id)
      && Array.isArray(video.topics) && video.topics.some(topic => Object.prototype.hasOwnProperty.call(FOCI_BY_TOPIC, topic)))
    .map((video, index) => {
      const matchingPrimary = selectedFocus === 'all'
        ? video.topics.some(topic => topicPriority.includes(topic))
        : video.topics.includes(primaryTopic);
      const secondaryRelevance = Math.min(6, 0.3 * Math.max(0, ...video.topics.map(topic =>
        Math.max(0, ...(FOCI_BY_TOPIC[topic] || []).map(domain => {
          const rating = normalizedScores[domain];
          // Low scores are merely a small browsing hint, NEVER a commercial trigger.
          return domain === selectedFocus ? 0 : (10 - rating) * 2;
        })))));
      // Chosen intention dominates any low score in other areas.
      // Prefer focused material to a generic recording tagged with every topic.
      const relevance = (matchingPrimary ? 100 : 0) + secondaryRelevance
        - (video.topics.length - 1) * 4 + (video.sourceLanguage === preferredAudio ? 4 : 0);
      return { video, index, relevance, matchingPrimary };
    })
    .sort((a, b) => b.relevance - a.relevance || a.index - b.index);
  const matchedVideo = candidates.some(item => item.matchingPrimary);
  // If the library lacks an exact match, keep a labelled fallback available
  // rather than inventing a recording or returning a false 100% match.
  // In the broad mode, show a real recording from each available topic before
  // filling in alternatives. Money and Goals share "business": no fake category.
  const topicLeaders = selectedFocus === 'all' ? topicPriority
    .map(topic => candidates.find(item => item.video.topics.includes(topic))?.video)
    .filter(Boolean) : [];
  const rankedVideos = [...topicLeaders, ...candidates.map(item => item.video)]
    .filter((video, index, array) => array.findIndex(item => item.id === video.id) === index);

  const publishedTalismans = Array.isArray(talismans) ? talismans.filter(item =>
    item && typeof item.id === 'string' && Object.values(TALISMAN_BY_FOCUS).includes(item.id)) : [];
  const primaryId = selectedFocus === 'all'
    ? TALISMAN_BY_FOCUS[focusPriority[0]] : TALISMAN_BY_FOCUS[selectedFocus];
  const primary = publishedTalismans.find(item => item.id === primaryId);
  const otherIds = [...new Set((selectedFocus === 'all' ? focusPriority : SUPPORT_FOCI.filter(key => key !== selectedFocus)
    .sort((a, b) => normalizedScores[a] - normalizedScores[b]))
    .map(key => TALISMAN_BY_FOCUS[key]))].filter(id => id !== primaryId);
  const rankedTalismans = primary
    ? [primary, ...otherIds.map(id => publishedTalismans.find(item => item.id === id)).filter(Boolean)]
    : [];

  return {
    focus: selectedFocus, scores: normalizedScores, videos: rankedVideos,
    talismans: /** @type {SupportTalisman[]} */ (rankedTalismans),
    matchedVideo,
  };
}
