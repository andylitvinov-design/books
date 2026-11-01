/**
 * Holistic House executable four-scene director v1.
 * A prompt is NOT a render plan. This trusted compiler is the only boundary
 * from client intent (or optional LLM suggestions) to the existing real
 * approved-MP4 Canvas / MediaRecorder workflow.
 * No personal text, profile, uploads or fabricated assets leave this module.
 */
import {recommendAutoVideo} from "./auto-video-director.mjs";
import {allocateAdaptiveFilmTimeline} from "./free-film-timeline.mjs";
import {isSafeMontageScene,validateMontageClips} from "./video-montage-sources.mjs";
import {normalizeStageCaption} from "./stage-caption-track.mjs";

export const EXECUTABLE_VIDEO_SCENARIO_VERSION = "hh-executable-video-scenario-v1";
const VALID_LENGTHS = [10,15,20,30,60];
const VALID_ASPECTS = ["landscape","portrait","square"];
const VALID_MUSIC = ["none","harmony","love","meditation"];
const VALID_THEMES = ["money","energy","relationships","goals","life","health"];
const ROLES = ["opening","orientation","development","closing"];
const emptyCaptions=()=>["","","",""];
const safeLocale=x=>["ru","en","es"].includes(x)?x:"en";
const unique=x=>[...new Set(x)];
const isRecord=x=>!!x&&typeof x==="object"&&!Array.isArray(x);
const exactKeys=(object,keys)=>isRecord(object)&&Object.keys(object).every(key=>keys.includes(key));
const CUES=Object.freeze([
  {id:"mountains",test:/(?:гор(?:ы|а|е|ные|ах)|вершин|скал|mountains?|summit|peaks?|monta[ñn]a)/iu,tags:["mountain","sky","rock","peaks"]},
  {id:"food",test:/(?:еда|еды|еду|едой|пищ|блюд|кулинар|кухн|food|cooking|recipe|comida|receta)/iu,tags:["food","cooking","meal","fruit","vegetable"]},
  {id:"forest",test:/(?:лес|дерев|роща|forest|trees?|woods?|bosque|[aá]rbol)/iu,tags:["forest","trees","tree","fern","nature"]},
  {id:"sea",test:/(?:море|моря|океан|волны|sea|ocean|waves?|mar|oc[eé]ano|olas?)/iu,tags:["sea","water","coast","ocean","waves"]},
  {id:"water",test:/(?:вод[аыеу]|водопад|река|ручей|river|water|waterfall|stream|r[ií]o|agua)/iu,tags:["water","river","stream","waterfall","falls"]},
  {id:"flowers",test:/(?:цвет|сад|луг|flowers?|garden|blossom|jard[ií]n|flor(?:es)?)/iu,tags:["flowers","blossom","garden","meadow"]},
  {id:"sun",test:/(?:солнц|рассвет|закат|sunrise|sunset|sunlight|sun|amanecer|atardecer|sol)/iu,tags:["sun","sunrise","light","dawn"]},
  {id:"stars",test:/(?:зв[её]зд|космос|stars?|galaxy|estrellas?|galaxia)/iu,tags:["stars","night","sky","cosmic"]},
]);
const CAPTIONS={
  ru:{
    energy:["Новый импульс","Движение и свет","Мой следующий шаг","Продолжать в своём темпе"],
    money:["Начать с опоры","Замечать возможности","Действовать постепенно","Выбирать свой путь"],
    relationships:["Пространство для встречи","Уважение и границы","Тепло и доверие","Оставаться собой"],
    goals:["Я вижу направление","Шаг за шагом","Исследую возможности","Двигаюсь дальше"],
    life:["Новое начало","Всё меняется","Мой собственный ритм","Открытое пространство"],
    health:["Момент тишины","Замедлиться","Больше пространства","Бережно к себе"],
  },
  en:{
    energy:["A fresh beginning","Movement and light","One step forward","At my own pace"],
    money:["Find solid ground","Notice opportunities","Make gradual progress","Choose my direction"],
    relationships:["Room to connect","Respect and boundaries","Warmth and trust","Stay true to myself"],
    goals:["See a direction","Step by step","Explore possibilities","Moving forward"],
    life:["A new beginning","Things can change","My own rhythm","An open space"],
    health:["A quiet moment","Slow down","Find more space","Be gentle with myself"],
  },
  es:{
    energy:["Un nuevo comienzo","Movimiento y luz","El siguiente paso","A mi propio ritmo"],
    money:["Encontrar apoyo","Ver oportunidades","Avanzar poco a poco","Elegir mi camino"],
    relationships:["Espacio para conectar","Respeto y límites","Calidez y confianza","Ser yo mismo"],
    goals:["Ver una dirección","Paso a paso","Explorar posibilidades","Seguir adelante"],
    life:["Un nuevo comienzo","Todo puede cambiar","Mi propio ritmo","Un espacio abierto"],
    health:["Un momento de calma","Bajar el ritmo","Encontrar espacio","Cuidarme con respeto"],
  },
};
/**
 * Interpret client visual motifs in the order mentioned, not the fixed
 * category registry order. Negated subjects are not positive instructions.
 * Return public motif IDs only, never the visitor's private sentence.
 */
