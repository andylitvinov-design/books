/**
 * Prompt-to-four-shot director. This is a deterministic LOCAL visual retrieval
 * step, not AI video synthesis and not an external stock search.
 *
 * Only real, approved, same-origin MP4 masters from the canonical catalogue
 * may become renderable. The existing video composer validates them again.
 * No uploaded photos, transcripts, account data, paid APIs or fetch calls.
 */
import {
  isApprovedMontageScene,
  isSafeMontageScene,
  validateMontageClips,
} from "./video-montage-sources.mjs";

export const PROMPT_SHOT_DIRECTOR_VERSION = "hh-prompt-four-shot-v1";

// Multi-language intent stems are search hints, not clinical inferences.
const INTENTS = Object.freeze({
  forest:["лес","дерев","forest","tree","bosque","árbol","arbol"],
  sun:["солн","солнеч","рассвет","sun","sunrise","sol","amanecer"],
  morning:["утрен","утро","рассвет","morning","dawn","mañana"],
  mountain:["горн","гора","горе","mountain","montaña","montana"],
  water:["вод","море","моря","океан","рек","озер","ручей","water","sea","ocean","river","lake","stream","agua","mar","río","rio"],
  flowers:["цвет","лепест","flower","petal","bloom","flor"],
  light:["свет","сиян","луч","light","glow","ray","luz"],
  path:["троп","путь","дорог","шаг","path","road","trail","step","camino","paso"],
  horizon:["горизонт","даль","horizon","horizonte"],
  gold:["золот","деньг","изобил","gold","money","abundance","dinero","oro","abundancia"],
  calm:["спокой","тишин","покой","тревог","стресс","calm","peace","quiet","anxiety","stress","calma","tranquil","ansiedad","estrés"],
  rest:["отдых","устал","расслаб","восстанов","сон","rest","relax","tired","recovery","sleep","descans","relaj","sueño"],
  confidence:["уверен","смел","решител","confidence","courage","confianza","valent"],
  strength:["энерг","сил","бодр","ресурс","energy","strength","vitality","fuerza","energía"],
  trust:["довер","принят","поддерж","trust","accept","support","confianza","apoyo"],
  connection:["любов","отношен","близост","семь","love","relationship","connection","family","amor","relación","familia"],
  growth:["рост","развит","обнов","начать","новый","growth","grow","renew","new","crecim","renov"],
  clarity:["ясн","фокус","цель","смысл","clarity","focus","goal","purpose","claridad","meta"],
  freedom:["свобод","простор","freedom","space","libertad","espacio"],
});

// A request concept can match several tags describing the SAME photographed motif.
const SOURCE_TAGS=Object.freeze({
  forest:["forest","tree","trees","fern","garden","roots","moss"],
  sun:["sun","sunrise","sunbeam","golden","rays"],
  morning:["morning","dawn","dew","sunrise"],
  mountain:["mountain"],
  water:["sea","ocean","lake","water","river","stream","waves","waterfall","coast"],
  flowers:["flowers","flower","bloom","petal","garden"],
  light:["light","rays","glow","sparkle","gold"],
  path:["path","progress","goals","portal"],
  horizon:["horizon","space","open"],
  gold:["gold","abundance","prosperity"],
  calm:["calm","rest","stillness","soft","peace","balance"],
  rest:["rest","calm","stillness","soft","tenderness"],
  confidence:["confidence","strength","protection","stability","steady"],
  strength:["vitality","energy","movement","flow","sun"],
  trust:["trust","acceptance","safety","protection","grounding"],
  connection:["connection","people","trust","tenderness","flowers"],
  growth:["growth","renewal","bloom","progress","morning"],
  clarity:["clarity","focus","goals","horizon"],
  freedom:["freedom","horizon","sky","air","space"],
});

const BEATS=Object.freeze([
  {id:"arrival",tags:["calm","rest","stillness","morning","dew","mist","soft","quiet","breath"]},
  {id:"support",tags:["trust","acceptance","safety","grounding","roots","tree","protection","stability"]},
  {id:"movement",tags:["sun","light","flow","movement","vitality","growth","renewal","bloom"]},
  {id:"integration",tags:["path","horizon","clarity","goals","progress","hope","freedom","open"]},
]);

