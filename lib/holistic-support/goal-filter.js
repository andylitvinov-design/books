// Local-only, deterministic relevance for published Holistic Support recordings.
// Intentions and ratings are NEVER persisted, transmitted or interpreted as diagnoses.
// A missing topic produces an explicitly labelled related recording, never a fake match.
/** @typedef {'energy'|'money'|'love'|'goals'|'meaning'} GoalSector */
/** @typedef {{sector:GoalSector, concerns?:string[], tasks?:string[], ratings?:Record<string,{current:number,desired:number}>}} GoalSelection */
/** @typedef {{id:string,title:string,topics:string[],sourceLanguage?:string}} GoalVideo */
const TOPIC_BY_SECTOR = Object.freeze({
  energy: "energy", money: "business", love: "love", goals: "business", meaning: "energy",
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
