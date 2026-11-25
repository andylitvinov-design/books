// Pure, deterministic matching of a visitor's *self-ratings* and chosen intention
// to existing published recordings and illustrative Daoist-style talismans.
// This is topic relevance, not diagnosis, treatment advice or efficacy prediction.
// Do not persist inputs, send them to analytics/CRM, or include them in URLs.
/** @typedef {'energy'|'money'|'relationships'|'goals'} SupportFocus */
/** @typedef {'business'|'love'|'energy'|'health'} SupportTopic */
/** @typedef {{id:string, title:string, topics:SupportTopic[], sourceLanguage?:'en'|'ru'}} SupportVideo */
/** @typedef {{id:string, goal?:string, image?:string}} SupportTalisman */
/** @typedef {{focus?:SupportFocus, scores?:Partial<Record<SupportFocus, number>>, videos?:readonly SupportVideo[], talismans?:readonly SupportTalisman[], locale?:string}} SupportInput */

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
 * @returns {{focus:SupportFocus, scores:Record<SupportFocus,number>, videos:SupportVideo[], talismans:SupportTalisman[], matchedVideo:boolean}}
 */
export function recommendSupportContent({ focus = 'energy', scores = {}, videos = [], talismans = [], locale = 'en' } = {}) {
  /** @type {SupportFocus} */
  const selectedFocus = SUPPORT_FOCI.includes(focus) ? focus : 'energy';
  /** @type {Record<SupportFocus, number>} */
  const normalizedScores = {
    energy: normalizedRating(scores.energy),
    money: normalizedRating(scores.money),
    relationships: normalizedRating(scores.relationships),
    goals: normalizedRating(scores.goals),
  };
  const primaryTopic = TOPIC_BY_FOCUS[selectedFocus];
  const preferredAudio = locale === 'ru' ? 'ru' : 'en';
  const candidates = (Array.isArray(videos) ? videos : [])
    .filter(video => video && typeof video.id === 'string' && YOUTUBE_ID.test(video.id)
      && Array.isArray(video.topics) && video.topics.some(topic => Object.prototype.hasOwnProperty.call(FOCI_BY_TOPIC, topic)))
    .map((video, index) => {
      const matchingPrimary = video.topics.includes(primaryTopic);
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
  const rankedVideos = candidates.map(item => item.video)
    .filter((video, index, array) => array.findIndex(item => item.id === video.id) === index);

  const publishedTalismans = Array.isArray(talismans) ? talismans.filter(item =>
    item && typeof item.id === 'string' && Object.values(TALISMAN_BY_FOCUS).includes(item.id)) : [];
  const primaryId = TALISMAN_BY_FOCUS[selectedFocus];
  const primary = publishedTalismans.find(item => item.id === primaryId);
  const otherIds = [...new Set(SUPPORT_FOCI.filter(key => key !== selectedFocus)
    .sort((a, b) => normalizedScores[a] - normalizedScores[b])
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


/**
 * Rank ONLY existing, verified public recordings by the visitor's lowest
 * self-ratings. Equal minima are all priorities, never an arbitrary "focus".
 * This is a local browsing aid, not an assessment or medical recommendation.
 *
 * @param {{scores?:Partial<Record<SupportFocus,number>>,videos?:readonly SupportVideo[],locale?:string}} input
 * @returns {{scores:Record<SupportFocus,number>,minimum:number,priorities:SupportFocus[],videos:SupportVideo[],matchedVideo:boolean}}
 */
export function recommendSupportByLowestScores({ scores = {}, videos = [], locale = 'en' } = {}) {
  /** @type {Record<SupportFocus,number>} */
  const ratings = {
    energy: normalizedRating(scores.energy), money: normalizedRating(scores.money),
    relationships: normalizedRating(scores.relationships), goals: normalizedRating(scores.goals),
  };
  const minimum = Math.min(...SUPPORT_FOCI.map(key => ratings[key]));
  const priorities = SUPPORT_FOCI.filter(key => ratings[key] === minimum);
  const preferredAudio = locale === 'ru' ? 'ru' : 'en';
  const ranked = (Array.isArray(videos) ? videos : [])
    .filter(video => video && typeof video.id === 'string' && YOUTUBE_ID.test(video.id)
      && Array.isArray(video.topics)
      && video.topics.some(topic => Object.prototype.hasOwnProperty.call(FOCI_BY_TOPIC, topic)))
    .map((video, index) => {
      const covered = new Set(video.topics.flatMap(topic => FOCI_BY_TOPIC[topic] || []));
      const priorityHits = priorities.filter(domain => covered.has(domain)).length;
      const closestNeed = Math.max(0, ...SUPPORT_FOCI.filter(domain => covered.has(domain))
        .map(domain => 10 - ratings[domain]));
      const rank = (priorityHits ? 100 + Math.min(priorityHits, 3) * 3 : 0)
        + closestNeed * 1.5
        - (video.topics.length - 1) * 3
        + (video.sourceLanguage === preferredAudio ? 3 : 0);
      return { video, index, rank, relevant: priorityHits > 0 };
    })
    .sort((a, b) => b.rank - a.rank || a.index - b.index);
  const used = new Set();
  const rankedVideos = ranked.map(item => item.video).filter(video => {
    if (used.has(video.id)) return false;
    used.add(video.id);
    return true;
  });
  return {
    scores: ratings, minimum, priorities,
    videos: rankedVideos,
    matchedVideo: ranked.some(item => item.relevant),
  };
}
