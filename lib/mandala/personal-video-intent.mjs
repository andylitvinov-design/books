/**
 * Local-only intent matching for the existing Holistic House 24-scene editor.
 * Pure function: NO network, AI provider, private-photo access or persistence.
 * This is a visual navigation aid, not psychological/financial advice.
 */
export const PERSONAL_VIDEO_THEMES = Object.freeze(["money", "relationships", "energy", "goals"]);
const ALL_SCENES = Object.freeze({
  money: ["golden-rain","cosmic-flow","abundance-tree","opportunity-falls","money-magnet",
    "path-to-goals","partners","infinite-flow","golden-shield","abundance-circle","life-gifts","dreams"],
  relationships: ["heart-light","warm-connection","blossom-garden","two-circles"],
  energy: ["sun-flight","green-vortex","light-waterfall","gentle-shield"],
  goals: ["light-path","open-door","guiding-stars","meaning-tree"],
});
const DEFAULTS = Object.freeze({
  money: "golden-rain", relationships: "heart-light",
  energy: "sun-flight", goals: "light-path",
});
// Stem sets for EN/RU/ES: category is explicitly chosen by the client.
// Match only scene visual metaphor, not inferred health or personal traits.
const KEYWORDS = Object.freeze({
  money: {
    partners: ["клиент","партн","сотрудн","customer","client","partner","cliente","socio"],
    "money-magnet": ["оплат","заработ","доход","income","salary","pay","earn","revenue","cobro","ingres","salario","pago"],
    "golden-shield": ["стабил","безопас","береж","защит","secure","stabil","safe","segurid","protec"],
    "abundance-tree": ["рост","развит","раст","grow","growth","flourish","crecim","crecer","arbol"],
    "path-to-goals": ["проект","план","цель","project","plan","goal","proyecto","meta"],
    "opportunity-falls": ["возможност","шанс","opportun","chance","oportun","posibil"],
    "abundance-circle": ["баланс","гармон","balance","equilibr","armon"],
    dreams: ["мечт","dream","suen"],
  },
  relationships: {
    "warm-connection": ["близ","довер","контакт","связ","trust","connect","intim","confian","cercan"],
    "blossom-garden": ["принят","нежн","забот","accept","gentle","care","acept","cuid"],
    "two-circles": ["взаим","встреч","партнер","meeting","mutual","together","encuent","recipro"],
    "heart-light": ["любов","сердц","тепл","love","heart","warm","amor","corazon"],
  },
  energy: {
    "gentle-shield": ["границ","защит","безопас","boundary","safe","protect","limite","protecc"],
    "light-waterfall": ["расслаб","отдых","устал","rest","relax","calm","descans","relaj"],
    "green-vortex": ["движ","сила","мотив","strength","motion","energia","energ","fuerza"],
    "sun-flight": ["солнц","свет","тепл","sun","light","shine","sol","luz"],
  },
  goals: {
    "open-door": ["нов","начал","двер","измен","change","start","begin","new","nuevo","cambio"],
    "guiding-stars": ["ясн","смысл","ориент","clarity","purpose","meaning","sentido","clarid"],
    "meaning-tree": ["ценност","предназнач","призван","value","calling","root","valor","proposit"],
    "light-path": ["путь","цель","шаг","дорог","план","path","step","goal","camino","meta"],
  },
});
export function graphemeTrim(value, max = 160) {
  if (typeof value !== "string" || !Number.isInteger(max) || max < 1 || max > 500) return "";
  const trimmed = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (typeof Intl.Segmenter === "function") {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed),
      segment => segment.segment).slice(0,max).join("");
  }
  return Array.from(trimmed).slice(0,max).join("");
}
export function captionFromWish(wish) {
  return graphemeTrim(wish,60);
}
/**
 * @param {{theme:string,wish:string,locale:string,availableScenes:ReadonlyArray<string>}} input
 */
export function suggestPersonalVideoScene({theme,wish,locale,availableScenes}) {
  if (!Object.hasOwn(ALL_SCENES,theme) || !["en","ru","es"].includes(locale) ||
      !Array.isArray(availableScenes)) throw new Error("invalid_video_intent");
  const allowed = ALL_SCENES[theme];
  const scenes = availableScenes.filter(id => allowed.includes(id));
  if (!scenes.length) throw new Error("no_available_video_scenes");
  const safeWish = graphemeTrim(wish);
  const words = safeWish.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en")
    .match(/[\p{L}\p{N}]+/gu) || [];
  // Match the first *specific* visual metaphor with a clear token.
  // Never use user text to compose an external provider prompt.
  let winner = null, highest = 0;
  const groups = KEYWORDS[theme];
  for (const id of scenes) {
    const stems = groups[id] || [];
    let score = 0;
    for (const word of words) for (const stem of stems) {
      if (word.startsWith(stem)) score = Math.max(score, stem.length + (id === "two-circles" && stem === "взаим" ? 3 : 0));
    }
    if (score > highest) { highest=score;winner=id; }
  }
  const sceneId = winner || (scenes.includes(DEFAULTS[theme]) ? DEFAULTS[theme] : scenes[0]);
  return Object.freeze({
    theme,sceneId,matched:Boolean(winner),
    reasonId:winner ? "matched_intent" : "default_scene",
    captionSuggestionId:theme,
  });
}
