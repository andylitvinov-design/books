/** Action/prop evidence from reviewed photo metadata, never pixel or motion verification. */
const CUES=Object.freeze([
 ["bridge",/\b(?:bridge|footbridge|puente)\b|мост/iu],
 ["river",/\b(?:river|stream|creek|r[ií]o)\b|рек[ауеи]|ручей/iu],
 ["forest",/\b(?:forest|woods|woodland|bosque)\b|лес[ауеом]?|лесн/iu],
 ["path",/\b(?:path|trail|footpath|pathway|sendero|camino)\b|троп[а-я]*|дорожк/iu],
 ["bag",/\b(?:bag|backpack|suitcase|duffel|mochila|maleta|bolsa)\b|сумк|рюкзак|чемодан/iu],
 ["ground",/\b(?:ground|floor|soil|suelo|tierra)\b|земл[яеию]|пол[ауе]\b/iu],
 ["feet",/\b(?:foot|feet|shoe|shoes|boot|boots|pie|pies|zapatos?)\b|ног[аеиу]|ступн|ботин/iu],
 ["person",/\b(?:person|someone|figure|travell?er|hiker|man|woman|people|persona|viajero|figura)\b|путник|человек|фигура|пешеход/iu],
 ["walking",/\b(?:walk|walking|step|stepping|camina|paso)\b|шаг|ид[её]т|ступа/iu],
 ["mist",/\b(?:mist|misty|fog|foggy|niebla|bruma)\b|туман/iu],
 ["sunlight",/\b(?:sunlight|sunrise|sunbeams?|sunlit|sun|dawn|light|amanecer|luz solar)\b|рассвет|солнечн|свет/iu],
 ["window",/\b(?:window|ventana)\b|окн[ауое]/iu],
 ["phone",/\b(?:phone|telephone|smartphone|mobile|tel[eé]fono|m[oó]vil)\b|телефон/iu],
 ["door",/\b(?:door|doorway|puerta)\b|двер/iu],
 ["chair",/\b(?:chair|seat|silla)\b|стул|кресл/iu],
 ["hands",/\b(?:hand|hands|manos?)\b|рук[ауеи]|ладон/iu],
 ["table",/\b(?:table|desk|mesa|escritorio)\b|стол/iu],
 ["train",/\b(?:train|tren)\b|поезд/iu],
 ["station",/\b(?:station|platform|estaci[oó]n|and[eé]n)\b|(?<![\p{L}])(?:станци|платформ)/iu],
 ["keys",/\b(?:keys?|llaves?)\b|ключ[аи]/iu],
 ["cup",/\b(?:cup|glass|taza|vaso)\b|чашк|стакан/iu],
 ["pocket",/\b(?:pocket|bolsillo)\b|карман/iu],
 ["letter",/\b(?:letter|note|notebook|paper|carta|libreta|papel)\b|письм|записк|блокнот/iu]
]);
const ICONIC=new Set(["bridge","river","bag","feet","window","phone","door","chair",
 "train","station","keys","cup","letter"]);
const ALIASES=Object.freeze({people:"person",traveler:"person",traveller:"person",
 figure:"person",hiker:"person",foot:"feet",shoes:"feet",boots:"feet",
 suitcase:"bag",backpack:"bag",stream:"river",woodland:"forest",trail:"path",
 sunrise:"sunlight",sunbeams:"sunlight",dawn:"sunlight",step:"walking",
 steps:"walking",hand:"hands"});
const norm=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/ё/g,"е");
const canonical=value=>ALIASES[norm(value)]||norm(value);
export function sceneVisualCues(guide){
 if(!guide||typeof guide!=="object")return [];
 const tagged=Array.isArray(guide.keywords)?guide.keywords
  .filter(x=>typeof x==="string"&&x.length<=32).map(canonical)
  .filter(tag=>CUES.some(([cue])=>cue===tag)):[];
 const visible=norm([guide.visual||guide.action||"",guide.title||""].join(" "));
 // Don't infer a station from "дистанцию" or require a bridge in the
 // final sunlit path merely because it is described as beyond the bridge.
 const primaryBridge=tagged.includes("bridge")||
  /\b(?:on|onto|over|across)\s+(?:the\s+)?bridge\b|(?:на|через)\s+мост|cruza(?:r)?\s+(?:el\s+)?puente/iu.test(visible);
 const contextualBridge=!primaryBridge&&
  /за\s+мостом|\bbeyond\s+(?:the\s+)?bridge\b|al otro lado del puente/iu.test(visible);
 const inferred=CUES.filter(([cue,pattern])=>pattern.test(visible)&&
  !(cue==="bridge"&&contextualBridge)).map(([cue])=>cue);
 return [...new Set(tagged.length>=2?
  [...tagged,...inferred.filter(cue=>ICONIC.has(cue))]:
  [...tagged,...inferred])].slice(0,8);
}
export function scoreScenePhoto(photo,guide,{scenarioId="",pinId="",aspect=""}={}){
 if(!photo||!Array.isArray(photo.tags)||
    photo.editorialScenarioId&&photo.editorialScenarioId!==scenarioId)return null;
 const cues=sceneVisualCues(guide);
 if(!cues.length)return null; // Feelings and affirmations are NOT photographed actions.
 const tags=new Set(photo.tags.map(canonical));
 const matched=cues.filter(cue=>tags.has(cue));
 if(cues.filter(cue=>ICONIC.has(cue)).some(cue=>!tags.has(cue)))return null;
 if(matched.length<Math.max(1,Math.ceil(cues.length*.65)))return null;
 if(cues.includes("forest")&&["city","office","home","room","wedding"].some(t=>tags.has(t)))
  return null;
 if(cues.includes("person")&&["couple","family","group"].some(t=>tags.has(t))&&
   !/\b(?:couple|family|group|pair|pareja|familia)\b|семь|пар[аыу]/iu.test(
     String(guide.visual||guide.action||"")))return null;
 if(aspect&&photo.orientation&&photo.orientation!==aspect)return null;
 return matched.length*24+cues.length*2+(photo.id===pinId?75:0)+
  (aspect&&photo.orientation===aspect?8:0);
}