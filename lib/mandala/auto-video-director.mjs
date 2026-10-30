/**
 * Holistic House Auto Video Director v1 — deterministic, local-only recommendation.
 * Consumes an ephemeral goal; returns only allowlisted preset IDs and metadata.
 * No raw goal, clinical/profile information, API requests, or paid rendering.
 *
 * Existing hand-curated 4-MP4 presets are the sole executable Free output.
 * Provider/AI generation and psychological treatment are NOT implemented here.
 */
export const AUTO_VIDEO_DIRECTOR_VERSION = "hh-auto-video-director-v1";
const THEMES = ["energy","money","relationships","goals","life","health"];
const HINTS = {
  energy:["энерг","бодр","вдохнов","сил","актив","устал","vital","energy","energía","energia","motivation","inspir","vigor","fuerza"],
  money:["деньг","финанс","доход","карьер","бизнес","работ","проект","заработ","оплат","money","income","career","work","business","financ","dinero","trabaj","carrera","ingres"],
  relationships:["любов","отношен","партн","близост","довер","общен","семь","love","relationship","connection","trust","partner","family","amor","relacion","pareja","confian"],
  goals:["цель","уверенн","решительн","направлен","фокус","прокрастин","собран","мечт","сделать шаг","goal","confidence","focus","purpose","direction","decis","meta","confianza","objetivo","enfoque"],
  life:["перемен","новый этап","начать заново","жизн","смысл","свобод","путь","рост","развити","change","new chapter","life","freedom","meaning","growth","cambio","vida","libert","crecim"],
  health:["тревог","стресс","спокой","успоко","напряж","сон","расслаб","отдых","тишин","восстанов","дыхани","пауза","мягк","anxiety","stress","calm","sleep","rest","relax","breathe","peace","ansiedad","estrés","estres","calma","descans","sueño","respir"]
};
const PRESET_HINTS = {
  "warm-prosperity":["тепл","рассвет","старт","sunrise","warm","amanecer"],
  "new-opportunities":["возможност","шанс","новый проект","opportun","chance","oportun"],
  "steady-foundation":["стабил","опор","безопас","надёж","secure","stable","safety","segur","estable"],
  "inspiring-motion":["мечт","вдохнов","действ","dream","inspire","act","sueñ"],
  "morning-energy":["утр","бодр","заряд","morning","active","mañana","energ"],
  "ocean-breath":["мор","океан","дых","волн","sea","ocean","breath","mar","respir"],
  "light-and-space":["свет","простор","ясност","light","space","clarity","luz","clarid"],
  "flowing-vitality":["поток","движ","сил","flow","motion","vital","flujo","movim"],
  "gentle-new-day":["начал","новый этап","утро","new","begin","start","nuevo","comienz"],
  "rooted-freedom":["опор","корн","свобод","root","freedom","raíz","libert"],
  "coastal-renewal":["обнов","море","берег","renew","coast","renov"],
  "forest-morning":["лес","дерев","раст","forest","tree","grow","bosque"],
  "gentle-rest":["устал","отдых","мягк","расслаб","rest","gentle","relax","descans"],
  "quiet-awakening":["свеж","утро","просып","renew","fresh","morning","despert"],
  "water-and-breath":["дых","текуч","вод","breath","water","respir","agua"],
  "natural-stillness":["тишин","спокой","покой","quiet","still","peace","silenc"],
  "warm-connection":["тепл","близост","контакт","warm","close","connect","cercan"],
  "trust-and-space":["довер","границ","простран","trust","space","confian","espacio"],
  "open-hearted":["любов","сердц","открыт","love","heart","amor","coraz"],
  "calm-together":["мир","спокой","вместе","calm","together","paz","juntos"],
  "first-step":["первый шаг","начать","старт","first step","begin","primer paso"],
  "clear-direction":["ясност","фокус","цель","направлен","clarity","focus","direction","clarid"],
  "open-horizon":["перспектив","новые возможности","горизонт","horizon","future","horizonte"],
  "find-my-way":["мой путь","смысл","поиск","find my way","purpose","camino"]
};
const EXCLUSION_RULES = [
  {id:"water",request:/(?:без|избег(?:ать|аю)|не хочу|no|avoid|sin)\s+(?:(?:каких-либо|any|the)\s+)?(?:вод[уы]|моря|океана|water|sea|ocean|agua|mar)(?=$|\s|[,.;!?])/iu,
    visual:/(sea|ocean|coast|water|river|stream|falls|breeze|shore|beach|pulse|coastal)/i},
  {id:"forest",request:/(?:без|избег(?:ать|аю)|не хочу|no|avoid|sin)\s+(?:(?:каких-либо|any|the)\s+)?(?:лес[а-я]*|дерев[а-я]*|forest|trees?|bosque|árbol)/iu,
    visual:/(forest|tree|fern|root|garden|blossom|mossy)/i},
  {id:"dark",request:/(?:без|избег(?:ать|аю)|не хочу|no|avoid|sin)\s+(?:темнот[а-я]*|ноч[а-я]*|dark(?:ness)?|night|oscuro|noche)/iu,
    visual:/(night|stars|dark)/i}
];
function cleanGoal(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,320).toLocaleLowerCase();
}
function countMatches(text, terms) {
  return terms.reduce((points,term)=>points+(text.includes(term)?1:0),0);
}
function clipAllowed(id,exclusions) {
  return exclusions.every(exclusion=>!exclusion.visual.test(id));
}
function supportedPreset(preset, exclusions) {
  return !!preset && typeof preset.id === "string" && THEMES.includes(preset.theme) &&
    Array.isArray(preset.clips) && preset.clips.length === 4 &&
    preset.clips.every(clip=>typeof clip==="string" && clip.length>0 && clipAllowed(clip,exclusions)) &&
    new Set(preset.clips).size === 4;
}
function parseLength(text) {
  if (/\b60\s*(?:сек|sec|s(?:eg)?\b)|\b1\s*(?:мин|min|minute)/i.test(text)) return 60;
  if (/\b10\s*(?:сек|sec|s(?:eg)?\b)/i.test(text)) return 10;
  if (/\b20\s*(?:сек|sec|s(?:eg)?\b)/i.test(text)) return 20;
  if (/\b30\s*(?:сек|sec|s(?:eg)?\b)/i.test(text)) return 30;
  return 30;
}
/**
 * Recommendations are deterministic and derived solely from approved stock
 * presets supplied by the existing local editor. Caller MUST verify each MP4
 * is playable/licensed before approving a real export.
 */