export function visualSignalsFromGoal(goal=""){
  const text=typeof goal==="string"?goal.slice(0,800):"";
  const hits=[];
  for(const [i,cue] of CUES.entries()){
    const pattern=new RegExp(cue.test.source,cue.test.flags.includes("g")?cue.test.flags:cue.test.flags+"g");
    for(const match of text.matchAll(pattern)){
      const before=text.slice(Math.max(0,match.index-60),match.index);
      const negative=/(?:^|[\s,;])(?:без|избегать|исключить|не\s+хочу|without|avoid|no|sin|no\s+quiero)\s+(?:(?:любой|любых|any|the|all)\s+)?$/iu.test(before);
      if(negative)continue;
      hits.push({id:cue.id,at:match.index,order:i});
      break;
    }
  }
  return Object.freeze(hits.sort((a,b)=>a.at-b.at||a.order-b.order).map(hit=>hit.id));
}
/** Literal visual match: broad shared tags (like "sky" or "light")
 * must not turn an unrelated meadow into a requested mountain/forest.
 * Only trusted source metadata participates; client prose never becomes an ID.
 */
const DIRECT_VISUAL_TAGS=Object.freeze({
  mountains:["mountain","mountains","peak","peaks"],
  forest:["forest","tree","trees","fern","woods"],
  sea:["sea","ocean","coast","beach","shore"],
  water:["water","river","stream","waterfall","falls","lake"],
  flowers:["flower","flowers","blossom","garden","meadow"],
  sun:["sun","sunrise","sunset","dawn"],
  stars:["star","stars","cosmic","galaxy"],
  food:["food","meal","cooking","fruit","vegetable","soup","dish"],
});
// Motivic source metadata is more reliable than marketing tags. A reel
// described as "flowers in a forest" should prefer an actual forest motif.
function visualSourceScore(scene,signal){
  if(!scene||!Object.hasOwn(DIRECT_VISUAL_TAGS,signal))return 0;
  const tokens=values=>new Set(values.join(" ").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const motifs=tokens(Array.isArray(scene.motifs)?scene.motifs:[]);
  const id=tokens([scene.id]);
  const tags=tokens(Array.isArray(scene.tags)?scene.tags:[]);
  const matches=source=>DIRECT_VISUAL_TAGS[signal].some(word=>source.has(word));
  return matches(motifs)?100:matches(id)?75:matches(tags)?35:0;
}
export function sceneMatchesVisualSignal(scene,signal){
  return visualSourceScore(scene,signal)>0;
}
function relevance(scene,signals){
  return signals.reduce((sum,signal,index)=>
    sum+visualSourceScore(scene,signal)*(signals.length-index),0);
}
/**
 * @param {{presetId?:string|null,alternativePresetIds?:readonly string[],
 * presets?:readonly {id:string,theme:string,clips:readonly string[]}[],
 * scenes?:readonly any[],excludedMotifs?:readonly string[],goal?:string}} [options]
 */
export function executableSceneCandidates({presetId,alternativePresetIds=[],presets=[],scenes=[],excludedMotifs=[],goal=""}={}){
  const map=new Map(scenes.filter(scene=>isSafeMontageScene(scene,excludedMotifs)).map(scene=>[scene.id,scene]));
  const selected=presets.find(preset=>preset.id===presetId);
  if(!selected||!Array.isArray(selected.clips)||selected.clips.length!==4)return Object.freeze([]);
  const eligiblePresets=[selected,...alternativePresetIds.slice(0,3)
    .map(id=>presets.find(preset=>preset.id===id))
    .filter(preset=>preset&&preset.theme===selected.theme)];
  // Source-positive subjects can span category labels. For example, a film
  // beginning in a forest and moving to mountains needs both real assets even
  // when the approved preset's abstract goal is "life" or "confidence".
  // Keep the four curated sources; enrich only with a bounded, rights-verified
  // cross-theme pool matched to the first three requested visual subjects.
  const subjects=visualSignalsFromGoal(goal).slice(0,3);
  const targeted=subjects.flatMap(signal=>
    [...map.values()].filter(scene=>sceneMatchesVisualSignal(scene,signal))
      .sort((a,b)=>relevance(b,[signal])-relevance(a,[signal])||
        (Number(b.theme===selected.theme)-Number(a.theme===selected.theme)))
      .slice(0,2).map(scene=>scene.id));
  const ids=unique([...selected.clips,...targeted,
    ...eligiblePresets.slice(1).flatMap(preset=>preset.clips||[])])
    .filter(id=>map.has(id)).slice(0,16);
  return Object.freeze(ids);
}
/**
 * @param {any} value
 * @param {{candidateSceneIds?:readonly string[],durationSeconds?:number,
 * scenes?:readonly any[],excludedMotifs?:readonly string[],goal?:string}} [constraints]
 */
export function parseAiVideoCutSuggestion(value,{candidateSceneIds=[],durationSeconds,scenes=[],excludedMotifs=[],goal=""}={}){
  if(!exactKeys(value,["clipIds","stageSeconds"])||!Array.isArray(value.clipIds)||
    !Array.isArray(value.stageSeconds)||value.clipIds.length!==4||
    value.stageSeconds.length!==4||!VALID_LENGTHS.includes(durationSeconds)||
    value.stageSeconds.some(seconds=>!Number.isInteger(seconds)||seconds<2)||
    value.stageSeconds.reduce((a,b)=>a+b,0)!==durationSeconds)return null;
  const whitelist=new Set(candidateSceneIds);
  if(value.clipIds.some(id=>typeof id!=="string"||!whitelist.has(id)) ||
    !validateMontageClips(value.clipIds,scenes,excludedMotifs))return null;
  const sceneById=new Map(scenes.map(scene=>[scene.id,scene]));
  // A model may change cut timing, but not erase or reverse concrete visual
  // beats when source-backed shots for each beat have been offered.
  let lastRequestedIndex=-1;
  for(const signal of visualSignalsFromGoal(goal).slice(0,3)){
    const available=candidateSceneIds.some(id=>sceneMatchesVisualSignal(sceneById.get(id),signal));
    if(!available)continue;
    const index=value.clipIds.findIndex(id=>sceneMatchesVisualSignal(sceneById.get(id),signal));
    if(index<0||index<=lastRequestedIndex)return null;
    lastRequestedIndex=index;
  }
  return Object.freeze({clipIds:Object.freeze([...value.clipIds]),
    stageSeconds:Object.freeze([...value.stageSeconds])});
}
/**
 * @param {{goal?:string,locale?:string,fallbackTheme?:string,
 * presets?:readonly {id:string,theme:string,clips:readonly string[]}[],
 * scenes?:readonly any[],selectedPresetId?:string|null,
 * alternativePresetIds?:readonly string[],excludedMotifs?:readonly string[]|null,
 * draft?:any,renderOptions?:any,
 * aiSuggestion?:{clipIds:readonly string[],stageSeconds:readonly number[]}|null}} [input]
 */
export function compileExecutableVideoScenario({
  goal="",locale="en",fallbackTheme="energy",presets=[],scenes=[],
  selectedPresetId=null,alternativePresetIds=[],excludedMotifs=null,
  draft={},renderOptions={},aiSuggestion=null
}={}){
  const language=safeLocale(locale);
  if(typeof goal!=="string"||goal.trim().length<3||goal.length>800||
    !isRecord(draft)||!VALID_LENGTHS.includes(draft.duration)||
    !VALID_ASPECTS.includes(draft.aspect)||!VALID_MUSIC.includes(draft.music)||
    !["slow","dynamic"].includes(draft.mood)||typeof draft.phrases!=="boolean")
    throw Error("invalid_executable_video_input");
  const recommended=recommendAutoVideo({goal,locale:language,fallbackTheme,presets,scenes});
  const preset=presets.find(item=>item.id===selectedPresetId);
  if(!preset||!VALID_THEMES.includes(preset.theme)||!Array.isArray(preset.clips)||preset.clips.length!==4)
    throw Error("invalid_executable_video_preset");
  const exclusions=excludedMotifs===null?recommended.excludedMotifs:excludedMotifs;
  if(!Array.isArray(exclusions)||exclusions.some(id=>!["water","forest","dark"].includes(id)))
    throw Error("invalid_executable_video_exclusions");
  const candidateSceneIds=executableSceneCandidates({presetId:preset.id,
    alternativePresetIds,presets,scenes,excludedMotifs:exclusions,goal});
  if(candidateSceneIds.length<4)throw Error("insufficient_licensed_video_sources");
  const map=new Map(scenes.filter(scene=>isSafeMontageScene(scene,exclusions)).map(scene=>[scene.id,scene]));
  let ids;
  if(aiSuggestion!==null){
    const parsed=parseAiVideoCutSuggestion(aiSuggestion,{
      candidateSceneIds,durationSeconds:draft.duration,scenes,excludedMotifs:exclusions,goal,
    });
    if(!parsed)throw Error("untrusted_ai_film_suggestion");
    ids=[...parsed.clipIds];
  }else{
    const signals=visualSignalsFromGoal(goal);
    // Each supported, explicitly requested subject gets a real stage, in the
    // visitor's mention order. Remaining stages retain the curated narrative.
    const storyBeats=[];
    for(const signal of signals.slice(0,3)){
      const match=[...candidateSceneIds]
        .filter(id=>!storyBeats.includes(id)&&sceneMatchesVisualSignal(map.get(id),signal))
        .sort((a,b)=>visualSourceScore(map.get(b),signal)-visualSourceScore(map.get(a),signal))[0];
      if(match)storyBeats.push(match);
    }
    ids=unique([...storyBeats,...preset.clips,...candidateSceneIds]).slice(0,4);
  }
  if(!validateMontageClips(ids,scenes,exclusions))
    throw Error("unlicensed_or_excluded_video_scene");
  const subjects=visualSignalsFromGoal(goal).slice(0,3);
  const availableVisualSignals=subjects.filter(signal=>
    candidateSceneIds.some(id=>sceneMatchesVisualSignal(map.get(id),signal)));
  const unavailableVisualSignals=subjects.filter(signal=>
    !availableVisualSignals.includes(signal));
  const matchedVisualSignals=availableVisualSignals.filter(signal=>
    ids.some(id=>sceneMatchesVisualSignal(map.get(id),signal)));
  const timeline=aiSuggestion!==null?
    allocateAdaptiveFilmTimeline(draft.duration,ids,aiSuggestion.stageSeconds):
    allocateAdaptiveFilmTimeline(draft.duration,ids);
  const captions=draft.phrases?CAPTIONS[language][preset.theme].map(normalizeStageCaption):emptyCaptions();
  const audio=Object.freeze({kind:draft.music==="none"?"silent":"approved_preset",
    trackId:draft.music,volumePercent:Number.isInteger(renderOptions.volumePercent)&&
      renderOptions.volumePercent>=0&&renderOptions.volumePercent<=100?renderOptions.volumePercent:75,
    durationSeconds:draft.duration});
  const rendering=Object.freeze({engine:"existing_canvas_mediarecorder",
    source:"licensed_first_party_mp4",
    aspect:draft.aspect,quality:["hd","fullhd"].includes(renderOptions.quality)?renderOptions.quality:"hd",
    brightness:["soft","bright"].includes(renderOptions.brightness)?renderOptions.brightness:"soft",
    motion:draft.mood,captionMode:"stage_only",transition:"existing_renderer"});
  const shots=timeline.map((item,i)=>Object.freeze({
    number:i+1,role:ROLES[i],sceneId:item.sceneId,
    assetPath:map.get(item.sceneId).video,poster:map.get(item.sceneId).poster||null,
    startSeconds:item.startSeconds,durationSeconds:item.durationSeconds,
    captionText:captions[i],
  }));
  const edit=Object.freeze({clipIds:Object.freeze([...ids]),
    durationSecondsByStage:Object.freeze(shots.map(s=>s.durationSeconds)),
    captionTexts:Object.freeze([...captions]),
    excludedMotifs:Object.freeze([...exclusions])});
  return Object.freeze({version:EXECUTABLE_VIDEO_SCENARIO_VERSION,
    origin:aiSuggestion?"ai_suggestion_validated":"local_compiler",
    presetId:preset.id,theme:preset.theme,locale:language,
    durationSeconds:draft.duration,aspect:draft.aspect,
    mood:draft.mood,phrases:draft.phrases,
    shotCount:4,shots:Object.freeze(shots),
    audio,rendering,edit,
    candidateSceneIds,
    visualCoverage:Object.freeze({requested:Object.freeze([...subjects]),
      matched:Object.freeze([...matchedVisualSignals]),
      unavailable:Object.freeze([...unavailableVisualSignals])}),
    requiresNovelFootage:Boolean(recommended.requiresNewAiFootage||unavailableVisualSignals.length>0),
    noExternalClientData:true,paidRenderApproved:false,readyToExecute:true,
  });
}
