// Local-only, deterministic relevance for published Holistic Support recordings.
// Intentions and ratings are NEVER persisted, transmitted or interpreted as diagnoses.
// A missing topic produces an explicitly labelled related recording, never a fake match.
/** @typedef {'energy'|'money'|'love'|'meaning'} GoalSector */
/** @typedef {{sector:GoalSector, concerns?:string[], tasks?:string[], ratings?:Record<string,{current:number,desired:number}>}} GoalSelection */
/** @typedef {{id:string,title:string,topics:string[],sourceLanguage?:string}} GoalVideo */
const TOPIC_BY_SECTOR = Object.freeze({
  energy: "energy", money: "business", love: "love", meaning: "energy",
});
const VALID_TOPICS = new Set(["energy", "health", "business", "love"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** @param {GoalSelection} selection */
export function goalTopicForSelection(selection) {
  if (!selection || !Object.prototype.hasOwnProperty.call(TOPIC_BY_SECTOR, selection.sector)) return "energy";
  if (selection.sector === "energy" &&
    (selection.concerns || []).some(id => ["symptoms", "tension", "sleepTrouble"].includes(id))) return "health";
  if (selection.sector === "energy" &&
    (selection.tasks || []).some(id => ["sleepWell", "easeTension"].includes(id))) return "health";
  // Direction, planning and motivation are now subtopics of Meaning. Preserve
  // the old Goals-relevant public recordings, without claiming an exact match.
  if (selection.sector === "meaning" && [
    ...(selection.concerns || []), ...(selection.tasks || []),
  ].some(id => ["stuck", "distraction", "procrastination", "fear", "tooMany",
    "unclearGoals", "direction", "nextStep", "habits", "courage", "priorities",
    "motivation"].includes(id))) return "business";
  return TOPIC_BY_SECTOR[selection.sector];
}

/**
 * Ranks at most the recordings already published and supplied by the page.
 * Does NOT claim that symptoms, personal goals or ratings indicate a diagnosis.
 * Meaning is an exploratory topic without its own verified recording tag.
 * @param {{selection:GoalSelection,videos?:readonly GoalVideo[],locale?:string}} input
 */
export function rankSupportGoalVideos({ selection, videos = [], locale = "en" }) {
  const topic = goalTopicForSelection(selection);
  const sector = selection?.sector;
  const language = locale === "ru" ? "ru" : "en";
  const ranked = (Array.isArray(videos) ? videos : [])
    .filter(video => video && YOUTUBE_ID.test(video.id) &&
      Array.isArray(video.topics) && video.topics.some(item => VALID_TOPICS.has(item)))
    .map((video, index) => {
      const primary = video.topics.includes(topic);
      const secondary = sector === "meaning" && video.topics.includes("love") ? 10 :
        sector === "energy" && video.topics.includes("energy") ? 8 : 0;
      const score = (primary ? 100 : 0) + secondary -
        Math.max(0, video.topics.length - 1) * 5 +
        (video.sourceLanguage === language ? 4 : 0);
      return { video, index, primary, score };
    }).sort((a, b) => b.score - a.score || a.index - b.index);
  const used = new Set();
  const unique = ranked.map(item => item.video).filter(video => {
    if (used.has(video.id)) return false;
    used.add(video.id);
    return true;
  });
  return {
    videos: unique, topic,
    matchedVideo: sector !== "meaning" && ranked.some(item => item.primary),
  };
}


/**
 * Lightweight first-step choices share the already reviewed four-sector goal
 * registry. These are self-selected concerns, never clinical scores or a fifth
 * global life domain. No side effects, persistence, analytics or API calls.
 * @typedef {'stress'|'energy'|'relationships'|'decision'|'work'} SupportQuickGoalId
 */
const QUICK_GOAL_PRESETS = Object.freeze({
  stress: Object.freeze({ sector: 'energy', concerns: ['stress'], tasks: ['stayCalm'] }),
  energy: Object.freeze({ sector: 'energy', concerns: ['lowEnergy'], tasks: ['moreEnergy'] }),
  relationships: Object.freeze({ sector: 'love', concerns: ['conflicts'], tasks: ['communication'] }),
  decision: Object.freeze({ sector: 'meaning', concerns: ['uncertainty'], tasks: ['direction'] }),
  work: Object.freeze({ sector: 'money', concerns: ['workStuck'], tasks: ['clearPlan'] }),
});

/**
 * @param {SupportQuickGoalId | string | null | undefined} id
 * @param {number | undefined} touchedCheckin A value only when the visitor
 * actively changed the corresponding voluntary slider; untouched 5 is not data.
 */
export function quickGoalSelection(id, touchedCheckin) {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(QUICK_GOAL_PRESETS, id)) return null;
  const preset = QUICK_GOAL_PRESETS[id];
  return {
    sector: preset.sector,
    concerns: [...preset.concerns],
    tasks: [...preset.tasks],
    ratings: {},
    ...(Number.isInteger(touchedCheckin) && touchedCheckin >= 1 && touchedCheckin <= 10
      ? { checkin: touchedCheckin } : {}),
  };
}
