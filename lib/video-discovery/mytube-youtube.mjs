/**
 * Public-only YouTube continuation for MyTube. NEVER use text from private
 * profiles, tests, chat prompts or client reports in a YouTube query.
 * External video links are not entries in the approved MyTube catalogue.
 */
const SHELVES = new Set(["practices", "courses", "masters", "videos"]);
const LOCALES = new Set(["ru", "en", "es"]);
const CATEGORIES = new Set(["goals-money", "love-relationships", "energy-confidence", "stress-anxiety"]);
const COLLECTIONS = new Set(["sun", "planets", "golden", "energy"]);
const GOALS = new Set(["stress", "energy", "relationships", "work", "meaning", "practices"]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const SEARCH_TERMS = Object.freeze({
  practices: {
    ru: "управляемая медитация энергетическая практика", en: "guided meditation energy practice", es: "meditación guiada práctica energética",
  },
  courses: {
    ru: "обучение медитации рейки храмовые традиции урок", en: "meditation reiki spiritual traditions learning lesson", es: "curso meditación reiki tradiciones lección",
  },
  masters: {
    ru: "знакомство с мастером медитации рейки интервью", en: "meet meditation reiki teacher introduction interview", es: "conoce maestros meditación reiki presentación entrevista",
  },
  videos: {
    ru: "психология развитие осознанность обучающее видео", en: "psychology mindfulness personal growth educational video", es: "psicología desarrollo personal mindfulness vídeo educativo",
  },
  sun: {
    ru: "медитация солнца энергия для достижения цели", en: "sun meditation energy for achieving goals", es: "meditación sol energía para alcanzar objetivos",
  },
  planets: {
    ru: "медитация планет практика энергия", en: "planetary meditation energy practice", es: "meditación planetas práctica energética",
  },
  golden: {
    ru: "медитация золотой храм изобилие деньги", en: "golden temple meditation abundance money", es: "meditación templo dorado abundancia dinero",
  },
  energy: {
    ru: "энергетическая практика медитация защита", en: "energy protection guided meditation practice", es: "meditación práctica energética protección",
  },
  "goals-money": {
    ru: "медитация достижения цели личное развитие", en: "guided meditation goal achievement personal growth", es: "meditación guiada conseguir objetivos desarrollo personal",
  },
  "love-relationships": {
    ru: "медитация отношения любовь забота", en: "guided meditation love relationships self compassion", es: "meditación guiada amor relaciones autocompasión",
  },
  "energy-confidence": {
    ru: "медитация энергия уверенность спокойствие", en: "guided meditation energy confidence calm", es: "meditación guiada energía confianza calma",
  },
  "stress-anxiety": {
    ru: "медитация расслабление стресс тревога", en: "guided meditation stress relief relaxation anxiety", es: "meditación guiada relajación estrés ansiedad",
  },
  stress: {
    ru: "медитация расслабление антистресс", en: "guided meditation stress relief", es: "meditación guiada aliviar estrés",
  },
  relationships: {
    ru: "практика медитация отношения любовь", en: "meditation practice relationships compassion", es: "práctica meditación relaciones amor",
  },
  work: {
    ru: "медитация цель карьера мотивация", en: "meditation goals motivation work", es: "meditación objetivos motivación trabajo",
  },
  meaning: {
    ru: "медитация осознанность смысл жизни", en: "mindfulness meditation meaning purpose", es: "meditación conciencia propósito vida",
  },
});

export function normalizeMyTubeYouTubeScope(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const {shelf, locale, language = "all", category = "all", collection = "all", goal = "all"} = input;
  if (!SHELVES.has(shelf) || !LOCALES.has(locale) ||
      !["all", ...LOCALES].includes(language) ||
      (category !== "all" && !CATEGORIES.has(category)) ||
      (collection !== "all" && !COLLECTIONS.has(collection)) ||
      (goal !== "all" && !GOALS.has(goal))) return null;
  // A selection is a public editorial label only, never user-provided search text.
  // Use one dominant topic so the shared cache has a tightly bounded key space.
  const topic = shelf === "practices" && COLLECTIONS.has(collection) ? collection :
    shelf === "practices" && CATEGORIES.has(category) ? category :
    shelf === "practices" && GOALS.has(goal) ? goal : shelf;
  const queryLanguage = language === "all" ? locale : language;
  return {shelf, locale, queryLanguage, topic,
    query: SEARCH_TERMS[topic][queryLanguage],
    key: `${shelf}:${queryLanguage}:${topic}`};
}

export function youtubeSearchUrl(scope) {
  return scope && typeof scope.query === "string" ?
    `https://www.youtube.com/results?search_query=${encodeURIComponent(scope.query)}` : null;
}

export function durationSeconds(iso) {
  if (typeof iso !== "string") return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!match || match.slice(1).every(x => x == null)) return null;
  const parts = match.slice(1).map(n => Number(n || 0));
  if (parts.some(n => !Number.isSafeInteger(n))) return null;
  const seconds = parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : null;
}

export function verifiedYouTubeMatches(searchData, videoData, shelf) {
  if (!SHELVES.has(shelf)) return [];
  const snippets = new Map();
  for (const record of Array.isArray(searchData?.items) ? searchData.items.slice(0, 50) : []) {
    const id = record?.id?.videoId;
    if (VIDEO_ID.test(id || "") && !snippets.has(id)) snippets.set(id, record.snippet || {});
  }
  const valid = new Map();
  for (const item of Array.isArray(videoData?.items) ? videoData.items.slice(0, 50) : []) {
    const id = item?.id;
    if (!VIDEO_ID.test(id || "") || !snippets.has(id) || valid.has(id)) continue;
    const duration = durationSeconds(item.contentDetails?.duration);
    if (!duration || (shelf === "practices" && duration > 900) ||
        item.status?.privacyStatus !== "public" || item.status?.embeddable !== true ||
        item.status?.madeForKids === true || item.snippet?.liveBroadcastContent === "live") continue;
    const snippet = item.snippet || snippets.get(id);
    if (!snippet?.title || !snippet?.channelTitle || typeof snippet.title !== "string") continue;
    valid.set(id, {
      id, provider: "youtube", title: snippet.title.slice(0, 220),
      channel: String(snippet.channelTitle).slice(0, 140),
      href: `https://www.youtube.com/watch?v=${id}`,
      poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      durationSeconds: duration,
    });
  }
  // Preserve provider relevance order, not the order returned by videos.list.
  return [...snippets.keys()].filter(id => valid.has(id)).map(id => valid.get(id));
}