export function recommendAutoVideo({goal="",locale="ru",fallbackTheme="energy",presets=[],preferredTheme=null}={}) {
  const text=cleanGoal(goal);
  const safeLocale=["ru","en","es"].includes(locale)?locale:"ru";
  const fallback=THEMES.includes(fallbackTheme)?fallbackTheme:"energy";
  const scores=THEMES.map(theme=>({
    theme,points:countMatches(text,HINTS[theme]),
  })).sort((a,b)=>b.points-a.points||THEMES.indexOf(a.theme)-THEMES.indexOf(b.theme));
  const selected=THEMES.includes(preferredTheme)?preferredTheme:
    (scores[0].points>0?scores[0].theme:fallback);
  const confidence=preferredTheme?"explicit":scores[0].points===0?"low":
    scores[0].points-scores[1].points>=2?"high":"medium";
  const exclusions=EXCLUSION_RULES.filter(rule=>rule.request.test(text));
  const requestsSpecificNewSubject=/(?:ор[её]л|волк|дракон|phoenix|eagle|wolf|dragon|águila|aguila|lobo)/iu.test(text);
  const available=presets.filter(p=>supportedPreset(p,exclusions));
  const ranked=available.map((preset,index)=>({
    preset, index,
    points:(preset.theme===selected?100:0)+
      countMatches(text,PRESET_HINTS[preset.id]||[])*6 +
      (preset.id==="gentle-rest"&&selected==="health"?2:0) +
      (preset.id==="clear-direction"&&selected==="goals"?2:0),
  })).sort((a,b)=>b.points-a.points||a.index-b.index);
  const inTheme=ranked.filter(item=>item.preset.theme===selected);
  const best=inTheme[0];
  return Object.freeze({
    version:AUTO_VIDEO_DIRECTOR_VERSION,
    locale:safeLocale,
    theme:selected,
    confidence,
    durationSeconds:parseLength(text),
    aspect:"landscape",
    kind:best?"existing_mp4_compilation":"no_matching_licensed_preset",
    presetId:best?.preset.id||null,
    alternativePresetIds:inTheme.slice(1,4).map(item=>item.preset.id),
    excludedMotifs:exclusions.map(item=>item.id),
    sourceClipIds:best?.preset.clips.slice()||[],
    // Free originals remain available as symbolism, but are NOT the requested new fictional footage.
    requiresNewAiFootage:requestsSpecificNewSubject,
    paidRenderApproved:false,
    noExternalClientData:true,
  });
}
