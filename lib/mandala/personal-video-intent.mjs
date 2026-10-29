/**
 * Local-only intent matching for the existing Holistic House 24-scene editor.
 * Pure function: NO network, AI provider, private-photo access or persistence.
 * This is a visual navigation aid, not psychological/financial advice.
 */
export const PERSONAL_VIDEO_THEMES = Object.freeze(["money", "energy", "life", "health", "relationships", "goals"]);
const ALL_SCENES = Object.freeze({
  money: ["golden-rain","cosmic-flow","abundance-tree","opportunity-falls","money-magnet",
    "path-to-goals","partners","infinite-flow","golden-shield","abundance-circle","life-gifts","dreams",
    "wealth-sunrise","golden-harvest","radiant-portal","prosperity-coast"],
  relationships: ["heart-light","warm-connection","blossom-garden","two-circles"],
  energy: ["solar-surge","ocean-pulse","sunbeam-flow","river-power","desert-light","mountain-air",
    "sun-flight","green-vortex","light-waterfall","gentle-shield"],
  life: ["wildflower-dance","fern-awakening","coastal-freedom","lone-tree","meadow-morning"],
  health: ["calm-sea","morning-dew","mossy-stream","gentle-falls","sea-breeze"],
  goals: ["light-path","open-door","guiding-stars","meaning-tree"],
});
const DEFAULTS = Object.freeze({
  money: "golden-rain", relationships: "heart-light",
  energy: "solar-surge", life: "wildflower-dance", health: "calm-sea", goals: "light-path",
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
    "wealth-sunrise": ["рассвет","sunrise","dawn","amanecer"],
    "golden-harvest": ["урожай","harvest","cosecha"],
    "radiant-portal": ["портал","portal","puerta"],
    "prosperity-coast": ["берег","мор","ocean","coast","costa"],
  },
  relationships: {
    "warm-connection": ["близ","довер","контакт","связ","trust","connect","intim","confian","cercan"],
    "blossom-garden": ["принят","нежн","забот","accept","gentle","care","acept","cuid"],
    "two-circles": ["взаим","встреч","партнер","meeting","mutual","together","encuent","recipro"],
    "heart-light": ["любов","сердц","тепл","love","heart","warm","amor","corazon"],
  },
  energy: {
    "solar-surge": ["заряд","живост","бодр","vital","charge","charge","vigor"],
    "ocean-pulse": ["волна","ритм","wave","ocean","ola","pulso"],
    "sunbeam-flow": ["луч","свет","light","rays","luz"],
    "river-power": ["поток","вод","flow","river","flujo","agua"],
    "desert-light": ["ясн","простор","clarity","open","clarid"],
    "mountain-air": ["воздух","дых","breath","mountain","aire"],
    "gentle-shield": ["границ","защит","безопас","boundary","safe","protect","limite","protecc"],
    "light-waterfall": ["расслаб","отдых","устал","rest","relax","calm","descans","relaj"],
    "green-vortex": ["движ","сила","мотив","strength","motion","energia","energ","fuerza"],
    "sun-flight": ["солнц","свет","тепл","sun","light","shine","sol","luz"],
  },
  life: {
    "wildflower-dance": ["цвет","красот","цветен","flower","bloom","flor"],
    "fern-awakening": ["начал","нов","рост","new","grow","renacer"],
    "coastal-freedom": ["свобод","простор","freedom","libert"],
    "lone-tree": ["корн","опор","дерев","roots","tree","raiz"],
    "meadow-morning": ["утр","начат","morning","dawn","mañana"],
  },
  health: {
    "calm-sea": ["спокой","тишин","calm","quiet","tranquil"],
    "morning-dew": ["свеж","утро","fresh","dew","fresc"],
    "mossy-stream": ["ручей","вода","stream","water","arroyo"],
    "gentle-falls": ["расслаб","отдых","мягк","relax","rest","descans"],
    "sea-breeze": ["ветер","бриз","дых","breeze","air","brisa"],
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
const normalizeIntentText = text =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en");
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
  const words = normalizeIntentText(safeWish)
    .match(/[\p{L}\p{N}]+/gu) || [];
  // Match the first *specific* visual metaphor with a clear token.
  // Never use user text to compose an external provider prompt.
  let winner = null, highest = 0;
  const groups = KEYWORDS[theme];
  for (const id of scenes) {
    const stems = (groups[id] || []).map(normalizeIntentText);
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


// A cost-free, entirely local storyboard from the visitor's OWN explicit words.
// This reuses the existing approved scene IDs and keyword dictionary; unlike
// text-to-video AI it NEVER invents imagery, uploads a prompt or calls an API.
export const FREE_STORYBOARD_VERSION = "local-scene-sequence-1";
const THEME_CUES = Object.freeze({
  money:["деньг","финанс","работ","бизнес","money","finance","work","business","dinero","finanza","negocio"],
  energy:["энерг","сил","бодр","жизненн","energy","vitality","strength","energ","fuerza"],
  relationships:["любов","отношен","друж","довер","relationship","love","friendship","amor","relacion","confianz"],
  goals:["цел","смысл","план","намерен","goal","purpose","meaning","target","meta","sentido","objetivo"],
  life:["жизн","радост","свобод","природ","life","joy","nature","freedom","vida","alegr","naturaleza"],
  health:["спокой","отдых","сон","медитац","здоров","rest","sleep","calm","meditat","relax","salud","descanso","sueño"],
});
const joiners = /\s+(?:затем|потом|далее|после\s+этого|then|afterwards|next|luego|despues|después)\s+/giu;
const wordsWithPosition = value => [...normalizeIntentText(value).matchAll(/[\p{L}\p{N}]+/gu)]
  .map(match=>({word:match[0],at:match.index||0}));
function storyboardCandidates(phrase, availableByTheme) {
  const words=wordsWithPosition(phrase);
  const candidates=[];
  for(const theme of PERSONAL_VIDEO_THEMES) {
    const allowed=ALL_SCENES[theme];
    const available=Array.isArray(availableByTheme?.[theme])
      ? availableByTheme[theme].filter(id=>allowed.includes(id)) : allowed;
    if(!available.length)continue;
    for(const id of available) {
      let max=0, at=Infinity;
      for(const {word,at:position} of words)
        for(const rawStem of KEYWORDS[theme][id]||[]) {
          const stem=normalizeIntentText(rawStem);
          if(word.startsWith(stem) && stem.length>=3 && stem.length>max) {
            max=stem.length;at=position;
          }
        }
      if(max)candidates.push({theme,sceneId:id,score:max+2,at,matched:true});
    }
    const defaultId=available.includes(DEFAULTS[theme])?DEFAULTS[theme]:available[0];
    for(const {word,at:position} of words)
      for(const rawStem of THEME_CUES[theme]) {
        const stem=normalizeIntentText(rawStem);
        if(word.startsWith(stem) && stem.length>=3)
          candidates.push({theme,sceneId:defaultId,score:Math.min(5,stem.length),at:position,matched:true});
      }
  }
  // A precise visual symbol outranks a generic theme cue, but the request's
  // original order breaks ties instead of an opaque statistical ranking.
  return candidates.sort((a,b)=>b.score-a.score||a.at-b.at||
    PERSONAL_VIDEO_THEMES.indexOf(a.theme)-PERSONAL_VIDEO_THEMES.indexOf(b.theme));
}

/**
 * @param {{
 *   prompt:string,locale:"en"|"ru"|"es",preferredTheme?:string,
 *   availableByTheme?:Record<string,string[]>,maxShots?:number
 * }} input
 */
export function buildFreePromptStoryboard({prompt,locale,preferredTheme="energy",availableByTheme,maxShots=3}) {
  if(!["en","ru","es"].includes(locale)||!PERSONAL_VIDEO_THEMES.includes(preferredTheme))
    throw new Error("invalid_video_storyboard");
  const clean=graphemeTrim(prompt,320);
  const limit=Number.isInteger(maxShots)?Math.max(1,Math.min(3,maxShots)):3;
  const chunks=clean.replace(joiners,".").split(/[.,;!?\n]+/u)
    .map(x=>x.trim()).filter(Boolean).slice(0,12);
  /** @type {Array<{theme:string,sceneId:string,matched:boolean}>} */
  const shots=[];
  const used=new Set();
  const add=candidate=>{
    if(!candidate || used.has(candidate.theme+":"+candidate.sceneId)||shots.length>=limit)return false;
    used.add(candidate.theme+":"+candidate.sceneId);
    shots.push({theme:candidate.theme,sceneId:candidate.sceneId,matched:candidate.matched});
    return true;
  };
  for(const chunk of chunks) {
    const candidate=storyboardCandidates(chunk,availableByTheme)
      .find(x=>!used.has(x.theme+":"+x.sceneId));
    add(candidate);
  }
  // When a visitor writes one long sentence rather than comma-separated shots,
  // still use distinct explicitly mentioned visual motifs in their text.
  if(shots.length<limit) {
    const all=storyboardCandidates(clean,availableByTheme)
      .sort((a,b)=>a.at-b.at||b.score-a.score);
    for(const entry of all) {
      if(shots.length>=limit)break;
      // Avoid adding a weak generic default of an already represented theme
      // unless the text explicitly contains a separate precise scene motif.
      if(shots.some(x=>x.theme===entry.theme) && entry.score<=5)continue;
      add(entry);
    }
  }
  if(!shots.length) {
    const allowed=ALL_SCENES[preferredTheme];
    const available=Array.isArray(availableByTheme?.[preferredTheme])
      ? availableByTheme[preferredTheme].filter(id=>allowed.includes(id)) : allowed;
    if(!available.length)throw new Error("no_available_video_scenes");
    add({theme:preferredTheme,sceneId:available.includes(DEFAULTS[preferredTheme])
      ?DEFAULTS[preferredTheme]:available[0],matched:false});
  }
  const normalized=normalizeIntentText(clean);
  const seconds=normalized.match(/(?:^|[\s:])(10|20|30|60)\s*(?:сек(?:унд(?:ы|а|у|е)?)?|sec(?:onds?)?|seg(?:undos?)?)(?=$|[^\p{L}])/u);
  const secondsValue=seconds?Number(seconds[1]):null;
  const aspect=/(?:9\s*[:/]\s*16|вертикал|portrait|vertical|reels|shorts|verticale)/u.test(normalized)
    ? "portrait":/(?:16\s*[:/]\s*9|горизонтал|landscape|horizontal|wide)/u.test(normalized)
      ? "landscape":/(?:1\s*[:/]\s*1|квадрат|square|cuadrado)/u.test(normalized)
        ? "square":null;
  const speed=/(?:динамич|быстр|подвиж|dynamic|fast|rapid|rapido|movimiento rapido)/u.test(normalized)
    ?"dynamic":/(?:плавн|медлен|спокойн|slow|gentle|lento|tranquil)/u.test(normalized)?"slow":null;
  const output={
    version:FREE_STORYBOARD_VERSION,
    shots:Object.freeze(shots.map(x=>Object.freeze(x))),
    matched:shots.some(x=>x.matched),
    options:Object.freeze({aspect,duration:secondsValue,speed}),
  };
  return Object.freeze(output);
}

// Small pure timeline shared by moving preview and the actual MediaRecorder.
// Fades through a dark scene boundary, so one decoded MP4 + local Canvas
// animations can create a multi-scene film without loading 3 HD decoders on iOS.
export function freeStoryboardFrameAt(shots,duration,time) {
  if(!Array.isArray(shots)||!shots.length||!Number.isFinite(duration)||duration<=0)
    throw new Error("invalid_video_storyboard_timeline");
  const total=Math.max(1,duration);
  const at=Number.isFinite(time)?Math.max(0,Math.min(total-.00001,time)):0;
  const section=total/shots.length;
  const index=Math.min(shots.length-1,Math.floor(at/section));
  const localTime=at-index*section;
  const fade=Math.min(.36,section*.15);
  const fadeIn=index>0&&localTime<fade ? 1-localTime/fade : 0;
  const fadeOut=index<shots.length-1&&section-localTime<fade ?
    1-(section-localTime)/fade : 0;
  return {index,scene:shots[index],sceneTime:localTime,shade:.82*Math.max(0,fadeIn,fadeOut)};
}