function normalize(value){
  return String(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/\s+/g," ").trim().slice(0,800);
}
function requestedSignals(value,excludedMotifs){
  const text=normalize(value);
  const signals=Object.keys(INTENTS).filter(id=>
    INTENTS[id].some(stem=>text.includes(normalize(stem))));
  const excluded=new Set(excludedMotifs);
  return signals.filter(id=>
    !(excluded.has("water")&&id==="water")&&
    !(excluded.has("forest")&&id==="forest"));
}
function sourceTagSet(scene){
  return new Set([scene.id.replace(/-/g," "),...(scene.tags||[]),
    ...(scene.motifs||[]),...(scene.categories||[])].flatMap(v=>
      normalize(v).split(/[^a-z0-9]+/).filter(Boolean)));
}
function sceneMatchesSignal(sceneTags,signal){
  return (SOURCE_TAGS[signal]||[]).some(tag=>sceneTags.has(tag));
}
function emptyPlan(reason){
  return {version:PROMPT_SHOT_DIRECTOR_VERSION,mode:"unavailable",
    reason,clipIds:[],matchedSignals:[],missingSignals:[],
    requestedSignals:[],stages:[],canExport:false};
}

/**
 * @param {{goal:string,theme:string,scenes:readonly object[],
 *  excludedMotifs?:readonly string[],baseClipIds?:readonly string[]}} options
 */
export function recommendPromptShotPlan({
  goal="",theme="energy",scenes=[],excludedMotifs=[],baseClipIds=[],
}={}){
  // All exclusions and rights are validated by the existing compositor, too.
  if(!Array.isArray(scenes)||!Array.isArray(excludedMotifs)||
    !Array.isArray(baseClipIds))return emptyPlan("invalid_input");
  const eligible=scenes.filter(scene=>
    isApprovedMontageScene(scene)&&isSafeMontageScene(scene,excludedMotifs));
  const fallback=validateMontageClips([...baseClipIds],scenes,excludedMotifs)?
    [...baseClipIds]:[];
  if(eligible.length<4)return emptyPlan("not_enough_approved_footage");
  const signals=requestedSignals(goal,excludedMotifs);
  const info=eligible.map(scene=>({scene,tags:sourceTagSet(scene)}));
  const relevant=signals.filter(id=>
    info.some(({tags})=>sceneMatchesSignal(tags,id)));
  if(!relevant.length){
    if(!fallback.length)return emptyPlan("no_matching_licensed_footage");
    return {version:PROMPT_SHOT_DIRECTOR_VERSION,mode:"template",reason:"no_visual_match",
      clipIds:fallback,matchedSignals:[],missingSignals:signals,
      requestedSignals:signals,stages:BEATS.map((beat,index)=>({id:beat.id,clipId:fallback[index]})),
      canExport:true};
  }

  // Rank each narrative beat independently. Diversity and previously uncovered
  // motifs outrank reusing four near-identical pictures.
  const used=new Set(),covered=new Set(),selected=[],stages=[];
  for(let index=0;index<BEATS.length;index++){
    const beat=BEATS[index];
    const ranked=info.filter(({scene})=>!used.has(scene.id)).map(({scene,tags})=>{
      const matching=relevant.filter(id=>sceneMatchesSignal(tags,id));
      const newMatching=matching.filter(id=>!covered.has(id));
      const stageFit=beat.tags.filter(tag=>tags.has(tag)).length;
      const overlap=selected.length?info.filter(x=>selected.includes(x.scene.id))
        .reduce((sum,prior)=>sum+
          [...tags].filter(tag=>prior.tags.has(tag)).length,0):0;
      const score=newMatching.length*20+matching.length*7+
        Math.min(3,stageFit)*9+(scene.theme===theme?12:0)+
        (baseClipIds.includes(scene.id)?2:0)-Math.min(16,overlap*2);
      return {scene,score,matching};
    }).sort((a,b)=>b.score-a.score||a.scene.id.localeCompare(b.scene.id));
    const best=ranked[0];
    if(!best)return emptyPlan("not_enough_distinct_footage");
    selected.push(best.scene.id);
    used.add(best.scene.id);
    for(const id of best.matching)covered.add(id);
    stages.push({id:beat.id,clipId:best.scene.id,matchedSignals:best.matching});
  }
  if(!validateMontageClips(selected,scenes,excludedMotifs))
    return emptyPlan("media_validation_failed");
  return {version:PROMPT_SHOT_DIRECTOR_VERSION,mode:"personalized",reason:"scene_level_match",
    clipIds:selected,requestedSignals:signals,
    matchedSignals:signals.filter(id=>covered.has(id)),
    missingSignals:signals.filter(id=>!covered.has(id)),stages,canExport:true};
}

// Reuse the existing RU/EN/ES concept vocabulary for chronological speech cuts.
export const requestedVisualSignals=requestedSignals;
export function matchedVisualSignals(scene,signals=[]){
  if(!scene||!Array.isArray(signals))return [];
  const tags=sourceTagSet(scene);
  return signals.filter(id=>Object.hasOwn(SOURCE_TAGS,id)&&sceneMatchesSignal(tags,id));
}
